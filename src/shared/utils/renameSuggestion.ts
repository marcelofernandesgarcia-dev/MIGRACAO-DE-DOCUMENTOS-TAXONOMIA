import { stripDiacritics } from './stripDiacritics'
import { sanitizeName } from './sanitizeName'
import { containsWholeWord } from './wordMatch'

const TIPO_EXTENSION_MAP: Record<string, string> = {
  '.xlsx': 'PLANILHA',
  '.xls': 'PLANILHA',
  '.csv': 'PLANILHA',
  '.pdf': 'DOCUMENTO',
  '.docx': 'DOCUMENTO',
  '.doc': 'DOCUMENTO',
  '.pptx': 'APRESENTACAO',
  '.ppt': 'APRESENTACAO',
  '.jpg': 'IMAGEM',
  '.jpeg': 'IMAGEM',
  '.png': 'IMAGEM',
  '.mp4': 'VIDEO',
  '.mov': 'VIDEO'
}

const TIPO_KEYWORD_MAP: Array<{ keyword: string; tipo: string }> = [
  { keyword: 'relatorio', tipo: 'RELATORIO' },
  { keyword: 'oficio', tipo: 'OFICIO' },
  { keyword: 'memorando', tipo: 'MEMORANDO' },
  { keyword: 'memo', tipo: 'MEMORANDO' },
  { keyword: 'ata', tipo: 'ATA' },
  { keyword: 'portaria', tipo: 'PORTARIA' },
  { keyword: 'contrato', tipo: 'CONTRATO' },
  { keyword: 'convenio', tipo: 'CONVENIO' },
  { keyword: 'parecer', tipo: 'PARECER' },
  { keyword: 'auditoria', tipo: 'AUDITORIA' }
]

// Formatos comuns de numero de processo (ex: SEI 23073.000123/2026-11, ou variacoes com traco/barra)
const PROCESSO_REGEX = /\d{4,5}\.?\d{6}\/?\d{4}-?\d{1,2}|\d{4,}[-/]\d{2,4}/

function normalize(text: string): string {
  return stripDiacritics(text).toLowerCase()
}

/** Sugere o TIPO a partir de palavras-chave no nome do arquivo, com fallback pela extensao. */
export function suggestTipo(fileName: string, extension: string): string {
  const normalized = normalize(fileName)
  for (const { keyword, tipo } of TIPO_KEYWORD_MAP) {
    if (containsWholeWord(normalized, keyword)) return tipo
  }
  return TIPO_EXTENSION_MAP[extension.toLowerCase()] ?? ''
}

/** Sugere o TEMA a partir do nome da pasta imediata que contem o arquivo. */
export function suggestTema(absolutePath: string): string {
  const parts = absolutePath.split(/[\\/]/).filter(Boolean)
  const parentFolder = parts.length >= 2 ? parts[parts.length - 2] : ''
  return parentFolder ? sanitizeName(parentFolder) : ''
}

/** Tenta extrair um numero de processo do nome do arquivo; retorna vazio se nao encontrar. */
export function suggestProcesso(fileName: string): string {
  const match = fileName.match(PROCESSO_REGEX)
  return match ? match[0] : ''
}

export function suggestAno(mtimeIso: string): string {
  const year = new Date(mtimeIso).getFullYear()
  return Number.isFinite(year) ? String(year) : String(new Date().getFullYear())
}
