import { BrowserWindow, shell } from 'electron'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { is } from './utils/env'
import { logCrash } from './utils/crashLogger'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('unresponsive', () => {
    logCrash('window-unresponsive', 'A janela parou de responder')
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logCrash('render-process-gone', JSON.stringify(details))
  })

  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    logCrash('preload-error', `${preloadPath}: ${error.message}`)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}
