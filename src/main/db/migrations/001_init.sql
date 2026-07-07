PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  parent_code TEXT,
  label TEXT NOT NULL,
  is_special INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  source_path TEXT NOT NULL,
  root_dest_path TEXT NOT NULL,
  batch_type TEXT NOT NULL CHECK (batch_type IN ('MIGRACAO','ARQUIVO_HISTORICO')),
  status TEXT NOT NULL CHECK (status IN
    ('RASCUNHO','AUTORIZADO','EM_EXECUCAO','CONCLUIDO',
     'CONCLUIDO_COM_ERROS','ROLLBACK_EXECUTADO','CANCELADO')) DEFAULT 'RASCUNHO',
  authorized_by_os_user TEXT,
  authorized_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  started_at TEXT,
  finished_at TEXT,
  total_files INTEGER NOT NULL DEFAULT 0,
  total_bytes INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES batches(id),
  original_name TEXT NOT NULL,
  new_name TEXT NOT NULL,
  source_absolute_path TEXT NOT NULL,
  dest_absolute_path TEXT NOT NULL,
  -- dest_category_code guarda o caminho completo de categoria (categoria/subpasta/ano quando
  -- aplicavel, ex: '99_ARQUIVO_HISTORICO/2019') e por isso NAO referencia categories(code)
  -- diretamente (essa tabela so lista os codigos-base das 8 categorias + especial).
  dest_category_code TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  source_mtime TEXT NOT NULL,
  hash_sha256 TEXT,
  hash_verified_at TEXT,
  status TEXT NOT NULL CHECK (status IN
    ('PENDENTE','BACKUP_OK','MIGRADO','ERRO','REVERTIDO')) DEFAULT 'PENDENTE',
  error_message TEXT,
  backup_path TEXT,
  executed_by_os_user TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  migrated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_files_batch ON files(batch_id);
CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  batch_id TEXT REFERENCES batches(id),
  file_id TEXT REFERENCES files(id),
  detail_json TEXT NOT NULL,
  os_user TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_batch ON audit_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_log(event_type);
