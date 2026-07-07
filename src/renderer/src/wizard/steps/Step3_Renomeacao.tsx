import { useEffect, useState } from 'react'
import { useWizardStore } from '../../state/wizardStore'
import RenameVirtualizedList from '../../components/RenameVirtualizedList'
import { sanitizeName } from '@shared/utils/sanitizeName'
import { buildBaseName } from '@shared/utils/maskName'
import type { ResolveVersionRequest } from '@shared/types/domain'

function joinPath(...parts: string[]): string {
  return parts.join('\\')
}

function Step3_Renomeacao(): React.JSX.Element {
  const {
    rootPath,
    scanItems,
    selectedFileIds,
    renameFields,
    finalNames,
    isResolvingVersions,
    initRenameFields,
    resetRenameFields,
    applyBulkTemaTipo,
    setRenameField,
    setFinalNames,
    setIsResolvingVersions,
    goToStep
  } = useWizardStore()

  const [bulkTema, setBulkTema] = useState('')
  const [bulkTipo, setBulkTipo] = useState('')

  useEffect(() => {
    initRenameFields()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedItems = scanItems.filter((item) => selectedFileIds.has(item.fileId) && !item.error)

  function previewBaseName(fileId: string): string {
    const fields = renameFields.get(fileId) ?? { ano: '', processo: '', tema: '', tipo: '' }
    return buildBaseName({
      ano: fields.ano,
      processo: sanitizeName(fields.processo),
      tema: sanitizeName(fields.tema),
      tipo: sanitizeName(fields.tipo)
    })
  }

  async function handleResolveVersions(): Promise<void> {
    setIsResolvingVersions(true)
    try {
      const requests: ResolveVersionRequest[] = selectedItems
        .filter((item) => item.suggestedCategory)
        .map((item) => ({
          fileId: item.fileId,
          destDir: joinPath(rootPath, item.suggestedCategory),
          baseName: previewBaseName(item.fileId),
          extension: item.extension
        }))
      const { results } = await window.api.rename.resolveVersions(requests)
      setFinalNames(results)
    } finally {
      setIsResolvingVersions(false)
    }
  }

  function handleApplyBulk(): void {
    applyBulkTemaTipo(bulkTema, bulkTipo)
  }

  const allResolved =
    selectedItems.length > 0 && selectedItems.every((item) => finalNames.has(item.fileId))

  return (
    <section className="wizard-step">
      <h2>Passo 3 — Renomeação</h2>
      <p>
        Campos pré-preenchidos automaticamente a partir do nome do arquivo, da pasta de origem e da
        data de modificação — ajuste o que for necessário. Máscara final:
        AAAA_PROCESSO_TEMA_TIPO_VX.ext
      </p>

      {selectedItems.length > 0 && !allResolved && (
        <p className="hint-text">
          Revise as sugestões automáticas (Processo e Tema costumam precisar de ajuste manual) e
          clique em &quot;Resolver versões&quot; para calcular o nome final e a versão (V1, V2...)
          de cada arquivo antes de avançar.
        </p>
      )}

      <div className="actions-row">
        <input
          type="text"
          placeholder="Tema (aplicar a todos)"
          value={bulkTema}
          onChange={(e) => setBulkTema(e.target.value)}
        />
        <input
          type="text"
          placeholder="Tipo (aplicar a todos)"
          value={bulkTipo}
          onChange={(e) => setBulkTipo(e.target.value)}
        />
        <button
          type="button"
          disabled={selectedItems.length === 0 || (!bulkTema && !bulkTipo)}
          onClick={handleApplyBulk}
        >
          Aplicar a todos os selecionados
        </button>
      </div>

      <div className="actions-row">
        <button
          type="button"
          disabled={selectedItems.length === 0 || isResolvingVersions}
          onClick={handleResolveVersions}
        >
          {isResolvingVersions ? 'Resolvendo versões...' : 'Resolver versões (RF13)'}
        </button>
        <button type="button" disabled={selectedItems.length === 0} onClick={resetRenameFields}>
          Recomeçar renomeação
        </button>
      </div>

      {selectedItems.length > 0 && (
        <RenameVirtualizedList
          items={selectedItems}
          renameFields={renameFields}
          finalNames={finalNames}
          onFieldChange={setRenameField}
        />
      )}

      <div className="actions-row">
        <button type="button" onClick={() => goToStep(1)}>
          « Voltar
        </button>
        <button type="button" disabled={!allResolved} onClick={() => goToStep(3)}>
          Próximo »
        </button>
      </div>
    </section>
  )
}

export default Step3_Renomeacao
