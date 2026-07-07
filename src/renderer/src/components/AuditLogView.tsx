import { useEffect, useState } from 'react'
import type { AuditLogEntry } from '@shared/types/domain'

function AuditLogView(): React.JSX.Element {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportedPath, setExportedPath] = useState<string | null>(null)

  async function loadLog(): Promise<void> {
    setIsLoading(true)
    try {
      const result = await window.api.audit.getLog({ limit: 200, offset: 0 })
      setEntries(result.entries)
      setTotal(result.total)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function loadOnMount(): Promise<void> {
      setIsLoading(true)
      try {
        const result = await window.api.audit.getLog({ limit: 200, offset: 0 })
        if (cancelled) return
        setEntries(result.entries)
        setTotal(result.total)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void loadOnMount()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleExport(): Promise<void> {
    setIsExporting(true)
    try {
      const { filePath } = await window.api.audit.exportLog({})
      setExportedPath(filePath)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <section className="wizard-step">
      <h2>Log de auditoria (append-only)</h2>
      <p>Total de eventos registrados: {total}</p>

      <div className="actions-row">
        <button type="button" disabled={isLoading} onClick={loadLog}>
          Atualizar
        </button>
        <button type="button" disabled={isExporting} onClick={handleExport}>
          {isExporting ? 'Exportando...' : 'Exportar CSV'}
        </button>
      </div>

      {exportedPath && <p className="validation-summary">Exportado em: {exportedPath}</p>}

      <div className="rename-list">
        {entries.map((entry) => (
          <div className="rename-row" key={entry.id}>
            <div className="rename-row-header">
              {entry.created_at} — {entry.event_type} — {entry.os_user}
            </div>
            <div className="validation-summary">{entry.detail_json}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default AuditLogView
