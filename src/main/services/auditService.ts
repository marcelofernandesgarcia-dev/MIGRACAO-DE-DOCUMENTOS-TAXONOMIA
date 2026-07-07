import { getDb } from '../db/connection'
import type { AuditLogEntry, AuditLogQuery } from '@shared/types/domain'

export function getAuditLog(query: AuditLogQuery): { entries: AuditLogEntry[]; total: number } {
  const db = getDb()
  const conditions: string[] = []
  const params: Record<string, unknown> = {}

  if (query.batchId) {
    conditions.push('batch_id = @batchId')
    params.batchId = query.batchId
  }
  if (query.from) {
    conditions.push('created_at >= @from')
    params.from = query.from
  }
  if (query.to) {
    conditions.push('created_at <= @to')
    params.to = query.to
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = query.limit ?? 200
  const offset = query.offset ?? 0

  const entries = db
    .prepare(
      `SELECT * FROM audit_log ${whereClause} ORDER BY created_at DESC, id DESC LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit, offset }) as AuditLogEntry[]

  const totalRow = db
    .prepare(`SELECT COUNT(*) as count FROM audit_log ${whereClause}`)
    .get(params) as { count: number }

  return { entries, total: totalRow.count }
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function exportAuditLogToCsv(query: AuditLogQuery): string {
  const { entries } = getAuditLog({ ...query, limit: 1_000_000, offset: 0 })
  const header = ['id', 'event_type', 'batch_id', 'file_id', 'os_user', 'created_at', 'detail_json']
  const rows = entries.map((entry) =>
    header.map((key) => escapeCsvField(String(entry[key as keyof AuditLogEntry] ?? ''))).join(',')
  )
  return [header.join(','), ...rows].join('\r\n')
}
