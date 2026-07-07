import { ipcMain, dialog, BrowserWindow } from 'electron'
import { writeFileSync } from 'node:fs'
import { getAuditLog, exportAuditLogToCsv } from '../services/auditService'
import type { AuditLogQuery } from '@shared/types/domain'

export function registerAuditHandlers(): void {
  ipcMain.handle('audit:getLog', (_event, query: AuditLogQuery) => {
    return getAuditLog(query)
  })

  ipcMain.handle('audit:exportLog', async (event, query: AuditLogQuery) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return { filePath: null }

    const result = await dialog.showSaveDialog(window, {
      defaultPath: `auditoria_${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (result.canceled || !result.filePath) return { filePath: null }

    const csv = exportAuditLogToCsv(query)
    writeFileSync(result.filePath, csv, 'utf-8')
    return { filePath: result.filePath }
  })
}
