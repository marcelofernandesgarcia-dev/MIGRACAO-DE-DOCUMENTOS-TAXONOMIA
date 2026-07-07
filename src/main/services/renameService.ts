import { readdirSync, existsSync } from 'node:fs'
import { buildMaskedName } from '@shared/utils/maskName'
import type { ResolveVersionRequest, ResolveVersionResult } from '@shared/types/domain'

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function safeReaddir(dirPath: string): string[] {
  try {
    return existsSync(dirPath) ? readdirSync(dirPath) : []
  } catch {
    return []
  }
}

export function resolveVersion(destDir: string, baseName: string, extension: string): number {
  const ext = extension.startsWith('.') ? extension : `.${extension}`
  const entries = safeReaddir(destDir)

  const pattern = new RegExp(`^${escapeRegExp(baseName)}_V(\\d+)${escapeRegExp(ext)}$`, 'i')
  let maxVersion = 0
  for (const entry of entries) {
    const match = entry.match(pattern)
    if (match) {
      const versionNumber = parseInt(match[1], 10)
      if (versionNumber > maxVersion) maxVersion = versionNumber
    }
  }
  return maxVersion + 1
}

export function resolveVersionsBatch(requests: ResolveVersionRequest[]): ResolveVersionResult[] {
  // Se duas entradas do mesmo lote resolverem para o mesmo destDir+baseName+extensao,
  // a segunda precisa receber a versao seguinte (nao a mesma), mesmo antes de qualquer
  // escrita em disco. reservedCounts rastreia quantas vezes essa chave ja apareceu no lote.
  const reservedCounts = new Map<string, number>()

  return requests.map((request) => {
    const key = `${request.destDir}|${request.baseName}|${request.extension}`
    const alreadyReserved = reservedCounts.get(key) ?? 0
    const diskVersion = resolveVersion(request.destDir, request.baseName, request.extension)
    const version = diskVersion + alreadyReserved
    reservedCounts.set(key, alreadyReserved + 1)

    return {
      fileId: request.fileId,
      version,
      finalName: buildMaskedName(request.baseName, version, request.extension)
    }
  })
}
