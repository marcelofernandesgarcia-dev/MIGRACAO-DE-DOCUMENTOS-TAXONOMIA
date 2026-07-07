const LAST_UPDATED = '2026-07-07'
const SYSTEM_VERSION = '0.1.0'

function DocumentationView(): React.JSX.Element {
  return (
    <section className="wizard-step doc-view">
      <div className="doc-header">
        <h2>Documentação do Sistema</h2>
        <p className="doc-meta">
          Versão {SYSTEM_VERSION} — última atualização em {LAST_UPDATED}. Este material é
          atualizado conforme o sistema evolui.
        </p>
      </div>

      <div className="doc-section">
        <h3>1. Visão Geral</h3>
        <p>
          O <strong>Migrador de Documentos</strong> automatiza a migração de arquivos locais
          dispersos para a taxonomia padronizada <strong>MARCELO_FERNANDES</strong>, substituindo o
          processo manual de copiar e colar por um fluxo guiado, íntegro e auditável. O sistema
          organiza documentos em 8 categorias principais (Administrativo, Transferências e
          Parcerias, Auditoria e Controle, Jurídico e Normas, Financeiro e Orçamento, Projetos e
          Planejamento, Gestão Institucional/MGI, Comunicação e Material) mais uma categoria
          especial de Arquivo Histórico, renomeando cada arquivo segundo a máscara{' '}
          <code>AAAA_PROCESSO_TEMA_TIPO_VX.ext</code>.
        </p>
        <p>
          Opera inteiramente em ambiente Windows, com armazenamento local, sob o princípio do{' '}
          <strong>Controle Total do Usuário</strong>: nenhuma escrita, renomeação ou exclusão
          ocorre sem confirmação explícita.
        </p>
      </div>

      <div className="doc-section">
        <h3>2. Processo de Execução</h3>
        <p>O fluxo é conduzido por um assistente (wizard) de 5 passos:</p>
        <ol className="doc-steps">
          <li>
            <strong>Origem:</strong> o usuário define a pasta raiz onde a estrutura de categorias
            será criada e validada.
          </li>
          <li>
            <strong>Seleção:</strong> o sistema escaneia a pasta de origem em segundo plano (worker
            threads), calcula o hash SHA256 de cada arquivo e sugere automaticamente uma categoria
            de destino (por extensão, palavra-chave ou tempo de inatividade). O usuário revisa e
            marca o que deseja migrar.
          </li>
          <li>
            <strong>Renomeação:</strong> o sistema pré-preenche Ano, Tipo e Tema automaticamente a
            partir do arquivo e da pasta de origem; o usuário ajusta o que for necessário (Processo
            costuma exigir preenchimento manual) e resolve a versão final (V1, V2...) de cada nome.
          </li>
          <li>
            <strong>Confirmação:</strong> o sistema verifica espaço em disco e nomes de caminho
            antes de qualquer escrita, e exige autorização explícita do usuário (com registro de
            quem autorizou) antes de prosseguir.
          </li>
          <li>
            <strong>Execução:</strong> o lote é migrado em segundo plano com backup, movimentação e
            verificação de integridade; ao final, um relatório mostra o total migrado e permite
            reverter o lote em caso de erro.
          </li>
        </ol>
        <p>
          Arquivos inativos há mais de 2 anos são automaticamente direcionados para o{' '}
          <strong>Arquivo Histórico</strong>, organizados em subpastas por ano, com um índice em
          texto gerado ao final da migração.
        </p>
      </div>

      <div className="doc-section">
        <h3>3. Níveis de Segurança Aplicados</h3>
        <ul className="doc-security-list">
          <li>
            <strong>Autorização explícita obrigatória:</strong> nenhuma escrita ocorre sem
            confirmação ativa do usuário no Passo 4; o usuário do sistema operacional responsável é
            sempre registrado (nunca confiado a partir do que a tela envia).
          </li>
          <li>
            <strong>Backup antes de qualquer movimentação:</strong> cada arquivo é copiado (via
            hardlink quando possível, sem custo de espaço em disco) antes de ser movido.
          </li>
          <li>
            <strong>Verificação de integridade por hash SHA256:</strong> após mover um arquivo, o
            sistema recalcula o hash no destino e compara com o hash calculado na origem; se
            divergirem, o arquivo é revertido automaticamente e sinalizado como erro.
          </li>
          <li>
            <strong>Rollback de lote:</strong> em caso de erro sistêmico, o usuário pode reverter
            todos os arquivos já migrados de um lote, restaurando-os à pasta de origem.
          </li>
          <li>
            <strong>Log de auditoria append-only:</strong> todo evento relevante (criação de
            estrutura, migração, erro, rollback, autorização) é registrado em um log que não pode
            ser alterado nem apagado — reforçado tanto na camada de código quanto por regras no
            próprio banco de dados.
          </li>
          <li>
            <strong>Verificação de espaço em disco e de nomes:</strong> antes de iniciar a
            migração, o sistema confirma que há espaço suficiente e que nenhum caminho de destino
            ultrapassa o limite de 260 caracteres do Windows.
          </li>
          <li>
            <strong>Proteção contra pastas de projeto de código:</strong> pastas como{' '}
            <code>node_modules</code> e <code>.git</code> são automaticamente ignoradas no
            escaneamento, evitando processar centenas de milhares de arquivos que nunca são
            documentos de trabalho.
          </li>
          <li>
            <strong>Tratamento de arquivos bloqueados:</strong> se um arquivo estiver aberto em
            outro programa, apenas aquele item é sinalizado com erro — o restante do lote continua
            normalmente.
          </li>
        </ul>
      </div>

      <div className="doc-section">
        <h3>4. Planejamento e Avaliação</h3>
        <p>
          O sistema foi construído em fases incrementais, cada uma validada antes de avançar para a
          seguinte:
        </p>
        <ol className="doc-steps">
          <li>Fase 0 — Base técnica: Electron, banco de dados local e triggers de auditoria.</li>
          <li>Fase 1 — Criação e validação da estrutura de categorias.</li>
          <li>Fase 2 — Escaneamento e classificação automática de arquivos.</li>
          <li>Fase 3 — Renomeação assistida por sugestões automáticas.</li>
          <li>Fase 4 — Migração com backup, verificação de integridade e rollback.</li>
          <li>Fase 5 — Arquivo histórico e geração de inventário.</li>
          <li>Fase 6 — Dashboard, log de auditoria exportável e empacotamento do instalador.</li>
        </ol>
        <p>
          Cada módulo foi validado com testes automatizados que exercitam o código real (não
          simulações) contra arquivos e bancos de dados de teste, cobrindo os cenários de sucesso,
          erro (arquivo bloqueado, hash divergente) e reversão. A avaliação contínua do sistema
          também considera o retorno de uso real, com correções aplicadas conforme problemas são
          identificados durante o uso.
        </p>
      </div>

      <div className="doc-section">
        <h3>5. Resultado Esperado</h3>
        <ul className="doc-security-list">
          <li>Eliminação do erro humano e da desorganização do processo manual de migração.</li>
          <li>
            Padronização de nomes e estrutura de pastas, facilitando localização futura de
            documentos.
          </li>
          <li>Rastreabilidade completa de quem migrou o quê e quando, via log de auditoria.</li>
          <li>
            Redução significativa do tempo gasto organizando documentos manualmente, especialmente
            em lotes grandes.
          </li>
          <li>
            Conformidade com boas práticas de governança documental para um órgão público,
            incluindo preservação de arquivos históricos com inventário rastreável.
          </li>
          <li>
            Confiança na integridade dos arquivos migrados, com verificação de hash e capacidade de
            reversão em caso de qualquer problema.
          </li>
        </ul>
      </div>

      <div className="doc-section doc-footer">
        <h3>Histórico de atualizações deste documento</h3>
        <ul>
          <li>
            <strong>{LAST_UPDATED}</strong> — versão inicial da documentação, cobrindo as 6 fases
            implementadas (estrutura, escaneamento, renomeação, migração, arquivo histórico e
            auditoria).
          </li>
        </ul>
      </div>
    </section>
  )
}

export default DocumentationView
