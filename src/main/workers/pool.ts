import { Worker } from 'node:worker_threads'
import { cpus } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { RawFileMeta } from './scan.worker'

const __dirname = dirname(fileURLToPath(import.meta.url))

type ItemCallback = (result: RawFileMeta) => void
type ItemErrorCallback = (absolutePath: string, error: string) => void

export class ScanWorkerPool {
  private workers: Worker[] = []
  private poolSize: number

  constructor(poolSize = Math.max(2, cpus().length - 1)) {
    this.poolSize = poolSize
  }

  private createWorker(): Worker {
    return new Worker(join(__dirname, 'workers/scan.worker.js'))
  }

  cancel(): void {
    for (const worker of this.workers) {
      worker.postMessage({ type: 'cancel' })
    }
  }

  async terminate(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.terminate()))
    this.workers = []
  }

  scanFiles(
    filePaths: string[],
    onItem: ItemCallback,
    onItemError: ItemErrorCallback
  ): Promise<void> {
    if (filePaths.length === 0) return Promise.resolve()

    const bucketCount = Math.min(this.poolSize, filePaths.length)
    const buckets: string[][] = Array.from({ length: bucketCount }, () => [])
    filePaths.forEach((filePath, index) => {
      buckets[index % bucketCount].push(filePath)
    })

    this.workers = Array.from({ length: bucketCount }, () => this.createWorker())

    return new Promise((resolve, reject) => {
      let bucketsDone = 0

      this.workers.forEach((worker, index) => {
        worker.on(
          'message',
          (message: { type: string; result?: RawFileMeta; absolutePath?: string; error?: string }) => {
            if (message.type === 'item' && message.result) {
              onItem(message.result)
            } else if (message.type === 'itemError' && message.absolutePath && message.error) {
              onItemError(message.absolutePath, message.error)
            } else if (message.type === 'bucketDone') {
              bucketsDone += 1
              if (bucketsDone === bucketCount) {
                resolve()
              }
            }
          }
        )
        worker.on('error', reject)
        worker.postMessage({ type: 'scan', filePaths: buckets[index] })
      })
    })
  }
}
