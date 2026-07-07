import type Database from 'better-sqlite3'

export type FileStatus = 'PENDENTE' | 'BACKUP_OK' | 'MIGRADO' | 'ERRO' | 'REVERTIDO'

export type FileRecord = {
  id: string
  batch_id: string
  original_name: string
  new_name: string
  source_absolute_path: string
  dest_absolute_path: string
  dest_category_code: string
  size_bytes: number
  source_mtime: string
  hash_sha256: string | null
  hash_verified_at: string | null
  status: FileStatus
  error_message: string | null
  backup_path: string | null
  executed_by_os_user: string | null
  created_at: string
  migrated_at: string | null
}

export type NewFileInput = {
  id: string
  batchId: string
  originalName: string
  newName: string
  sourceAbsolutePath: string
  destAbsolutePath: string
  destCategoryCode: string
  sizeBytes: number
  sourceMtime: string
  hashSha256: string | null
}

export function insertFiles(db: Database.Database, files: NewFileInput[]): void {
  const insert = db.prepare(
    `INSERT INTO files
      (id, batch_id, original_name, new_name, source_absolute_path, dest_absolute_path,
       dest_category_code, size_bytes, source_mtime, hash_sha256, status)
     VALUES
      (@id, @batchId, @originalName, @newName, @sourceAbsolutePath, @destAbsolutePath,
       @destCategoryCode, @sizeBytes, @sourceMtime, @hashSha256, 'PENDENTE')`
  )
  const insertAll = db.transaction((items: NewFileInput[]) => {
    for (const item of items) insert.run(item)
  })
  insertAll(files)
}

export function getFilesByBatch(db: Database.Database, batchId: string): FileRecord[] {
  return db.prepare('SELECT * FROM files WHERE batch_id = ?').all(batchId) as FileRecord[]
}

export function getFilesByStatus(
  db: Database.Database,
  batchId: string,
  status: FileStatus
): FileRecord[] {
  return db
    .prepare('SELECT * FROM files WHERE batch_id = ? AND status = ?')
    .all(batchId, status) as FileRecord[]
}

export function markFileBackupOk(db: Database.Database, fileId: string, backupPath: string): void {
  db.prepare(`UPDATE files SET status = 'BACKUP_OK', backup_path = @backupPath WHERE id = @fileId`).run(
    { fileId, backupPath }
  )
}

export function markFileMigrated(
  db: Database.Database,
  fileId: string,
  osUser: string
): void {
  db.prepare(
    `UPDATE files
     SET status = 'MIGRADO', executed_by_os_user = @osUser,
         hash_verified_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
         migrated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = @fileId`
  ).run({ fileId, osUser })
}

export function markFileError(db: Database.Database, fileId: string, message: string): void {
  db.prepare(`UPDATE files SET status = 'ERRO', error_message = @message WHERE id = @fileId`).run({
    fileId,
    message
  })
}

export function markFileReverted(db: Database.Database, fileId: string): void {
  db.prepare(`UPDATE files SET status = 'REVERTIDO', backup_path = NULL WHERE id = @fileId`).run({
    fileId
  })
}

export function clearFileBackupPath(db: Database.Database, fileId: string): void {
  db.prepare(`UPDATE files SET backup_path = NULL WHERE id = @fileId`).run({ fileId })
}
