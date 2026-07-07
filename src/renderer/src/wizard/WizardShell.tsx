import Step1_Origem from './steps/Step1_Origem'
import Step2_Selecao from './steps/Step2_Selecao'
import Step3_Renomeacao from './steps/Step3_Renomeacao'
import Step4_Confirmacao from './steps/Step4_Confirmacao'
import Step5_Execucao from './steps/Step5_Execucao'
import { useWizardStore } from '../state/wizardStore'

const STEP_LABELS = ['Origem', 'Seleção', 'Renomeação', 'Confirmação', 'Execução']

function WizardShell(): React.JSX.Element {
  const currentStep = useWizardStore((state) => state.currentStep)
  const rootPath = useWizardStore((state) => state.rootPath)
  const sourcePath = useWizardStore((state) => state.sourcePath)
  const selectedCount = useWizardStore((state) => state.selectedFileIds.size)

  return (
    <div className="wizard-shell">
      <ol className="wizard-steps-nav">
        {STEP_LABELS.map((label, index) => (
          <li key={label} className={index === currentStep ? 'active' : ''}>
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {(rootPath || sourcePath) && (
        <div className="wizard-context-bar">
          {rootPath && (
            <span>
              <strong>Pasta raiz:</strong> {rootPath}
            </span>
          )}
          {sourcePath && (
            <span>
              <strong>Pasta de origem:</strong> {sourcePath}
            </span>
          )}
          {selectedCount > 0 && (
            <span>
              <strong>Selecionados:</strong> {selectedCount}
            </span>
          )}
        </div>
      )}

      <div className="wizard-step-content">
        {currentStep === 0 && <Step1_Origem />}
        {currentStep === 1 && <Step2_Selecao />}
        {currentStep === 2 && <Step3_Renomeacao />}
        {currentStep === 3 && <Step4_Confirmacao />}
        {currentStep === 4 && <Step5_Execucao />}
      </div>
    </div>
  )
}

export default WizardShell
