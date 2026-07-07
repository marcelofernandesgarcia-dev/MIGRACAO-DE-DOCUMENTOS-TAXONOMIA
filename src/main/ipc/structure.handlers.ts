import { ipcMain, dialog, app, BrowserWindow } from 'electron'
import { validateStructure, createStructure } from '../services/structureService'

export function registerStructureHandlers(): void {
  ipcMain.handle('structure:validate', (_event, { rootPath }: { rootPath: string }) => {
    return validateStructure(rootPath)
  })

  ipcMain.handle('structure:create', (_event, { rootPath }: { rootPath: string }) => {
    const createdDirs = createStructure(rootPath)
    return { createdDirs }
  })

  ipcMain.handle('dialog:pickDirectory', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return { path: null }
    const result = await dialog.showOpenDialog(window, {
      defaultPath: app.getPath('home'),
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { path: null }
    }
    return { path: result.filePaths[0] }
  })
}
