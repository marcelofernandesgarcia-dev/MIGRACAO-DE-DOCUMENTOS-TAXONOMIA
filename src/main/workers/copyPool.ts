import { Worker } from 'node:worker_threads'
import { cpus } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CopyTask, CopyItemResult } from './copy.worker'

const __dirname = dirname(fileURLToPath(import.meta.url))

type ItemResultCallback = (result: CopyItemResult) => void

export class CopyWorkerPool {
  private workers: Worker[] = []
  private poolSize: number

  constructor(poolSize = Math.max(2, cpus().length - 1)) {
    this.poolSize = poolSize
  }

  private createWorker(): Worker {
    return new Worker(join(__dirname, 'workers/copy.worker.js'))
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

  migrateFiles(tasks: CopyTask[], onItemResult: ItemResultCallback): Promise<void> {
    if (tasks.length === 0) return Promise.resolve()

    const bucketCount = Math.min(this.poolSize, tasks.length)
    const buckets: CopyTask[][] = Array.from({ length: bucketCount }, () => [])
    tasks.forEach((task, index) => {
      buckets[index % bucketCount].push(task)
    })

    this.workers = Array.from({ length: bucketCount }, () => this.createWorker())

    return new Promise((resolve, reject) => {
      let bucketsDone = 0

      this.workers.forEach((worker, index) => {
        worker.on('message', (message: { type: string; result?: CopyItemResult }) => {
          if (message.type === 'itemResult' && message.result) {
            onItemResult(message.result)
          } else if (message.type === 'bucketDone') {
            bucketsDone += 1
            if (bucketsDone === bucketCount) {
              resolve()
            }
          }
        })
        worker.on('error', reject)
        worker.postMessage({ type: 'migrate', tasks: buckets[index] })
      })
    })
  }
}
