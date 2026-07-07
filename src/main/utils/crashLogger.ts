import { app } from 'electron'
import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

function logFilePath(): string {
  const userDataDir = app.getPath('userData')
  mkdirSync(userDataDir, { recursive: true })
  return join(userDataDir, 'crash.log')
}

export function logCrash(source: string, detail: unknown): void {
  const line = `[${new Date().toISOString()}] [${source}] ${
    detail instanceof Error ? (detail.stack ?? detail.message) : String(detail)
  }\n`
  console.error(line)
  try {
    appendFileSync(logFilePath(), line, 'utf-8')
  } catch {
    // se nem o log em arquivo funcionar, ao menos o console.error acima ja tentou
  }
}

export function installCrashHandlers(): void {
  process.on('uncaughtException', (error) => {
    logCrash('uncaughtException', error)
  })
  process.on('unhandledRejection', (reason) => {
    logCrash('unhandledRejection', reason)
  })
}
