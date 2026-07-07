const HISTORICAL_CATEGORY_CODE = '99_ARQUIVO_HISTORICO'

/** RF22: subpasta anual dentro de 99_ARQUIVO_HISTORICO, baseada no ano do mtime original do arquivo. */
export function buildHistoryYearFolder(mtimeIso: string): string {
  const year = new Date(mtimeIso).getFullYear()
  return `${HISTORICAL_CATEGORY_CODE}/${year}`
}

export function isHistoricalCategory(categoryCode: string): boolean {
  return categoryCode === HISTORICAL_CATEGORY_CODE
}
