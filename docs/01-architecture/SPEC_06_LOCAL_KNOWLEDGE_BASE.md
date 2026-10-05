# SPEC 06 - Knowledge Base local-first

**Status:** READY FOR HUMAN VALIDATION  
**Branch:** `feat/spec-06-knowledge-base`  
**Base:** `develop` em `2cf2020a17b44222b35c4b19ca11bb8283da9583`

## Escopo implementado

Base de conhecimento local com catálogo controlado, workflow editorial, versionamento, checksum, busca determinística e projeção autorizada por perfil e produto.

Não há Atena, AI Router, embeddings, chunks, vetores, busca semântica, importação, Supabase ou serviço externo.

## Arquitetura

```text
UI
  -> KnowledgeService
    -> KnowledgeRepository
      -> LocalKnowledgeRepository
        -> LocalStorage

KnowledgeService
  -> ChecksumService
    -> LocalChecksumService
```

Os componentes React não acessam `LocalStorage`. Workflow, autorização, checksum, busca e projeção ficam no serviço de domínio.

## Armazenamento local

- chave: `7support.spec06.knowledge.v1`;
- schema versionado por `KnowledgeDatabase.version = 1`;
- fontes, versões e eventos de auditoria são persistidos juntos;
- gravações locais são serializadas;
- eventos locais e `storage` atualizam a UI;
- IDs de fonte e versão permanecem estáveis.

LocalStorage serve apenas à validação funcional. Não equivale a RLS, autenticação segura ou isolamento de banco.

## Modelo implementado

### KnowledgeSource

- identidade lógica estável;
- produto;
- versão publicada atual;
- último número de versão;
- criador e datas.

### KnowledgeVersion

- identidade própria;
- referência à fonte;
- número crescente;
- título, categoria, conteúdo e visibilidade;
- status e checksum;
- autor e revisor separados;
- datas de criação, revisão, publicação e arquivamento.

### KnowledgeAuditEvent

Registra criação, alteração, envio para revisão, devolução, publicação, nova versão e arquivamento.

## Catálogo de categorias

| Código | Label |
|---|---|
| `GUIDE` | Guia |
| `FAQ` | Perguntas frequentes |
| `ACCESS` | Acesso |
| `CONFIGURATION` | Configuração |
| `PROCESS` | Processo |
| `KNOWN_ERROR` | Erro conhecido |
| `INTERNAL_POLICY` | Política interna |

Categoria fora do catálogo é rejeitada pelo serviço.

## Workflow

```text
DRAFT -> IN_REVIEW -> PUBLISHED
                   -> DRAFT

PUBLISHED -> NEW VERSION / DRAFT
PUBLISHED -> ARCHIVED
ARCHIVED  -> NEW VERSION / DRAFT
```

Regras:

- somente `DRAFT` pode ser editado;
- `IN_REVIEW` é obrigatório para publicar;
- `IN_REVIEW` fica bloqueado para edição;
- `PUBLISHED` e `ARCHIVED` são imutáveis;
- conteúdo arquivado não volta diretamente a publicado;
- retomada exige nova versão materialmente diferente em `DRAFT`;
- apenas uma versão fica publicada por fonte;
- nova publicação arquiva a versão publicada anterior;
- autor e revisor ficam em campos separados;
- no modo local, a mesma identidade ADMIN pode ocupar ambos os campos.

## Checksum

O `LocalChecksumService` usa FNV-1a determinístico sobre:

```text
productId
+ title normalizado
+ category
+ visibility
+ content normalizado
```

Normalização remove diferença de caixa, acentos e espaços repetidos. Nova versão materialmente idêntica é bloqueada antes da criação e novamente antes da publicação.

## Autorização

### CLIENT

- somente versão publicada atual;
- apenas visibilidade `CLIENT` ou `BOTH`;
- somente produtos autorizados;
- nenhuma versão antiga ou metadata administrativa;
- tentativa de acesso oculto retorna `NOT_FOUND` genérico.

### SUPPORT

- somente versão publicada atual;
- visibilidades `CLIENT`, `INTERNAL` e `BOTH`;
- sem ações de criação, edição, publicação ou arquivamento.

