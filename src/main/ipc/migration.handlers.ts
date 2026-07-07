import { ipcMain } from 'electron'
import {
  createMigrationBatch,
  precheckBatch,
  authorizeBatch,
  runMigration,
  cancelMigration,
  rollbackBatch,
  getBatchReport
} from '../services/migrationService'
import type { BatchSelectionItem } from '@shared/types/domain'

export function registerMigrationHandlers(): void {
  ipcMain.handle(
    'migration:createBatch',
    (
      _event,
      {
        sourcePath,
        rootDestPath,
        items
      }: { sourcePath: string; rootDestPath: string; items: BatchSelectionItem[] }
    ) => {
      const batchId = createMigrationBatch(sourcePath, rootDestPath, items)
      return { batchId }
    }
  )

  ipcMain.handle('migration:precheck', async (_event, { batchId }: { batchId: string }) => {
    return precheckBatch(batchId)
  })

  ipcMain.handle('migration:authorize', (_event, { batchId }: { batchId: string }) => {
    return authorizeBatch(batchId)
  })

  ipcMain.handle('migration:start', (event, { batchId }: { batchId: string }) => {
    const sender = event.sender
    void runMigration(
      batchId,
      (processedCount, totalCount, currentFile) =>
        sender.send('migration:progress', { batchId, processedCount, totalCount, currentFile }),
      (fileId, status, error) =>
        sender.send('migration:itemResult', { batchId, fileId, status, error }),
      (finalStatus) => sender.send('migration:done', { batchId, finalStatus })
    )
    return { started: true }
  })

  ipcMain.handle('migration:cancel', (_event, { batchId }: { batchId: string }) => {
    cancelMigration(batchId)
    return { ok: true }
  })

  ipcMain.handle('migration:rollback', (_event, { batchId }: { batchId: string }) => {
    return rollbackBatch(batchId)
  })

  ipcMain.handle('migration:getReport', (_event, { batchId }: { batchId: string }) => {
    return getBatchReport(batchId)
  })
}
