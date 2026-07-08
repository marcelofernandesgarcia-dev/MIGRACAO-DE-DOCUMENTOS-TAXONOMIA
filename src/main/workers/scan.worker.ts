import { parentPort } from 'node:worker_threads'
import { statSync } from 'node:fs'
import { extname } from 'node:path'

type ScanMessage = { type: 'scan'; filePaths: string[] }
type CancelMessage = { type: 'cancel' }
type InboundMessage = ScanMessage | CancelMessage

export type RawFileMeta = {
  absolutePath: string
  sizeBytes: number
  mtime: string
  extension: string
}

let cancelled = false

function processFiles(filePaths: string[]): void {
  for (const filePath of filePaths) {
    if (cancelled) break
    try {
      // So metadados aqui (sem ler o conteudo do arquivo) - o hash SHA256 e calculado
      // sob demanda na migracao (Passo 5), apenas para os arquivos efetivamente selecionados,
      // para nao travar o escaneamento em pastas com muitos GB de arquivos grandes.
      const stats = statSync(filePath)
      const result: RawFileMeta = {
        absolutePath: filePath,
        sizeBytes: stats.size,
        mtime: stats.mtime.toISOString(),
        extension: extname(filePath).toLowerCase()
      }
      parentPort?.postMessage({ type: 'item', result })
    } catch (error) {
      parentPort?.postMessage({
        type: 'itemError',
        absolutePath: filePath,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }
  parentPort?.postMessage({ type: 'bucketDone' })
}

parentPort?.on('message', (message: InboundMessage) => {
  if (message.type === 'scan') {
    cancelled = false
    processFiles(message.filePaths)
  } else if (message.type === 'cancel') {
    cancelled = true
  }
})
