import { stripDiacritics } from './stripDiacritics'

const INVALID_FILENAME_CHARS_REGEX = /[<>:"/\\|?*]/g
const WHITESPACE_REGEX = /\s+/g

/**
 * RF12: maiusculas, sem acentos, espacos -> underscore, sem caracteres invalidos de nome de
 * arquivo Windows. Caracteres invalidos viram hifen (nao sao apenas removidos) para preservar
 * a leitura de identificadores como numeros de processo ("23073.000123/2026-11").
 */
export function sanitizeName(text: string): string {
  return stripDiacritics(text)
    .replace(INVALID_FILENAME_CHARS_REGEX, '-')
    .trim()
    .replace(WHITESPACE_REGEX, '_')
    .toUpperCase()
}
