export type DirCreationStatus = 'SUCESSO' | 'ERRO'

export type DirCreationResult = {
  path: string
  status: DirCreationStatus
  message?: string
}

export type StructureValidationResult = {
  existing: string[]
  missing: string[]
}

export type SuggestionReason = 'EXTENSAO' | 'PALAVRA_CHAVE' | 'INATIVIDADE' | 'NENHUMA'

export type FileScanResult = {
  fileId: string
  absolutePath: string
  sizeBytes: number
  mtime: string
  extension: string
  sha256?: string
  suggestedCategory: string
  suggestionReason: SuggestionReason
  ageDays: number
  pathTooLong: boolean
  error?: string
}

export type ScanProgress = {
  scanId: string
  processed: number
  total: number
}

export type CollisionCheckResult = {
  destPath: string
  existingFile: boolean
}

export type ResolveVersionRequest = {
  fileId: string
  destDir: string
  baseName: string
  extension: string
}

export type ResolveVersionResult = {
  fileId: string
  version: number
  finalName: string
}

export type BatchSelectionItem = {
  fileId: string
  originalName: string
  newName: string
  sourceAbsolutePath: string
  destCategoryCode: string
  sizeBytes: number
  sourceMtime: string
  hashSha256: string | null
}

export type PrecheckResult = {
  ok: boolean
  freeSpaceBytes: number
  requiredBytes: number
  blockedFiles: string[]
}

export type BatchFinalStatus = 'CONCLUIDO' | 'CONCLUIDO_COM_ERROS' | 'CANCELADO'

export type BatchReport = {
  totalFiles: number
  migratedCount: number
  errorCount: number
  totalBytesMigrated: number
  errors: Array<{ fileId: string; name: string; message: string | null }>
}

export type AuditLogEntry = {
  id: number
  event_type: string
  batch_id: string | null
  file_id: string | null
  detail_json: string
  os_user: string
  created_at: string
}

export type AuditLogQuery = {
  batchId?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}
