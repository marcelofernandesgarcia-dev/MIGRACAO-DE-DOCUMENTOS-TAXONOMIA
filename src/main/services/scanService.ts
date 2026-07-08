import { readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { ScanWorkerPool } from '../workers/pool'
import { computeAgeDays, suggestCategory } from './classificationService'
import { MAX_WINDOWS_PATH_LENGTH } from '../config/constants'
import type { FileScanResult } from '@shared/types/domain'
import type { RawFileMeta } from '../workers/scan.worker'

type ScanState = {
  scanId: string
  sourcePath: string
  status: 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO'
  results: FileScanResult[]
  total: number
  processed: number
  pool: ScanWorkerPool
  skippedDirs: string[]
}

const scans = new Map<string, ScanState>()

// Pastas geradas por ferramentas de desenvolvimento (dependencias, controle de versao) nunca sao
// documentos de trabalho e podem conter centenas de milhares de arquivos — sao sempre ignoradas.
const IGNORED_DIRECTORY_NAMES = new Set(['node_modules', '.git'])

function listFilesRecursively(rootPath: string): { files: string[]; skippedDirs: string[] } {
  const files: string[] = []
  const skippedDirs: string[] = []
  const stack: string[] = [rootPath]
  while (stack.length > 0) {
    const currentDir = stack.pop() as string
    let entries: string[]
    try {
      entries = readdirSync(currentDir)
    } catch {
      continue
    }
    for (const entry of entries) {
      if (IGNORED_DIRECTORY_NAMES.has(entry)) {
        skippedDirs.push(join(currentDir, entry))
        continue
      }
      const entryPath = join(currentDir, entry)
      let stats
      try {
        stats = statSync(entryPath)
      } catch {
        continue
      }
      if (stats.isDirectory()) {
        stack.push(entryPath)
      } else if (stats.isFile()) {
        files.push(entryPath)
      }
    }
  }
  return { files, skippedDirs }
}

function projectedDestPathLength(fileName: string, category: string): number {
  return category.length + fileName.length + 1
}

export function startScan(
  sourcePath: string,
  onItem: (item: FileScanResult) => void,
  onProgress: (processed: number, total: number) => void,
  onDone: (skippedDirs: string[]) => void
): string {
  const scanId = randomUUID()
  const { files: filePaths, skippedDirs } = listFilesRecursively(sourcePath)
  const pool = new ScanWorkerPool()

  const state: ScanState = {
    scanId,
    sourcePath,
    status: 'EM_ANDAMENTO',
    results: [],
    total: filePaths.length,
    processed: 0,
    pool,
    skippedDirs
  }
  scans.set(scanId, state)

  pool
    .scanFiles(
      filePaths,
      (raw: RawFileMeta) => {
        const ageDays = computeAgeDays(new Date(raw.mtime))
        const { category, reason } = suggestCategory(raw.absolutePath, raw.extension, ageDays)
        const fileName = raw.absolutePath.split(/[\\/]/).pop() ?? raw.absolutePath
        const item: FileScanResult = {
          fileId: randomUUID(),
          absolutePath: raw.absolutePath,
          sizeBytes: raw.sizeBytes,
          mtime: raw.mtime,
          extension: raw.extension,
          suggestedCategory: category,
          suggestionReason: reason,
          ageDays,
          pathTooLong: projectedDestPathLength(fileName, category) > MAX_WINDOWS_PATH_LENGTH
        }
        state.results.push(item)
        state.processed += 1
        onItem(item)
        onProgress(state.processed, state.total)
      },
      (absolutePath, error) => {
        state.processed += 1
        const item: FileScanResult = {
          fileId: randomUUID(),
          absolutePath,
          sizeBytes: 0,
          mtime: '',
          extension: '',
          suggestedCategory: '',
          suggestionReason: 'NENHUMA',
          ageDays: 0,
          pathTooLong: false,
          error
        }
        state.results.push(item)
        onItem(item)
        onProgress(state.processed, state.total)
      }
    )
    .then(() => {
      state.status = 'CONCLUIDO'
      onDone(state.skippedDirs)
    })

  return scanId
}

export function cancelScan(scanId: string): void {
  const state = scans.get(scanId)
  if (!state) return
  state.status = 'CANCELADO'
  state.pool.cancel()
}

export function getScanResults(scanId: string): FileScanResult[] {
  return scans.get(scanId)?.results ?? []
}

export function overrideClassification(scanId: string, fileId: string, categoryPath: string): void {
  const state = scans.get(scanId)
  if (!state) return
  const item = state.results.find((r) => r.fileId === fileId)
  if (item) {
    item.suggestedCategory = categoryPath
  }
}

export function checkCollisions(destPaths: string[]): { destPath: string; existingFile: boolean }[] {
  return destPaths.map((destPath) => ({ destPath, existingFile: existsSync(destPath) }))
}
