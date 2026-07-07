import { ipcMain } from 'electron'
import {
  startScan,
  cancelScan,
  getScanResults,
  overrideClassification,
  checkCollisions
} from '../services/scanService'

export function registerScanHandlers(): void {
  ipcMain.handle('scan:start', (event, { sourcePath }: { sourcePath: string }) => {
    const sender = event.sender
    const scanId = startScan(
      sourcePath,
      (item) => sender.send('scan:item', { scanId, item }),
      (processed, total) => sender.send('scan:progress', { scanId, processed, total }),
      (skippedDirs) => sender.send('scan:done', { scanId, skippedDirs })
    )
    return { scanId }
  })

  ipcMain.handle('scan:cancel', (_event, { scanId }: { scanId: string }) => {
    cancelScan(scanId)
    return { ok: true }
  })

  ipcMain.handle('scan:getResults', (_event, { scanId }: { scanId: string }) => {
    return { items: getScanResults(scanId) }
  })

  ipcMain.handle(
    'classification:override',
    (
      _event,
      { scanId, fileId, categoryPath }: { scanId: string; fileId: string; categoryPath: string }
    ) => {
      overrideClassification(scanId, fileId, categoryPath)
      return { ok: true }
    }
  )

  ipcMain.handle('collision:check', (_event, { destPaths }: { destPaths: string[] }) => {
    return { collisions: checkCollisions(destPaths) }
  })
}
