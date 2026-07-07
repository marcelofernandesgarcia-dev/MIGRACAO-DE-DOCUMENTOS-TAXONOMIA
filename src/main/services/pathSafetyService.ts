import { MAX_WINDOWS_PATH_LENGTH } from '../config/constants'

export function isPathTooLong(absolutePath: string): boolean {
  return absolutePath.length > MAX_WINDOWS_PATH_LENGTH
}

export function findFilesWithLongPaths(
  files: Array<{ fileId: string; destAbsolutePath: string }>
): string[] {
  return files.filter((f) => isPathTooLong(f.destAbsolutePath)).map((f) => f.fileId)
}
