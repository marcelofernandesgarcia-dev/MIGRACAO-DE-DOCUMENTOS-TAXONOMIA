import { useWizardStore } from '../../state/wizardStore'

function Step1_Origem(): React.JSX.Element {
  const {
    rootPath,
    validation,
    createdDirs,
    isValidating,
    isCreating,
    setRootPath,
    setValidation,
    setCreatedDirs,
    setIsValidating,
    setIsCreating,
    goToStep
  } = useWizardStore()

  async function handlePickDirectory(): Promise<void> {
    const { path } = await window.api.dialog.pickDirectory()
    if (path) {
      setRootPath(path)
    }
  }

  async function handleValidate(): Promise<void> {
    if (!rootPath) return
    setIsValidating(true)
    try {
      const result = await window.api.structure.validate(rootPath)
      setValidation(result)
    } finally {
      setIsValidating(false)
    }
  }

  async function handleCreate(): Promise<void> {
    if (!rootPath) return
    setIsCreating(true)
    try {
      const result = await window.api.structure.create(rootPath)
      setCreatedDirs(result.createdDirs)
      const revalidated = await window.api.structure.validate(rootPath)
      setValidation(revalidated)
    } finally {
      setIsCreating(false)
    }
  }

  const errorCount = createdDirs?.filter((d) => d.status === 'ERRO').length ?? 0

  return (
    <section className="wizard-step">
      <h2>Passo 1 — Pasta raiz da estrutura</h2>
      <p>Selecione a pasta onde a estrutura MARCELO_FERNANDES será criada.</p>

      <div className="root-path-row">
        <input type="text" readOnly value={rootPath} placeholder="Nenhuma pasta selecionada" />
        <button type="button" onClick={handlePickDirectory}>
          Selecionar pasta...
        </button>
      </div>
      {!rootPath && (
        <p className="hint-text">
          Escolha a pasta onde a árvore de categorias (01_ADMINISTRATIVO_GERAL, ... 99_ARQUIVO_HISTORICO)
          será criada — por exemplo, uma pasta vazia dedicada como D:\Trabalho.
        </p>
      )}
      {rootPath && !validation && (
        <p className="hint-text">
          Clique em &quot;Validar estrutura&quot; para conferir o que já existe, depois em &quot;Criar
          estrutura&quot; para gerar as pastas que faltam.
        </p>
      )}
      {validation && validation.missing.length > 0 && !createdDirs && (
        <p className="hint-text">
          Faltam {validation.missing.length} pasta(s). Clique em &quot;Criar estrutura&quot; para
          criá-las antes de avançar.
        </p>
      )}

      <div className="actions-row">
        <button type="button" disabled={!rootPath || isValidating} onClick={handleValidate}>
          {isValidating ? 'Validando...' : 'Validar estrutura'}
        </button>
        <button type="button" disabled={!rootPath || isCreating} onClick={handleCreate}>
          {isCreating ? 'Criando...' : 'Criar estrutura'}
        </button>
      </div>

      {validation && (
        <div className="validation-summary">
          <p>
            Pastas já existentes: {validation.existing.length} — Faltando:{' '}
            {validation.missing.length}
          </p>
        </div>
      )}

      {createdDirs && (
        <div className="creation-summary">
          <p>
            {createdDirs.length} entradas processadas
            {errorCount > 0 ? ` — ${errorCount} com erro` : ' — todas com sucesso'}
          </p>
          {errorCount > 0 && (
            <ul>
              {createdDirs
                .filter((d) => d.status === 'ERRO')
                .map((d) => (
                  <li key={d.path}>
                    {d.path}: {d.message}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      <div className="actions-row">
        <button
          type="button"
          disabled={!validation || validation.missing.length > 0}
          onClick={() => goToStep(1)}
        >
          Próximo »
        </button>
      </div>
    </section>
  )
}

export default Step1_Origem
