# Migrador de Documentos

Aplicativo desktop (Electron + React + SQLite) para automatizar a migração e governança de documentos locais para a taxonomia MARCELO_FERNANDES, com auditoria, integridade de arquivos e controle total do usuário.

## Funcionalidades

- **Estrutura (RF1-4):** criação e validação automática das 8 categorias + arquivo histórico.
- **Escaneamento e classificação (RF5-9):** varredura em worker threads com hash SHA256, sugestão automática de categoria e verificação de colisão de nomes.
- **Renomeação (RF10-14):** máscara `AAAA_PROCESSO_TEMA_TIPO_VX.ext` com sugestões automáticas (ano, tipo, tema, processo) e versionamento automático.
- **Migração e integridade (RF15-19):** backup via hardlink, movimentação em lote, validação de hash pós-migração com reversão automática e rollback de lote.
- **Arquivo histórico (RF21-24):** organização automática em subpastas anuais e geração de índice de inventário.
- **Auditoria (RF25/29/32):** log append-only, autorização explícita obrigatória antes de qualquer escrita, exportação de log em CSV.

## Desenvolvimento

```bash
npm install
npm run dev          # roda o app em modo desenvolvimento
npm run build        # build de produção
npm run build:win    # gera o instalador Windows (.exe)
npm run typecheck
npm run lint
```

## Stack

Electron, React 19, TypeScript, Vite (via `electron-vite`), `better-sqlite3`, Zustand, `react-window`.
