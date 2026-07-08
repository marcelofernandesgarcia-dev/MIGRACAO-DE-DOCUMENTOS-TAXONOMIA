import { contextBridge, ipcRenderer } from 'electron'
import type {
  DirCreationResult,
  StructureValidationResult,
  FileScanResult,
  CollisionCheckResult,
  ResolveVersionRequest,
  ResolveVersionResult,
  BatchSelectionItem,
  PrecheckResult,
  BatchReport,
  AuditLogEntry,
  AuditLogQuery
} from '@shared/types/domain'

const api = {
  system: {
    getOsUser: (): Promise<{ username: string }> => ipcRenderer.invoke('system:getOsUser')
  },
  dialog: {
    pickDirectory: (): Promise<{ path: string | null }> =>
      ipcRenderer.invoke('dialog:pickDirectory')
  },
  structure: {
    validate: (rootPath: string): Promise<StructureValidationResult> =>
      ipcRenderer.invoke('structure:validate', { rootPath }),
    create: (rootPath: string): Promise<{ createdDirs: DirCreationResult[] }> =>
      ipcRenderer.invoke('structure:create', { rootPath })
  },
  scan: {
    start: (sourcePath: string): Promise<{ scanId: string }> =>
      ipcRenderer.invoke('scan:start', { sourcePath }),
    cancel: (scanId: string): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke('scan:cancel', { scanId }),
    getResults: (scanId: string): Promise<{ items: FileScanResult[] }> =>
      ipcRenderer.invoke('scan:getResults', { scanId }),
    onItem: (callback: (payload: { scanId: string; item: FileScanResult }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: unknown): void =>
        callback(payload as { scanId: string; item: FileScanResult })
      ipcRenderer.on('scan:item', listener)
      return () => ipcRenderer.removeListener('scan:item', listener)
    },
    onProgress: (
      callback: (payload: { scanId: string; processed: number; total: number }) => void
    ) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: unknown): void =>
        callback(payload as { scanId: string; processed: number; total: number })
      ipcRenderer.on('scan:progress', listener)
      return () => ipcRenderer.removeListener('scan:progress', listener)
    },
    onDone: (callback: (payload: { scanId: string; skippedDirs: string[] }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: unknown): void =>
        callback(payload as { scanId: string; skippedDirs: string[] })
      ipcRenderer.on('scan:done', listener)
      return () => ipcRenderer.removeListener('scan:done', listener)
    },
    checkCloudOnly: (sourcePath: string): Promise<{ cloudOnlyCount: number }> =>
      ipcRenderer.invoke('scan:checkCloudOnly', { sourcePath })
  },
  classification: {
    override: (scanId: string, fileId: string, categoryPath: string): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke('classification:override', { scanId, fileId, categoryPath })
  },
  collision: {
    check: (destPaths: string[]): Promise<{ collisions: CollisionCheckResult[] }> =>
      ipcRenderer.invoke('collision:check', { destPaths })
  },
  rename: {
    resolveVersions: (
      requests: ResolveVersionRequest[]
    ): Promise<{ results: ResolveVersionResult[] }> =>
      ipcRenderer.invoke('rename:resolveVersions', { requests })
  },
  migration: {
    createBatch: (
      sourcePath: string,
      rootDestPath: string,
      items: BatchSelectionItem[]
    ): Promise<{ batchId: string }> =>
      ipcRenderer.invoke('migration:createBatch', { sourcePath, rootDestPath, items }),
    precheck: (batchId: string): Promise<PrecheckResult> =>
      ipcRenderer.invoke('migration:precheck', { batchId }),
    authorize: (batchId: string): Promise<{ osUser: string }> =>
      ipcRenderer.invoke('migration:authorize', { batchId }),
    start: (batchId: string): Promise<{ started: boolean }> =>
      ipcRenderer.invoke('migration:start', { batchId }),
    cancel: (batchId: string): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke('migration:cancel', { batchId }),
    rollback: (batchId: string): Promise<{ restoredCount: number; errors: string[] }> =>
      ipcRenderer.invoke('migration:rollback', { batchId }),
    getReport: (batchId: string): Promise<BatchReport> =>
      ipcRenderer.invoke('migration:getReport', { batchId }),
    onProgress: (
      callback: (payload: {
        batchId: string
        processedCount: number
        totalCount: number
        currentFile: string
      }) => void
    ) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: unknown): void =>
        callback(
          payload as {
            batchId: string
            processedCount: number
            totalCount: number
            currentFile: string
          }
        )
      ipcRenderer.on('migration:progress', listener)
      return () => ipcRenderer.removeListener('migration:progress', listener)
    },
    onItemResult: (
      callback: (payload: {
        batchId: string
        fileId: string
        status: 'MIGRADO' | 'ERRO'
        error?: string
      }) => void
    ) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: unknown): void =>
        callback(
          payload as { batchId: string; fileId: string; status: 'MIGRADO' | 'ERRO'; error?: string }
        )
      ipcRenderer.on('migration:itemResult', listener)
      return () => ipcRenderer.removeListener('migration:itemResult', listener)
    },
    onDone: (
      callback: (payload: {
        batchId: string
        finalStatus: 'CONCLUIDO' | 'CONCLUIDO_COM_ERROS' | 'CANCELADO'
      }) => void
    ) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: unknown): void =>
        callback(
          payload as {
            batchId: string
            finalStatus: 'CONCLUIDO' | 'CONCLUIDO_COM_ERROS' | 'CANCELADO'
          }
        )
      ipcRenderer.on('migration:done', listener)
      return () => ipcRenderer.removeListener('migration:done', listener)
    }
  },
  history: {
    proposeYearFolders: (
      items: Array<{ fileId: string; mtime: string }>
    ): Promise<{ mapping: Array<{ fileId: string; yearFolder: string }> }> =>
      ipcRenderer.invoke('history:proposeYearFolders', { items }),
    generateIndex: (batchId: string): Promise<{ indexFilePath: string } | null> =>
      ipcRenderer.invoke('history:generateIndex', { batchId })
  },
  audit: {
    getLog: (query: AuditLogQuery): Promise<{ entries: AuditLogEntry[]; total: number }> =>
      ipcRenderer.invoke('audit:getLog', query),
    exportLog: (query: AuditLogQuery): Promise<{ filePath: string | null }> =>
      ipcRenderer.invoke('audit:exportLog', query)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
