/**
 * Verifica se `keyword` aparece como palavra inteira (nao apenas substring) em `normalizedText`.
 * Evita falsos positivos como "ata" dentro de "formatacao".
 */
export function containsWholeWord(normalizedText: string, keyword: string): boolean {
  const tokens = normalizedText.split(/[^a-z0-9]+/)
  return tokens.includes(keyword)
}
