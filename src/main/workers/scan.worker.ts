import { parentPort } from 'node:worker_threads'
import { createHash } from 'node:crypto'
import { createReadStream, statSync } from 'node:fs'
import { extname } from 'node:path'

type ScanMessage = { type: 'scan'; filePaths: string[] }
type CancelMessage = { type: 'cancel' }
type InboundMessage = ScanMessage | CancelMessage

export type RawFileMeta = {
  absolutePath: string
  sizeBytes: number
  mtime: string
  extension: string
  sha256: string
}

let cancelled = false

function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

async function processFiles(filePaths: string[]): Promise<void> {
  for (const filePath of filePaths) {
    if (cancelled) break
    try {
      const stats = statSync(filePath)
      const sha256 = await hashFile(filePath)
      const result: RawFileMeta = {
        absolutePath: filePath,
        sizeBytes: stats.size,
        mtime: stats.mtime.toISOString(),
        extension: extname(filePath).toLowerCase(),
        sha256
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
    void processFiles(message.filePaths)
  } else if (message.type === 'cancel') {
    cancelled = true
  }
})
