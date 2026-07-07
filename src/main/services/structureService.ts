import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import os from 'node:os'
import { getDb } from '../db/connection'
import { insertAuditLog } from '../db/repositories/auditLogRepository'
import { CATEGORY_TAXONOMY } from '@shared/config/categoryTaxonomy'
import type { DirCreationResult, StructureValidationResult } from '@shared/types/domain'

function listAllTargetPaths(rootPath: string): string[] {
  const paths: string[] = []
  for (const category of CATEGORY_TAXONOMY) {
    const categoryPath = join(rootPath, category.code)
    paths.push(categoryPath)
    for (const subfolder of category.subfolders) {
      paths.push(join(categoryPath, subfolder))
    }
  }
  return paths
}

export function validateStructure(rootPath: string): StructureValidationResult {
  const allPaths = listAllTargetPaths(rootPath)
  const existing: string[] = []
  const missing: string[] = []
  for (const path of allPaths) {
    if (existsSync(path)) {
      existing.push(path)
    } else {
      missing.push(path)
    }
  }
  return { existing, missing }
}

export function createStructure(rootPath: string): DirCreationResult[] {
  const db = getDb()
  const osUser = os.userInfo().username
  const allPaths = listAllTargetPaths(rootPath)
  const results: DirCreationResult[] = []

  for (const path of allPaths) {
    try {
      if (existsSync(path)) {
        results.push({ path, status: 'SUCESSO', message: 'Já existente' })
      } else {
        mkdirSync(path, { recursive: true })
        results.push({ path, status: 'SUCESSO' })
      }
      insertAuditLog(db, {
        eventType: 'ESTRUTURA_CRIADA',
        detail: { path },
        osUser
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      results.push({ path, status: 'ERRO', message })
      insertAuditLog(db, {
        eventType: 'ESTRUTURA_ERRO',
        detail: { path, message },
        osUser
      })
    }
  }

  return results
}
