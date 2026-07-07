import type Database from 'better-sqlite3'

export type AuditLogEntry = {
  eventType: string
  batchId?: string | null
  fileId?: string | null
  detail: unknown
  osUser: string
}

export function insertAuditLog(db: Database.Database, entry: AuditLogEntry): void {
  db.prepare(
    `INSERT INTO audit_log (event_type, batch_id, file_id, detail_json, os_user)
     VALUES (@eventType, @batchId, @fileId, @detailJson, @osUser)`
  ).run({
    eventType: entry.eventType,
    batchId: entry.batchId ?? null,
    fileId: entry.fileId ?? null,
    detailJson: JSON.stringify(entry.detail ?? {}),
    osUser: entry.osUser
  })
}
