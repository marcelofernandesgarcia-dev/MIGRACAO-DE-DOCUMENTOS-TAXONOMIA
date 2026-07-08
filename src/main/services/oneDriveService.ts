import { execFileSync } from 'node:child_process'

// FILE_ATTRIBUTE_OFFLINE (0x1000): marca arquivos "somente nesta nuvem" no OneDrive
// (Arquivos sob Demanda) - le-los forca um download em tempo real, o que pode ser lento.
const OFFLINE_ATTRIBUTE_FLAG = 0x1000

/**
 * Conta quantos arquivos sob `rootPath` estao marcados como somente-nuvem (nao baixados
 * localmente). Usa PowerShell (via -EncodedCommand, sem risco de injecao de comando mesmo
 * com caminhos contendo aspas/parenteses/acentos) porque o Node nao expoe atributos do
 * Windows como FILE_ATTRIBUTE_OFFLINE nativamente.
 */
export function countCloudOnlyFiles(rootPath: string): number {
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$root = [System.IO.Path]::GetFullPath('${rootPath.replace(/'/g, "''")}')
$count = (Get-ChildItem -LiteralPath $root -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Attributes -band ${OFFLINE_ATTRIBUTE_FLAG} }).Count
Write-Output $count
`
  const encoded = Buffer.from(script, 'utf16le').toString('base64')
  try {
    const result = execFileSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
      { encoding: 'utf-8', timeout: 30000 }
    )
    const parsed = parseInt(result.trim(), 10)
    return Number.isFinite(parsed) ? parsed : 0
  } catch {
    // se a deteccao falhar por qualquer motivo, nao bloqueia o escaneamento - so nao avisa
    return 0
  }
}
