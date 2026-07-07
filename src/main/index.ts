import { app, BrowserWindow } from 'electron'
import { createMainWindow } from './window'
import { registerIpcHandlers } from './ipc'
import { getDb, closeDb } from './db/connection'
import { installCrashHandlers } from './utils/crashLogger'

installCrashHandlers()

app.whenReady().then(() => {
  getDb()
  registerIpcHandlers()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDb()
})
