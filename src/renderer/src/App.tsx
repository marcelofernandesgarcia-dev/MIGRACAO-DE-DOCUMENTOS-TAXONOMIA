import { useState } from 'react'
import WizardShell from './wizard/WizardShell'
import AuditLogView from './components/AuditLogView'

function App(): React.JSX.Element {
  const [view, setView] = useState<'wizard' | 'audit'>('wizard')

  return (
    <main className="app-shell">
      <header>
        <h1>Migrador de Documentos</h1>
        <p>Sistema de migração e governança de documentos — MARCELO_FERNANDES</p>
        <div className="actions-row">
          <button type="button" onClick={() => setView('wizard')}>
            Wizard
          </button>
          <button type="button" onClick={() => setView('audit')}>
            Log de Auditoria
          </button>
        </div>
      </header>
      {view === 'wizard' ? <WizardShell /> : <AuditLogView />}
    </main>
  )
}

export default App
