export type CategoryDefinition = {
  code: string
  label: string
  isSpecial: boolean
  subfolders: string[]
}

export const CATEGORY_TAXONOMY: CategoryDefinition[] = [
  {
    code: '01_ADMINISTRATIVO_GERAL',
    label: 'Administrativo Geral',
    isSpecial: false,
    subfolders: ['PORTARIAS_E_MEMORANDOS', 'CORRESPONDENCIAS', 'TREINAMENTOS', 'AVALIACOES_PGD']
  },
  {
    code: '02_TRANSFERENCIAS_E_PARCERIAS',
    label: 'Transferências e Parcerias',
    isSpecial: false,
    subfolders: ['CONVENIOS', 'TED', 'MROSC']
  },
  {
    code: '03_AUDITORIA_E_CONTROLE',
    label: 'Auditoria e Controle',
    isSpecial: false,
    subfolders: ['AUDITORIAS', 'PRESTACAO_DE_CONTAS', 'ACORDAOS_E_REGISTROS']
  },
  {
    code: '04_JURIDICO_E_NORMAS',
    label: 'Jurídico e Normas',
    isSpecial: false,
    subfolders: ['LEIS_E_DECRETOS', 'PARECERES']
  },
  {
    code: '05_FINANCEIRO_E_ORCAMENTO',
    label: 'Financeiro e Orçamento',
    isSpecial: false,
    subfolders: ['PLANILHAS', 'COMPROVANTES']
  },
  {
    code: '06_PROJETOS_E_PLANEJAMENTO',
    label: 'Projetos e Planejamento',
    isSpecial: false,
    subfolders: ['ESTUDOS', 'SISTEMAS']
  },
  {
    code: '07_GESTAO_INSTITUCIONAL_MGI',
    label: 'Gestão Institucional (MGI)',
    isSpecial: false,
    subfolders: ['VIAGENS', 'DEFESO', 'INTERNALIZACOES', 'ORGANIZACAO_SHAREPOINT']
  },
  {
    code: '08_COMUNICACAO_E_MATERIAL',
    label: 'Comunicação e Material',
    isSpecial: false,
    subfolders: ['VIDEOS_E_FLIPBOOKS', 'IMAGENS_VIDEOCONFERENCIA', 'MATERIAL_INSTITUCIONAL']
  },
  {
    code: '99_ARQUIVO_HISTORICO',
    label: 'Arquivo Histórico',
    isSpecial: true,
    subfolders: []
  }
]

export function findCategoryByCode(code: string): CategoryDefinition | undefined {
  return CATEGORY_TAXONOMY.find((category) => category.code === code)
}

export function listAllCategoryPaths(): string[] {
  const paths: string[] = []
  for (const category of CATEGORY_TAXONOMY) {
    paths.push(category.code)
    for (const subfolder of category.subfolders) {
      paths.push(`${category.code}/${subfolder}`)
    }
  }
  return paths
}
