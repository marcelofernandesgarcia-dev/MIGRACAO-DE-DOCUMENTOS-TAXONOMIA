import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { getDb } from '../db/connection'
import { getBatch } from '../db/repositories/batchesRepository'
import { getFilesByBatch } from '../db/repositories/filesRepository'
import { isHistoricalCategory, buildHistoryYearFolder } from '@shared/utils/historyYearFolder'

export function proposeYearFolders(
  items: Array<{ fileId: string; mtime: string }>
): Array<{ fileId: string; yearFolder: string }> {
  return items.map((item) => ({
    fileId: item.fileId,
    yearFolder: buildHistoryYearFolder(item.mtime)
  }))
}

/** RF24: gera um indice em texto dos arquivos migrados para o arquivo historico neste lote. */
export function generateHistoryIndex(batchId: string): { indexFilePath: string } | null {
  const db = getDb()
  const batch = getBatch(db, batchId)
  if (!batch) throw new Error(`Lote nao encontrado: ${batchId}`)

  const files = getFilesByBatch(db, batchId).filter(
    (f) => f.status === 'MIGRADO' && isHistoricalCategory(f.dest_category_code.split('/')[0])
  )
  if (files.length === 0) return null

  const historicalRoot = join(batch.root_dest_path, '99_ARQUIVO_HISTORICO')
  mkdirSync(historicalRoot, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const indexFilePath = join(historicalRoot, `_indice_${timestamp}.txt`)

  const lines = [
    `Inventario de arquivamento historico - lote ${batchId}`,
    `Gerado em: ${new Date().toISOString()}`,
    `Total de arquivos: ${files.length}`,
    '',
    ...files.map((f) => `${f.source_absolute_path}  ->  ${f.dest_absolute_path}`)
  ]

  writeFileSync(indexFilePath, lines.join('\r\n'), 'utf-8')
  return { indexFilePath }
}
