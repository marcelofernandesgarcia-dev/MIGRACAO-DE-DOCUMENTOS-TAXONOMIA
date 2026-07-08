import { useEffect, useRef, useState } from 'react'
import { useWizardStore } from '../../state/wizardStore'
import VirtualizedFileList from '../../components/VirtualizedFileList'
import ProgressBar from '../../components/ProgressBar'
import { CATEGORY_TAXONOMY } from '@shared/config/categoryTaxonomy'
import type { CollisionCheckResult } from '@shared/types/domain'

function joinPath(...parts: string[]): string {
  return parts.join('\\')
}

function fileName(absolutePath: string): string {
  return absolutePath.split(/[\\/]/).pop() ?? absolutePath
}

function Step2_Selecao(): React.JSX.Element {
  const {
    rootPath,
    sourcePath,
    scanId,
    scanItems,
    scanProcessed,
    scanTotal,
    isScanning,
    skippedDirs,
    selectedFileIds,
    setSourcePath,
    startScanState,
    addScanItem,
    setScanProgress,
    finishScan,
    resetScanState,
    toggleSelected,
    selectAll,
    deselectAll,
    overrideCategoryLocal,
    goToStep
  } = useWizardStore()

  const [collisions, setCollisions] = useState<CollisionCheckResult[]>([])
  const [isCheckingCollisions, setIsCheckingCollisions] = useState(false)
  const [reviewingUncategorized, setReviewingUncategorized] = useState(false)
  const [isCheckingCloudOnly, setIsCheckingCloudOnly] = useState(false)
  const currentScanIdRef = useRef<string | null>(null)

  useEffect(() => {
    const unsubItem = window.api.scan.onItem(({ scanId: eventScanId, item }) => {
      if (eventScanId !== currentScanIdRef.current) return
      addScanItem(item)
    })
    const unsubProgress = window.api.scan.onProgress(
      ({ scanId: eventScanId, processed, total }) => {
        if (eventScanId !== currentScanIdRef.current) return
        setScanProgress(processed, total)
      }
    )
    const unsubDone = window.api.scan.onDone(({ scanId: eventScanId, skippedDirs: skipped }) => {
      if (eventScanId !== currentScanIdRef.current) return
      finishScan(skipped)
    })
    return () => {
      unsubItem()
      unsubProgress()
      unsubDone()
    }
  }, [addScanItem, setScanProgress, finishScan])

  async function handlePickSource(): Promise<void> {
    const { path } = await window.api.dialog.pickDirectory()
    if (path) setSourcePath(path)
  }

  async function handleStartScan(): Promise<void> {
    if (!sourcePath) return
    setIsCheckingCloudOnly(true)
    let cloudOnlyCount: number
    try {
      const result = await window.api.scan.checkCloudOnly(sourcePath)
      cloudOnlyCount = result.cloudOnlyCount
    } finally {
      setIsCheckingCloudOnly(false)
    }
    if (cloudOnlyCount > 0) {
      const proceed = window.confirm(
        `${cloudOnlyCount} arquivo(s) estão marcados como "somente nesta nuvem" no OneDrive. ` +
          'Calcular o hash desses arquivos vai forçar o download deles agora, o que pode demorar ' +
          'bastante dependendo do tamanho e da conexão. Deseja continuar mesmo assim?'
      )
      if (!proceed) return
    }
    const { scanId: newScanId } = await window.api.scan.start(sourcePath)
    currentScanIdRef.current = newScanId
    startScanState(newScanId)
  }

  async function handleCancelScan(): Promise<void> {
    if (!scanId) return
    await window.api.scan.cancel(scanId)
    finishScan()
  }

  function handleOverrideCategory(fileId: string, categoryPath: string): void {
    overrideCategoryLocal(fileId, categoryPath)
    if (scanId) {
      void window.api.classification.override(scanId, fileId, categoryPath)
    }
  }

  async function handleCheckCollisions(): Promise<void> {
    if (!rootPath) return
    setIsCheckingCollisions(true)
    try {
      const selectedItems = scanItems.filter((i) => selectedFileIds.has(i.fileId) && !i.error)
      const destPaths = selectedItems
        .filter((i) => i.suggestedCategory)
        .map((i) => joinPath(rootPath, i.suggestedCategory, fileName(i.absolutePath)))
      const { collisions: result } = await window.api.collision.check(destPaths)
      setCollisions(result.filter((c) => c.existingFile))
    } finally {
      setIsCheckingCollisions(false)
    }
  }

  const errorCount = scanItems.filter((i) => i.error).length
  const selectedItems = scanItems.filter((i) => selectedFileIds.has(i.fileId) && !i.error)
  const uncategorizedItems = selectedItems.filter((i) => !i.suggestedCategory)
  const displayedItems = reviewingUncategorized ? uncategorizedItems : scanItems

  function handleNext(): void {
    if (!reviewingUncategorized && uncategorizedItems.length > 0) {
      setReviewingUncategorized(true)
      return
    }
    if (uncategorizedItems.length > 0) return
    goToStep(2)
  }

  return (
    <section className="wizard-step">
      <h2>Passo 2 — Seleção e classificação</h2>
      <p>Selecione a pasta de origem e escolha quais arquivos migrar.</p>

      <div className="root-path-row">
        <input type="text" readOnly value={sourcePath} placeholder="Nenhuma pasta selecionada" />
        <button type="button" onClick={handlePickSource} disabled={isScanning}>
          Selecionar origem...
        </button>
        {(sourcePath || scanItems.length > 0) && (
          <button type="button" disabled={isScanning} onClick={resetScanState}>
            Recomeçar seleção
          </button>
        )}
      </div>
      {!sourcePath && (
        <p className="hint-text">
          Passo 1 de 3: clique em &quot;Selecionar origem...&quot; e escolha a pasta onde estão os
          arquivos que você quer migrar.
        </p>
      )}

      <div className="actions-row">
        <button
          type="button"
          disabled={!sourcePath || isScanning || isCheckingCloudOnly}
          onClick={handleStartScan}
        >
          {isCheckingCloudOnly
            ? 'Verificando arquivos na nuvem...'
            : isScanning
              ? 'Escaneando...'
              : 'Escanear pasta'}
        </button>
        {isScanning && (
          <button type="button" onClick={handleCancelScan}>
            Cancelar
          </button>
        )}
        <button type="button" disabled={scanItems.length === 0} onClick={selectAll}>
          Selecionar todos
        </button>
        <button type="button" disabled={scanItems.length === 0} onClick={deselectAll}>
          Limpar seleção
        </button>
        <button
          type="button"
          disabled={!rootPath || selectedFileIds.size === 0 || isCheckingCollisions}
          onClick={handleCheckCollisions}
        >
          {isCheckingCollisions ? 'Verificando...' : 'Verificar colisões'}
        </button>
      </div>
      {sourcePath && scanItems.length === 0 && !isScanning && (
        <p className="hint-text">
          Passo 2 de 3: clique em &quot;Escanear pasta&quot; para listar os arquivos encontrados em{' '}
          {sourcePath}.
        </p>
      )}
      {scanItems.length > 0 && !isScanning && (
        <p className="hint-text">
          Passo 3 de 3: marque os arquivos que deseja migrar (todos os sem erro já vêm marcados) e
          clique em &quot;Próximo »&quot;.
        </p>
      )}

      {(isScanning || scanTotal > 0) && (
        <ProgressBar
          processed={scanProcessed}
          total={scanTotal}
          label={isScanning ? 'Escaneando arquivos...' : 'Escaneamento concluído'}
          indeterminate={isScanning && scanTotal === 0}
        />
      )}

      {scanTotal > 0 && (
        <p className="validation-summary">
          {errorCount > 0 ? `${errorCount} arquivo(s) com erro — ` : ''}
          {selectedFileIds.size} de {scanItems.length} selecionados para migração
        </p>
      )}

      {!isScanning && skippedDirs.length > 0 && (
        <div className="creation-summary">
          <p className="file-error">
            {skippedDirs.length} pasta(s) de projeto de código (node_modules ou .git) foram
            detectadas e ignoradas automaticamente — elas nunca contêm documentos de trabalho. Se a
            pasta de origem selecionada é um repositório de código, considere escolher uma subpasta
            mais específica.
          </p>
        </div>
      )}

      {collisions.length > 0 && (
        <div className="creation-summary">
          <p>{collisions.length} colisão(ões) de nome no destino:</p>
          <ul>
            {collisions.map((c) => (
              <li key={c.destPath}>{c.destPath}</li>
            ))}
          </ul>
        </div>
      )}

      {!isScanning && !reviewingUncategorized && uncategorizedItems.length > 0 && (
        <p className="hint-text">
          {uncategorizedItems.length} de {selectedItems.length} arquivo(s) selecionado(s) não
          receberam categoria automática. Clique em &quot;Próximo »&quot; para revisá-los um a um
          antes de continuar.
        </p>
      )}

      {reviewingUncategorized && (
        <div className="creation-summary">
          <p className="file-error">
            Revisão obrigatória: atribua uma categoria a cada um dos {uncategorizedItems.length}{' '}
            arquivo(s) abaixo (use o menu suspenso). Arquivos já categorizados não aparecem aqui.
          </p>
          <button type="button" onClick={() => setReviewingUncategorized(false)}>
            Ver lista completa
          </button>
        </div>
      )}

      {displayedItems.length > 0 && (
        <VirtualizedFileList
          items={displayedItems}
          selectedFileIds={selectedFileIds}
          categories={CATEGORY_TAXONOMY}
          onToggle={toggleSelected}
          onOverrideCategory={handleOverrideCategory}
        />
      )}

      <div className="actions-row">
        <button type="button" onClick={() => goToStep(0)}>
          « Voltar
        </button>
        <button
          type="button"
          disabled={selectedFileIds.size === 0 || (reviewingUncategorized && uncategorizedItems.length > 0)}
          onClick={handleNext}
        >
          {reviewingUncategorized ? 'Concluir revisão »' : 'Próximo »'}
        </button>
      </div>
    </section>
  )
}

export default Step2_Selecao
