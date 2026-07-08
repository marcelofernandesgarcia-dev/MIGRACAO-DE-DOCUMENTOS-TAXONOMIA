import { parentPort } from 'node:worker_threads'
import { createHash } from 'node:crypto'
import { createReadStream, linkSync, copyFileSync, unlinkSync, renameSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export type CopyTask = {
  fileId: string
  sourcePath: string
  destPath: string
  backupPath: string
}

export type CopyItemResult = {
  fileId: string
  status: 'MIGRADO' | 'ERRO'
  backupPath?: string
  errorMessage?: string
  hashSha256?: string
}

type MigrateMessage = { type: 'migrate'; tasks: CopyTask[] }
type CancelMessage = { type: 'cancel' }
type InboundMessage = MigrateMessage | CancelMessage

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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function tryUnlink(filePath: string): void {
  try {
    unlinkSync(filePath)
  } catch {
    // melhor esforco: se nao conseguir limpar o backup orfao, apenas segue
  }
}

async function processTask(task: CopyTask): Promise<CopyItemResult> {
  // Hash da origem calculado agora (sob demanda, so para arquivos efetivamente selecionados
  // para migracao) e usado como "hash esperado" para a verificacao pos-movimentacao abaixo.
  let expectedHash: string
  try {
    expectedHash = await hashFile(task.sourcePath)
  } catch (hashError) {
    return {
      fileId: task.fileId,
      status: 'ERRO',
      errorMessage: `Falha ao calcular hash de origem: ${errorMessage(hashError)}`
    }
  }

  mkdirSync(dirname(task.backupPath), { recursive: true })

  try {
    try {
      linkSync(task.sourcePath, task.backupPath)
    } catch {
      copyFileSync(task.sourcePath, task.backupPath)
    }
  } catch (backupError) {
    return {
      fileId: task.fileId,
      status: 'ERRO',
      errorMessage: `Falha ao criar backup: ${errorMessage(backupError)}`
    }
  }

  mkdirSync(dirname(task.destPath), { recursive: true })

  try {
    try {
      renameSync(task.sourcePath, task.destPath)
    } catch (moveError) {
      if ((moveError as NodeJS.ErrnoException).code === 'EXDEV') {
        copyFileSync(task.sourcePath, task.destPath)
        unlinkSync(task.sourcePath)
      } else {
        throw moveError
      }
    }
  } catch (moveError) {
    tryUnlink(task.backupPath)
    return {
      fileId: task.fileId,
      status: 'ERRO',
      errorMessage: `Falha ao mover arquivo (pode estar aberto/bloqueado): ${errorMessage(moveError)}`
    }
  }

  try {
    const actualHash = await hashFile(task.destPath)
    if (actualHash === expectedHash) {
      return {
        fileId: task.fileId,
        status: 'MIGRADO',
        backupPath: task.backupPath,
        hashSha256: actualHash
      }
    }

    try {
      renameSync(task.destPath, task.sourcePath)
    } catch {
      // se nem o revert for possivel, o arquivo fica no destino mesmo com hash divergente;
      // o backup preservado permite intervencao manual
    }
    return {
      fileId: task.fileId,
      status: 'ERRO',
      backupPath: task.backupPath,
      errorMessage: 'Hash nao confere apos a migracao (possivel corrupcao)'
    }
  } catch (hashError) {
    return {
      fileId: task.fileId,
      status: 'ERRO',
      backupPath: task.backupPath,
      errorMessage: `Falha ao verificar hash pos-migracao: ${errorMessage(hashError)}`
    }
  }
}

async function processTasks(tasks: CopyTask[]): Promise<void> {
  for (const task of tasks) {
    if (cancelled) break
    const result = await processTask(task)
    parentPort?.postMessage({ type: 'itemResult', result })
  }
  parentPort?.postMessage({ type: 'bucketDone' })
}

parentPort?.on('message', (message: InboundMessage) => {
  if (message.type === 'migrate') {
    cancelled = false
    void processTasks(message.tasks)
  } else if (message.type === 'cancel') {
    cancelled = true
  }
})
