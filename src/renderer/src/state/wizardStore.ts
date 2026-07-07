import { create } from 'zustand'
import {
  suggestAno,
  suggestProcesso,
  suggestTema,
  suggestTipo
} from '@shared/utils/renameSuggestion'
import type {
  BatchReport,
  DirCreationResult,
  FileScanResult,
  PrecheckResult,
  ResolveVersionResult,
  StructureValidationResult
} from '@shared/types/domain'

export type MigrationItemStatus = { status: 'MIGRADO' | 'ERRO'; error?: string }

export type RenameFields = {
  ano: string
  processo: string
  tema: string
  tipo: string
}

function fileNameOf(absolutePath: string): string {
  return absolutePath.split(/[\\/]/).pop() ?? absolutePath
}

function suggestFields(item: FileScanResult): RenameFields {
  const fileName = fileNameOf(item.absolutePath)
  return {
    ano: suggestAno(item.mtime),
    processo: suggestProcesso(fileName),
    tema: suggestTema(item.absolutePath),
    tipo: suggestTipo(fileName, item.extension)
  }
}

type WizardState = {
  currentStep: number
  goToStep: (step: number) => void

  rootPath: string
  validation: StructureValidationResult | null
  createdDirs: DirCreationResult[] | null
  isValidating: boolean
  isCreating: boolean
  setRootPath: (path: string) => void
  setValidation: (result: StructureValidationResult | null) => void
  setCreatedDirs: (result: DirCreationResult[] | null) => void
  setIsValidating: (value: boolean) => void
  setIsCreating: (value: boolean) => void

  sourcePath: string
  scanId: string | null
  scanItems: FileScanResult[]
  scanProcessed: number
  scanTotal: number
  isScanning: boolean
  skippedDirs: string[]
  selectedFileIds: Set<string>
  setSourcePath: (path: string) => void
  startScanState: (scanId: string) => void
  addScanItem: (item: FileScanResult) => void
  setScanProgress: (processed: number, total: number) => void
  finishScan: (skippedDirs?: string[]) => void
  resetScanState: () => void
  toggleSelected: (fileId: string) => void
  selectAll: () => void
  deselectAll: () => void
  overrideCategoryLocal: (fileId: string, categoryPath: string) => void

  renameFields: Map<string, RenameFields>
  finalNames: Map<string, ResolveVersionResult>
  isResolvingVersions: boolean
  initRenameFields: () => void
  resetRenameFields: () => void
  applyBulkTemaTipo: (tema: string, tipo: string) => void
  setRenameField: (fileId: string, field: keyof RenameFields, value: string) => void
  setFinalNames: (results: ResolveVersionResult[]) => void
  setIsResolvingVersions: (value: boolean) => void

  batchId: string | null
  precheckResult: PrecheckResult | null
  isAuthorized: boolean
  isMigrating: boolean
  migrationProcessed: number
  migrationTotal: number
  migrationCurrentFile: string
  migrationItemStatuses: Map<string, MigrationItemStatus>
  finalStatus: string | null
  batchReport: BatchReport | null
  rollbackResult: { restoredCount: number; errors: string[] } | null
  historyIndexPath: string | null
  setBatchId: (batchId: string | null) => void
  setPrecheckResult: (result: PrecheckResult | null) => void
  setIsAuthorized: (value: boolean) => void
  startMigrationState: () => void
  setMigrationProgress: (processed: number, total: number, currentFile: string) => void
  addMigrationItemResult: (fileId: string, status: 'MIGRADO' | 'ERRO', error?: string) => void
  finishMigrationState: (finalStatus: string) => void
  setBatchReport: (report: BatchReport | null) => void
  setRollbackResult: (result: { restoredCount: number; errors: string[] } | null) => void
  setHistoryIndexPath: (path: string | null) => void
}

