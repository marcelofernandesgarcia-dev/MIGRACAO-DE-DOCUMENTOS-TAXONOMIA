import type Database from 'better-sqlite3'

export type BatchStatus =
  | 'RASCUNHO'
  | 'AUTORIZADO'
  | 'EM_EXECUCAO'
  | 'CONCLUIDO'
  | 'CONCLUIDO_COM_ERROS'
  | 'ROLLBACK_EXECUTADO'
  | 'CANCELADO'

export type BatchType = 'MIGRACAO' | 'ARQUIVO_HISTORICO'

export type BatchRecord = {
  id: string
  source_path: string
  root_dest_path: string
  batch_type: BatchType
  status: BatchStatus
  authorized_by_os_user: string | null
  authorized_at: string | null
  created_at: string
  started_at: string | null
  finished_at: string | null
  total_files: number
  total_bytes: number
}

export function createBatch(
  db: Database.Database,
  params: {
    id: string
    sourcePath: string
    rootDestPath: string
    batchType: BatchType
    totalFiles: number
    totalBytes: number
  }
): void {
  db.prepare(
    `INSERT INTO batches (id, source_path, root_dest_path, batch_type, status, total_files, total_bytes)
     VALUES (@id, @sourcePath, @rootDestPath, @batchType, 'RASCUNHO', @totalFiles, @totalBytes)`
  ).run(params)
}

export function getBatch(db: Database.Database, batchId: string): BatchRecord | undefined {
  return db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId) as BatchRecord | undefined
}

export function authorizeBatch(db: Database.Database, batchId: string, osUser: string): void {
  db.prepare(
    `UPDATE batches
     SET status = 'AUTORIZADO', authorized_by_os_user = @osUser,
         authorized_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = @batchId`
  ).run({ batchId, osUser })
}

export function markBatchStarted(db: Database.Database, batchId: string): void {
  db.prepare(
    `UPDATE batches SET status = 'EM_EXECUCAO', started_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = @batchId`
  ).run({ batchId })
}

export function markBatchFinished(
  db: Database.Database,
  batchId: string,
  status: Extract<BatchStatus, 'CONCLUIDO' | 'CONCLUIDO_COM_ERROS' | 'CANCELADO'>
): void {
  db.prepare(
    `UPDATE batches SET status = @status, finished_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = @batchId`
  ).run({ batchId, status })
}

export function markBatchRolledBack(db: Database.Database, batchId: string): void {
  db.prepare(`UPDATE batches SET status = 'ROLLBACK_EXECUTADO' WHERE id = @batchId`).run({
    batchId
  })
}
