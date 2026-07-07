import { app } from 'electron'
import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { CATEGORY_TAXONOMY } from '@shared/config/categoryTaxonomy'
import initSql from './migrations/001_init.sql?raw'
import appendOnlyTriggersSql from './migrations/002_append_only_triggers.sql?raw'

let db: Database.Database | null = null

function runMigrations(database: Database.Database): void {
  database.exec(initSql)
  database.exec(appendOnlyTriggersSql)
}

function seedCategories(database: Database.Database): void {
  const insert = database.prepare(
    `INSERT OR IGNORE INTO categories (code, parent_code, label, is_special, sort_order)
     VALUES (@code, NULL, @label, @isSpecial, @sortOrder)`
  )
  const seedAll = database.transaction(() => {
    CATEGORY_TAXONOMY.forEach((category, index) => {
      insert.run({
        code: category.code,
        label: category.label,
        isSpecial: category.isSpecial ? 1 : 0,
        sortOrder: index
      })
    })
  })
  seedAll()
}

export function getDatabasePath(): string {
  const userDataDir = app.getPath('userData')
  mkdirSync(userDataDir, { recursive: true })
  return join(userDataDir, 'migrador_documentos.db')
}

export function getDb(): Database.Database {
  if (db) return db

  const dbPath = getDatabasePath()
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations(db)
  seedCategories(db)

  return db
}

export function closeDb(): void {
  db?.close()
  db = null
}
