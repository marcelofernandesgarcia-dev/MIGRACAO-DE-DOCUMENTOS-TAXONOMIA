import { useEffect, useRef, useState } from 'react'
import { useWizardStore } from '../../state/wizardStore'
import ProgressBar from '../../components/ProgressBar'

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function Step5_Execucao(): React.JSX.Element {
  const {
    batchId,
    scanItems,
    isMigrating,
    migrationProcessed,
    migrationTotal,
    migrationCurrentFile,
    migrationItemStatuses,
    finalStatus,
    batchReport,
    rollbackResult,
    historyIndexPath,
    startMigrationState,
    setMigrationProgress,
    addMigrationItemResult,
    finishMigrationState,
    setBatchReport,
    setRollbackResult,
    setHistoryIndexPath,
    goToStep
  } = useWizardStore()

  const fileNameById = new Map(
    scanItems.map((item) => [item.fileId, item.absolutePath.split(/[\\/]/).pop() ?? item.absolutePath])
  )

  const [isRollingBack, setIsRollingBack] = useState(false)
  const startedRef = useRef(false)
  const currentBatchIdRef = useRef<string | null>(null)

  useEffect(() => {
    currentBatchIdRef.current = batchId
  }, [batchId])

  useEffect(() => {
    const unsubProgress = window.api.migration.onProgress(
      ({ batchId: eventBatchId, processedCount, totalCount, currentFile }) => {
        if (eventBatchId !== currentBatchIdRef.current) return
        setMigrationProgress(processedCount, totalCount, currentFile)
      }
    )
    const unsubItem = window.api.migration.onItemResult(
      ({ batchId: eventBatchId, fileId, status, error }) => {
        if (eventBatchId !== currentBatchIdRef.current) return
        addMigrationItemResult(fileId, status, error)
      }
    )
    const unsubDone = window.api.migration.onDone(async ({ batchId: eventBatchId, finalStatus: status }) => {
      if (eventBatchId !== currentBatchIdRef.current) return
      finishMigrationState(status)
      const report = await window.api.migration.getReport(eventBatchId)
      setBatchReport(report)
      // RF24: gera indice de arquivamento historico (retorna null se o lote nao tocou 99_ARQUIVO_HISTORICO)
      const historyIndex = await window.api.history.generateIndex(eventBatchId)
      setHistoryIndexPath(historyIndex?.indexFilePath ?? null)
    })
    return () => {
      unsubProgress()
      unsubItem()
      unsubDone()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!batchId || startedRef.current) return
    startedRef.current = true
    startMigrationState()
    void window.api.migration.start(batchId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId])

  async function handleCancel(): Promise<void> {
    if (!batchId) return
    await window.api.migration.cancel(batchId)
  }

  async function handleRollback(): Promise<void> {
    if (!batchId) return
    setIsRollingBack(true)
    try {
      const result = await window.api.migration.rollback(batchId)
      setRollbackResult(result)
    } finally {
      setIsRollingBack(false)
    }
  }

  return (
    <section className="wizard-step">
      <h2>Passo 5 — Execução</h2>

      {isMigrating && (
        <>
          <ProgressBar
            processed={migrationProcessed}
            total={migrationTotal}
            label={migrationCurrentFile ? `Migrando: ${migrationCurrentFile}` : 'Iniciando migração...'}
            indeterminate={migrationTotal === 0}
          />
          <p className="hint-text">
            Não feche o aplicativo enquanto a migração estiver em andamento. Cada arquivo passa por
            backup, movimentação e verificação de integridade antes de ser confirmado.
          </p>
          <div className="actions-row">
            <button type="button" onClick={handleCancel}>
              Cancelar
            </button>
          </div>
        </>
      )}

      {!isMigrating && finalStatus && batchReport && (
        <div className="creation-summary">
          <p>Status final do lote: {finalStatus}</p>
          <p>
            {batchReport.migratedCount} de {batchReport.totalFiles} arquivos migrados com sucesso (
            {formatBytes(batchReport.totalBytesMigrated)})
          </p>
          {historyIndexPath && (
            <p>Índice de arquivamento histórico (RF24) gerado em: {historyIndexPath}</p>
          )}
          {batchReport.errorCount > 0 && (
            <>
              <p className="file-error">{batchReport.errorCount} arquivo(s) com erro:</p>
              <ul>
                {batchReport.errors.map((e) => (
                  <li key={e.fileId}>
                    {e.name}: {e.message}
                  </li>
                ))}
              </ul>
              {!rollbackResult && (
                <div className="actions-row">
                  <button type="button" disabled={isRollingBack} onClick={handleRollback}>
                    {isRollingBack ? 'Revertendo...' : 'Reverter lote (RF18)'}
                  </button>
                </div>
              )}
              {rollbackResult && (
                <p>
                  Rollback: {rollbackResult.restoredCount} arquivo(s) revertidos
                  {rollbackResult.errors.length > 0
                    ? ` — ${rollbackResult.errors.length} erro(s) no rollback`
                    : ''}
                </p>
              )}
            </>
          )}
        </div>
      )}

      <div className="file-list-inline">
        {[...migrationItemStatuses.entries()].map(([fileId, result]) => (
          <div key={fileId} className={`migration-item-${result.status}`}>
            {fileNameById.get(fileId) ?? fileId}: {result.status}
            {result.error ? ` — ${result.error}` : ''}
          </div>
        ))}
      </div>

      <div className="actions-row">
        <button type="button" onClick={() => goToStep(3)}>
          « Voltar
        </button>
      </div>
    </section>
  )
}

export default Step5_Execucao
