const COMBINING_DIACRITICS_REGEX = /[̀-ͯ]/g

export function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(COMBINING_DIACRITICS_REGEX, '')
}
