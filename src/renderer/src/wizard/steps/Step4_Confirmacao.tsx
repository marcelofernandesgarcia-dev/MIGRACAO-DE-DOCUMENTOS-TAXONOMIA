import { useEffect, useState } from 'react'
import { useWizardStore } from '../../state/wizardStore'
import DiffPreview from '../../components/DiffPreview'
import ProgressBar from '../../components/ProgressBar'
import { isHistoricalCategory } from '@shared/utils/historyYearFolder'
import type { BatchSelectionItem } from '@shared/types/domain'

function fileName(absolutePath: string): string {
  return absolutePath.split(/[\\/]/).pop() ?? absolutePath
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function Step4_Confirmacao(): React.JSX.Element {
  const {
    rootPath,
    sourcePath,
    scanItems,
    selectedFileIds,
    finalNames,
    batchId,
    precheckResult,
    setBatchId,
    setPrecheckResult,
    setIsAuthorized,
    goToStep
  } = useWizardStore()

  const [osUser, setOsUser] = useState('')
  const [isPreparing, setIsPreparing] = useState(false)
  const [confirmChecked, setConfirmChecked] = useState(false)
  const [isAuthorizing, setIsAuthorizing] = useState(false)

  const selectedItems = scanItems.filter((item) => selectedFileIds.has(item.fileId) && !item.error)

  useEffect(() => {
    window.api.system.getOsUser().then((result) => setOsUser(result.username))
  }, [])

  useEffect(() => {
    if (batchId) return
    async function prepare(): Promise<void> {
      setIsPreparing(true)
      try {
        // RF22: arquivos destinados a 99_ARQUIVO_HISTORICO ganham subpasta anual baseada no mtime original
        const historicalItems = selectedItems.filter((item) =>
          isHistoricalCategory(item.suggestedCategory)
        )
        const yearFolderByFileId = new Map<string, string>()
        if (historicalItems.length > 0) {
          const { mapping } = await window.api.history.proposeYearFolders(
            historicalItems.map((item) => ({ fileId: item.fileId, mtime: item.mtime }))
          )
          for (const entry of mapping) yearFolderByFileId.set(entry.fileId, entry.yearFolder)
        }

        const items: BatchSelectionItem[] = selectedItems.map((item) => {
          const finalResult = finalNames.get(item.fileId)
          return {
            fileId: item.fileId,
            originalName: fileName(item.absolutePath),
            newName: finalResult?.finalName ?? fileName(item.absolutePath),
            sourceAbsolutePath: item.absolutePath,
            destCategoryCode: yearFolderByFileId.get(item.fileId) ?? item.suggestedCategory,
            sizeBytes: item.sizeBytes,
            sourceMtime: item.mtime,
            hashSha256: item.sha256 ?? null
          }
        })
        const { batchId: newBatchId } = await window.api.migration.createBatch(
          sourcePath,
          rootPath,
          items
        )
        setBatchId(newBatchId)
        const precheck = await window.api.migration.precheck(newBatchId)
        setPrecheckResult(precheck)
      } finally {
        setIsPreparing(false)
      }
    }
    void prepare()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAuthorize(): Promise<void> {
    if (!batchId) return
    setIsAuthorizing(true)
    try {
      await window.api.migration.authorize(batchId)
      setIsAuthorized(true)
      goToStep(4)
    } finally {
      setIsAuthorizing(false)
    }
  }

  const canAuthorize = !!precheckResult?.ok && confirmChecked && !isAuthorizing

  return (
    <section className="wizard-step">
      <h2>Passo 4 — Confirmação e autorização</h2>
      <p>Revise o lote antes de executar a migração. Nenhuma escrita ocorre sem sua autorização explícita.</p>

      {isPreparing && (
        <ProgressBar processed={0} total={0} label="Verificando espaço em disco e nomes..." indeterminate />
      )}

      {precheckResult?.ok && (
        <p className="hint-text">
          Tudo certo. Marque a confirmação abaixo e clique em &quot;Autorizar e migrar&quot; para
          iniciar — nada será escrito em disco até esse clique.
        </p>
      )}

      {precheckResult && (
        <div className="creation-summary">
          <p>
            Espaço livre: {formatBytes(precheckResult.freeSpaceBytes)} — necessário:{' '}
            {formatBytes(precheckResult.requiredBytes)}
          </p>
          {precheckResult.blockedFiles.length > 0 && (
            <p className="file-error">
              {precheckResult.blockedFiles.length} arquivo(s) com caminho de destino maior que 260
              caracteres — encurte PROCESSO/TEMA/TIPO no Passo 3 antes de continuar.
            </p>
          )}
          {!precheckResult.ok && precheckResult.blockedFiles.length === 0 && (
            <p className="file-error">Espaço em disco insuficiente para este lote.</p>
          )}
        </div>
      )}

      <div className="rename-list">
        {selectedItems.map((item) => {
          const finalResult = finalNames.get(item.fileId)
          return (
            <DiffPreview
              key={item.fileId}
              originalName={fileName(item.absolutePath)}
              newName={finalResult?.finalName ?? fileName(item.absolutePath)}
            />
          )
        })}
      </div>

      <div className="validation-summary">
        <label>
          <input
            type="checkbox"
            checked={confirmChecked}
            onChange={(e) => setConfirmChecked(e.target.checked)}
          />{' '}
          Eu, <strong>{osUser || '...'}</strong>, revisei os {selectedItems.length} arquivo(s)
          listados e autorizo a migração definitiva (RF29).
        </label>
      </div>

      <div className="actions-row">
        <button type="button" onClick={() => goToStep(2)}>
          « Voltar
        </button>
        <button type="button" disabled={!canAuthorize} onClick={handleAuthorize}>
          {isAuthorizing ? 'Autorizando...' : 'Autorizar e migrar »'}
        </button>
      </div>
    </section>
  )
}

export default Step4_Confirmacao
