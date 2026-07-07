import { ipcMain } from 'electron'
import { resolveVersionsBatch } from '../services/renameService'
import type { ResolveVersionRequest } from '@shared/types/domain'

export function registerRenameHandlers(): void {
  ipcMain.handle(
    'rename:resolveVersions',
    (_event, { requests }: { requests: ResolveVersionRequest[] }) => {
      return { results: resolveVersionsBatch(requests) }
    }
  )
}
