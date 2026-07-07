import { basename } from 'node:path'
import { HISTORICAL_ARCHIVE_THRESHOLD_DAYS } from '../config/constants'
import { stripDiacritics } from '@shared/utils/stripDiacritics'
import { containsWholeWord } from '@shared/utils/wordMatch'
import type { SuggestionReason } from '@shared/types/domain'

const EXTENSION_CATEGORY_MAP: Record<string, string> = {
  '.xlsx': '05_FINANCEIRO_E_ORCAMENTO/PLANILHAS',
  '.xls': '05_FINANCEIRO_E_ORCAMENTO/PLANILHAS',
  '.csv': '05_FINANCEIRO_E_ORCAMENTO/PLANILHAS'
}

const KEYWORD_CATEGORY_MAP: Array<{ keyword: string; category: string }> = [
  { keyword: 'auditoria', category: '03_AUDITORIA_E_CONTROLE' }
]

function normalize(text: string): string {
  return stripDiacritics(text).toLowerCase()
}

export function computeAgeDays(mtime: Date, now: Date = new Date()): number {
  const diffMs = now.getTime() - mtime.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

export function suggestCategory(
  fileName: string,
  extension: string,
  ageDays: number
): { category: string; reason: SuggestionReason } {
  const normalizedName = normalize(basename(fileName))

  for (const { keyword, category } of KEYWORD_CATEGORY_MAP) {
    if (containsWholeWord(normalizedName, keyword)) {
      return { category, reason: 'PALAVRA_CHAVE' }
    }
  }

  const extensionCategory = EXTENSION_CATEGORY_MAP[extension.toLowerCase()]
  if (extensionCategory) {
    return { category: extensionCategory, reason: 'EXTENSAO' }
  }

  if (ageDays > HISTORICAL_ARCHIVE_THRESHOLD_DAYS) {
    return { category: '99_ARQUIVO_HISTORICO', reason: 'INATIVIDADE' }
  }

  return { category: '', reason: 'NENHUMA' }
}
