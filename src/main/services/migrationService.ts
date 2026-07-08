import { randomUUID } from 'node:crypto'
import { join, extname, dirname } from 'node:path'
import { existsSync, mkdirSync, unlinkSync, renameSync, copyFileSync } from 'node:fs'
import os from 'node:os'
import { getDb } from '../db/connection'
import {
  createBatch,
  getBatch,
  authorizeBatch as authorizeBatchRow,
  markBatchStarted,
  markBatchFinished,
  markBatchRolledBack
} from '../db/repositories/batchesRepository'
import {
  insertFiles,
  getFilesByBatch,
  getFilesByStatus,
  markFileMigrated,
  markFileError,
  markFileReverted,
  clearFileBackupPath,
  type NewFileInput
} from '../db/repositories/filesRepository'
import { insertAuditLog } from '../db/repositories/auditLogRepository'
import { checkDiskSpaceFor } from './diskSpaceService'
import { findFilesWithLongPaths } from './pathSafetyService'
import { CopyWorkerPool } from '../workers/copyPool'
import { MIGRATION_CHUNK_SIZE } from '../config/constants'
import type { CopyTask } from '../workers/copy.worker'
import type { BatchSelectionItem, BatchReport } from '@shared/types/domain'

function backupDirFor(rootDestPath: string, batchId: string): string {
  return join(rootDestPath, '.migrador_backup_tmp', batchId)
}

export function createMigrationBatch(
  sourcePath: string,
  rootDestPath: string,
  items: BatchSelectionItem[]
): string {
  const db = getDb()
  const batchId = randomUUID()

  const files: NewFileInput[] = items.map((item) => ({
    id: item.fileId,
    batchId,
    originalName: item.originalName,
    newName: item.newName,
    sourceAbsolutePath: item.sourceAbsolutePath,
    destAbsolutePath: join(rootDestPath, item.destCategoryCode, item.newName),
    destCategoryCode: item.destCategoryCode,
    sizeBytes: item.sizeBytes,
    sourceMtime: item.sourceMtime,
    hashSha256: item.hashSha256
  }))

  const totalBytes = items.reduce((sum, item) => sum + item.sizeBytes, 0)

  createBatch(db, {
    id: batchId,
    sourcePath,
    rootDestPath,
    batchType: 'MIGRACAO',
    totalFiles: items.length,
    totalBytes
  })
  insertFiles(db, files)

  return batchId
}

export async function precheckBatch(batchId: string): Promise<{
  ok: boolean
  freeSpaceBytes: number
  requiredBytes: number
  blockedFiles: string[]
}> {
  const db = getDb()
  const batch = getBatch(db, batchId)
  if (!batch) throw new Error(`Lote nao encontrado: ${batchId}`)

  const files = getFilesByBatch(db, batchId)
  const totalBytes = files.reduce((sum, f) => sum + f.size_bytes, 0)

  const diskCheck = await checkDiskSpaceFor(batch.root_dest_path, totalBytes)
  const blockedFiles = findFilesWithLongPaths(
    files.map((f) => ({ fileId: f.id, destAbsolutePath: f.dest_absolute_path }))
  )

  return {
    ok: diskCheck.ok && blockedFiles.length === 0,
    freeSpaceBytes: diskCheck.freeSpaceBytes,
    requiredBytes: diskCheck.requiredBytes,
    blockedFiles
  }
}

