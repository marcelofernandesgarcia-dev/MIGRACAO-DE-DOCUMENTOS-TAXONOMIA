import { ipcMain } from 'electron'
import os from 'node:os'
import { registerStructureHandlers } from './structure.handlers'
import { registerScanHandlers } from './scan.handlers'
import { registerRenameHandlers } from './rename.handlers'
import { registerMigrationHandlers } from './migration.handlers'
import { registerHistoryHandlers } from './history.handlers'
import { registerAuditHandlers } from './audit.handlers'

export function registerIpcHandlers(): void {
  ipcMain.handle('system:getOsUser', () => {
    return { username: os.userInfo().username }
  })

  registerStructureHandlers()
  registerScanHandlers()
  registerRenameHandlers()
  registerMigrationHandlers()
  registerHistoryHandlers()
  registerAuditHandlers()
}