export const useWizardStore = create<WizardState>((set, get) => ({
  currentStep: 0,
  goToStep: (step) => set({ currentStep: step }),

  rootPath: '',
  validation: null,
  createdDirs: null,
  isValidating: false,
  isCreating: false,
  setRootPath: (path) => set({ rootPath: path, validation: null, createdDirs: null }),
  setValidation: (result) => set({ validation: result }),
  setCreatedDirs: (result) => set({ createdDirs: result }),
  setIsValidating: (value) => set({ isValidating: value }),
  setIsCreating: (value) => set({ isCreating: value }),

  sourcePath: '',
  scanId: null,
  scanItems: [],
  scanProcessed: 0,
  scanTotal: 0,
  isScanning: false,
  skippedDirs: [],
  selectedFileIds: new Set<string>(),
  setSourcePath: (path) => set({ sourcePath: path }),
  startScanState: (scanId) =>
    set({
      scanId,
      scanItems: [],
      scanProcessed: 0,
      scanTotal: 0,
      isScanning: true,
      skippedDirs: [],
      selectedFileIds: new Set<string>()
    }),
  addScanItem: (item) =>
    set((state) => ({
      scanItems: [...state.scanItems, item],
      selectedFileIds: item.error
        ? state.selectedFileIds
        : new Set(state.selectedFileIds).add(item.fileId)
    })),
  setScanProgress: (processed, total) => set({ scanProcessed: processed, scanTotal: total }),
  finishScan: (skippedDirs) => set({ isScanning: false, skippedDirs: skippedDirs ?? [] }),
  resetScanState: () =>
    set({
      sourcePath: '',
      scanId: null,
      scanItems: [],
      scanProcessed: 0,
      scanTotal: 0,
      isScanning: false,
      skippedDirs: [],
      selectedFileIds: new Set<string>()
    }),
  toggleSelected: (fileId) =>
    set((state) => {
      const next = new Set(state.selectedFileIds)
      if (next.has(fileId)) next.delete(fileId)
      else next.add(fileId)
      return { selectedFileIds: next }
    }),
  selectAll: () =>
    set((state) => ({
      selectedFileIds: new Set(state.scanItems.filter((i) => !i.error).map((i) => i.fileId))
    })),
  deselectAll: () => set({ selectedFileIds: new Set<string>() }),
  overrideCategoryLocal: (fileId, categoryPath) => {
    const state = get()
    set({
      scanItems: state.scanItems.map((item) =>
        item.fileId === fileId ? { ...item, suggestedCategory: categoryPath } : item
      )
    })
  },

  renameFields: new Map<string, RenameFields>(),
  finalNames: new Map<string, ResolveVersionResult>(),
  isResolvingVersions: false,
  initRenameFields: () => {
    const state = get()
    const itemsById = new Map(state.scanItems.map((item) => [item.fileId, item]))
    const next = new Map(state.renameFields)
    for (const fileId of state.selectedFileIds) {
      if (next.has(fileId)) continue
      const item = itemsById.get(fileId)
      next.set(fileId, item ? suggestFields(item) : { ano: '', processo: '', tema: '', tipo: '' })
    }
    set({ renameFields: next })
  },
  resetRenameFields: () => {
    const state = get()
    const itemsById = new Map(state.scanItems.map((item) => [item.fileId, item]))
    const next = new Map<string, RenameFields>()
    for (const fileId of state.selectedFileIds) {
      const item = itemsById.get(fileId)
      next.set(fileId, item ? suggestFields(item) : { ano: '', processo: '', tema: '', tipo: '' })
    }
    set({ renameFields: next, finalNames: new Map<string, ResolveVersionResult>() })
  },
  applyBulkTemaTipo: (tema, tipo) =>
    set((state) => {
      const next = new Map(state.renameFields)
      for (const fileId of state.selectedFileIds) {
        const current = next.get(fileId) ?? { ano: '', processo: '', tema: '', tipo: '' }
        next.set(fileId, { ...current, tema, tipo })
      }
      return { renameFields: next, finalNames: new Map<string, ResolveVersionResult>() }
    }),
  setRenameField: (fileId, field, value) =>
    set((state) => {
      const next = new Map(state.renameFields)
      const current = next.get(fileId) ?? { ano: '', processo: '', tema: '', tipo: '' }
      next.set(fileId, { ...current, [field]: value })
      return { renameFields: next }
    }),
  setFinalNames: (results) =>
    set((state) => {
      const next = new Map(state.finalNames)
      for (const result of results) {
        next.set(result.fileId, result)
      }
      return { finalNames: next }
    }),
  setIsResolvingVersions: (value) => set({ isResolvingVersions: value }),

  batchId: null,
  precheckResult: null,
  isAuthorized: false,
  isMigrating: false,
  migrationProcessed: 0,
  migrationTotal: 0,
  migrationCurrentFile: '',
  migrationItemStatuses: new Map<string, MigrationItemStatus>(),
  finalStatus: null,
  batchReport: null,
  rollbackResult: null,
  historyIndexPath: null,
  setBatchId: (batchId) => set({ batchId }),
  setPrecheckResult: (result) => set({ precheckResult: result }),
  setIsAuthorized: (value) => set({ isAuthorized: value }),
  startMigrationState: () =>
    set({
      isMigrating: true,
      migrationProcessed: 0,
      migrationTotal: 0,
      migrationCurrentFile: '',
      migrationItemStatuses: new Map<string, MigrationItemStatus>(),
      finalStatus: null,
      batchReport: null,
      rollbackResult: null,
      historyIndexPath: null
    }),
  setMigrationProgress: (processed, total, currentFile) =>
    set({ migrationProcessed: processed, migrationTotal: total, migrationCurrentFile: currentFile }),
  addMigrationItemResult: (fileId, status, error) =>
    set((state) => {
      const next = new Map(state.migrationItemStatuses)
      next.set(fileId, { status, error })
      return { migrationItemStatuses: next }
    }),
  finishMigrationState: (finalStatus) => set({ isMigrating: false, finalStatus }),
  setBatchReport: (report) => set({ batchReport: report }),
  setRollbackResult: (result) => set({ rollbackResult: result }),
  setHistoryIndexPath: (path) => set({ historyIndexPath: path })
}))
