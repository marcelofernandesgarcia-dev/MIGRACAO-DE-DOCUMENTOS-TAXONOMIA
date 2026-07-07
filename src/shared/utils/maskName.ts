export type MaskNameParts = {
  ano: string
  processo: string
  tema: string
  tipo: string
}

function normalizeExtension(extension: string): string {
  return extension.startsWith('.') ? extension : `.${extension}`
}

/** RF10: monta o nome base (sem versao) AAAA_PROCESSO_TEMA_TIPO. Espera-se que processo/tema/tipo ja tenham sido sanitizados (RF12). */
export function buildBaseName(parts: MaskNameParts): string {
  return `${parts.ano}_${parts.processo}_${parts.tema}_${parts.tipo}`
}

/** RF10: monta o nome final AAAA_PROCESSO_TEMA_TIPO_VX.ext */
export function buildMaskedName(baseName: string, version: number, extension: string): string {
  return `${baseName}_V${version}${normalizeExtension(extension)}`
}