export function authorizeBatch(batchId: string): { osUser: string } {
  const db = getDb()
  const osUser = os.userInfo().username
  authorizeBatchRow(db, batchId, osUser)
  insertAuditLog(db, { eventType: 'AUTORIZACAO', batchId, detail: {}, osUser })
  return { osUser }
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

const activePools = new Map<string, CopyWorkerPool>()
const cancelledBatches = new Set<string>()

export function cancelMigration(batchId: string): void {
  cancelledBatches.add(batchId)
  activePools.get(batchId)?.cancel()
}

export async function runMigration(
  batchId: string,
  onProgress: (processedCount: number, totalCount: number, currentFile: string) => void,
  onItemResult: (fileId: string, status: 'MIGRADO' | 'ERRO', error?: string) => void,
  onDone: (finalStatus: 'CONCLUIDO' | 'CONCLUIDO_COM_ERROS' | 'CANCELADO') => void
): Promise<void> {
  const db = getDb()
  const batch = getBatch(db, batchId)
  if (!batch) throw new Error(`Lote nao encontrado: ${batchId}`)

  markBatchStarted(db, batchId)
  const osUser = os.userInfo().username
  const files = getFilesByBatch(db, batchId).filter((f) => f.status === 'PENDENTE')
  const backupDir = backupDirFor(batch.root_dest_path, batchId)
  mkdirSync(backupDir, { recursive: true })

  const fileNameById = new Map(files.map((f) => [f.id, f.new_name]))
  const chunks = chunk(files, MIGRATION_CHUNK_SIZE)
  let processedCount = 0
  const totalCount = files.length
  let hadErrors = false

  const pool = new CopyWorkerPool()
  activePools.set(batchId, pool)

  for (const fileChunk of chunks) {
    if (cancelledBatches.has(batchId)) break

    const tasks: CopyTask[] = fileChunk.map((f) => ({
      fileId: f.id,
      sourcePath: f.source_absolute_path,
      destPath: f.dest_absolute_path,
      backupPath: join(backupDir, `${f.id}${extname(f.source_absolute_path)}`)
    }))

    await pool.migrateFiles(tasks, (result) => {
      processedCount += 1
      if (result.status === 'MIGRADO') {
        // o worker sempre inclui hashSha256 e backupPath quando o status e MIGRADO
        // (garantido em copy.worker.ts) - backupPath precisa ser persistido para que
        // cleanupBatchBackups() consiga localizar e apagar a copia de seguranca depois
        markFileMigrated(db, result.fileId, osUser, result.hashSha256 ?? '', result.backupPath ?? '')
        insertAuditLog(db, {
          eventType: 'ARQUIVO_MIGRADO',
          batchId,
          fileId: result.fileId,
          detail: { backupPath: result.backupPath },
          osUser
        })
      } else {
        hadErrors = true
        markFileError(db, result.fileId, result.errorMessage ?? 'Erro desconhecido')
        insertAuditLog(db, {
          eventType: 'ARQUIVO_ERRO',
          batchId,
          fileId: result.fileId,
          detail: { message: result.errorMessage },
          osUser
        })
      }
      onProgress(processedCount, totalCount, fileNameById.get(result.fileId) ?? '')
      onItemResult(result.fileId, result.status, result.errorMessage)
    })
  }

  activePools.delete(batchId)
  const wasCancelled = cancelledBatches.delete(batchId)

  const finalStatus = wasCancelled ? 'CANCELADO' : hadErrors ? 'CONCLUIDO_COM_ERROS' : 'CONCLUIDO'
  markBatchFinished(db, batchId, finalStatus)

  if (finalStatus === 'CONCLUIDO') {
    cleanupBatchBackups(batchId)
  }

  onDone(finalStatus)
}

function cleanupBatchBackups(batchId: string): void {
  const db = getDb()
  const migratedFiles = getFilesByStatus(db, batchId, 'MIGRADO')
  for (const file of migratedFiles) {
    if (file.backup_path) {
      try {
        unlinkSync(file.backup_path)
      } catch {
        // melhor esforco: backup ja pode ter sido removido
      }
      clearFileBackupPath(db, file.id)
    }
  }
}

export function rollbackBatch(batchId: string): { restoredCount: number; errors: string[] } {
  const db = getDb()
  const osUser = os.userInfo().username
  const migratedFiles = getFilesByStatus(db, batchId, 'MIGRADO')
  const errors: string[] = []
  let restoredCount = 0

  for (const file of migratedFiles) {
    try {
      mkdirSync(dirname(file.source_absolute_path), { recursive: true })
      try {
        renameSync(file.dest_absolute_path, file.source_absolute_path)
      } catch (moveError) {
        if ((moveError as NodeJS.ErrnoException).code === 'EXDEV') {
          copyFileSync(file.dest_absolute_path, file.source_absolute_path)
          unlinkSync(file.dest_absolute_path)
        } else {
          throw moveError
        }
      }
      if (file.backup_path && existsSync(file.backup_path)) {
        try {
          unlinkSync(file.backup_path)
        } catch {
          // melhor esforco
        }
      }
      markFileReverted(db, file.id)
      insertAuditLog(db, {
        eventType: 'ROLLBACK',
        batchId,
        fileId: file.id,
        detail: {},
        osUser
      })
      restoredCount += 1
    } catch (error) {
      errors.push(
        `${file.new_name}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  markBatchRolledBack(db, batchId)
  return { restoredCount, errors }
}

export function getBatchReport(batchId: string): BatchReport {
  const db = getDb()
  const files = getFilesByBatch(db, batchId)
  const migrated = files.filter((f) => f.status === 'MIGRADO')
  const errors = files.filter((f) => f.status === 'ERRO')

  return {
    totalFiles: files.length,
    migratedCount: migrated.length,
    errorCount: errors.length,
    totalBytesMigrated: migrated.reduce((sum, f) => sum + f.size_bytes, 0),
    errors: errors.map((f) => ({ fileId: f.id, name: f.new_name, message: f.error_message }))
  }
}