### ADMIN

- catálogo completo;
- criação e edição de rascunho;
- revisão, publicação, versionamento e arquivamento;
- histórico e auditoria funcional.

## Busca local

Considera título, categoria, conteúdo e produto. A consulta normaliza caixa, acentos e espaços.

A autorização e a seleção da versão publicada atual ocorrem antes da busca e antes da contagem. A resposta CLIENT não possui total oculto, filtros administrativos ou indicação da existência de conteúdo não autorizado.

## UI

- catálogo em `/knowledge` para todos os perfis;
- criação em `/admin/knowledge/new`;
- gestão em `/admin/knowledge/[sourceId]`;
- item no menu lateral e títulos no header;
- busca e filtros conforme permissão;
- cards, labels, ícones e tooltips;
- drawer de leitura rápida;
- formulários administrativos;
- confirmações de publicação e arquivamento;
- histórico de versões e auditoria;
- loading, empty, error e forbidden;
- layout responsivo baseado na fundação visual do 7Commander.

## Dados fictícios

- guia 7Commander com duas versões;
- erro conhecido interno do 7Commander;
- FAQ CLIENT do 7Finance;
- rascunho de acesso;
- configuração em revisão;
- processo financeiro arquivado.

Os textos são fictícios e não definem política comercial.

## Testes

Os 24 cenários específicos cobrem os 18 requisitos da preparação e as seis decisões adicionais:

- criação, edição e revisão;
- bloqueio de edição em revisão;
- publicação e imutabilidade;
- versionamento e histórico;
- checksum e normalização;
- arquivamento;
- projeções CLIENT, SUPPORT e ADMIN;
- produtos autorizados;
- busca sem inferência de conteúdo oculto;
- persistência após refresh;
- forbidden;
- Alpha/Beta;
- autor igual ao revisor no modo local;
- publicação sem revisão bloqueada;
- categoria inválida bloqueada;
- ausência de Atena, embeddings e providers de IA.

## Roteiro de Human Validation

### ADMIN

1. Entrar como ADMIN e abrir Base de conhecimento.
2. Confirmar os seis conteúdos fictícios e seus estados.
3. Criar conteúdo e validar status Rascunho.
4. Editar e salvar o rascunho.
5. Enviar para revisão e confirmar bloqueio de edição.
6. Devolver para rascunho, editar e enviar novamente.
7. Publicar e conferir autor, revisor, checksum e data.
8. Criar nova versão com mudança material.
9. Tentar salvar versão idêntica e confirmar bloqueio.
10. Publicar nova versão e confirmar a anterior arquivada no histórico.
11. Arquivar a versão atual.
12. Confirmar ausência de ação direta para republicar.
13. Criar nova versão a partir do arquivado.
14. Validar busca, filtros, drawer, labels e auditoria.

### SUPPORT

1. Entrar como SUPPORT.
2. Confirmar conteúdos publicados CLIENT, INTERNAL e BOTH.
3. Confirmar ausência de DRAFT, IN_REVIEW e ARCHIVED.
4. Confirmar ausência de ações administrativas.
5. Validar busca por título, conteúdo, categoria e produto.

### CLIENT Alpha

1. Confirmar somente conteúdo publicado do 7Commander.
2. Confirmar ausência do conteúdo INTERNAL.
3. Buscar usando caixa e acentos diferentes.
4. Buscar termo existente somente em conteúdo oculto e confirmar resultado vazio genérico.
5. Abrir drawer e validar conteúdo sem metadata administrativa.

### CLIENT Beta

1. Confirmar somente conteúdo publicado do 7Finance.
2. Confirmar ausência de conteúdo 7Commander.
3. Validar pesquisa e drawer.

### Regressão

1. Atualizar a página e confirmar persistência local.
2. Validar desktop, tablet e celular.
3. Confirmar `/admin/knowledge/*` como forbidden para CLIENT e SUPPORT.

## Fora do escopo

Atena, AI Router, embeddings, chunking, vector store, semantic search, PDF, URL, geração por IA, Supabase, RLS real, 7Service, Gmail e SLA.
