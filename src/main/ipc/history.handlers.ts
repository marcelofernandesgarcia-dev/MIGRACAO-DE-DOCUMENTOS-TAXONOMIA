import { ipcMain } from 'electron'
import { proposeYearFolders, generateHistoryIndex } from '../services/historyService'

export function registerHistoryHandlers(): void {
  ipcMain.handle(
    'history:proposeYearFolders',
    (_event, { items }: { items: Array<{ fileId: string; mtime: string }> }) => {
      return { mapping: proposeYearFolders(items) }
    }
  )

  ipcMain.handle('history:generateIndex', (_event, { batchId }: { batchId: string }) => {
    return generateHistoryIndex(batchId)
  })
}
