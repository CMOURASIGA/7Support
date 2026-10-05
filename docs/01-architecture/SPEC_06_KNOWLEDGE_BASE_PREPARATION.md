# SPEC 06 - Knowledge Base - Preparation

**Status:** APPROVED FOR DEVELOPMENT
**Aprovação do recorte:** 05/10/2026
**Base autorizada:** `develop` após o merge da SPEC 05 pelo PR #5  
**Modo proposto:** local-first  
**Data de preparação:** 05/10/2026

## Objetivo

Preparar o recorte funcional da base de conhecimento do 7Support para validação antes do desenvolvimento.

A futura SPEC 06 deverá permitir criar, revisar, publicar, consultar, versionar e arquivar conteúdo confiável por produto e visibilidade. Nesta preparação não há código funcional, Atena, embeddings, ingestão automática, Supabase ou serviço externo.

## Princípios obrigatórios

- conteúdo é administrado dentro do 7Support;
- componentes React não acessam `LocalStorage`;
- UI não conhece detalhes de persistência;
- regras de workflow, visibilidade, versionamento e checksum ficam no domínio;
- IDs lógicos permanecem estáveis entre versões;
- conteúdo publicado não é alterado silenciosamente;
- CLIENT nunca consulta conteúdo `INTERNAL`;
- Atena, quando implementada em SPEC futura, poderá consumir somente versões `PUBLISHED`;
- nenhuma informação real, secret ou dado pessoal deve ser usado no modo local.

## Arquitetura proposta

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

Contratos futuros de busca semântica, indexação e embeddings não serão ativados nesta SPEC. A busca inicial será determinística e local.

## Perfis e permissões propostas

### ADMIN

- listar todos os conteúdos e versões;
- criar conteúdo;
- editar somente versão em `DRAFT`;
- enviar para revisão;
- devolver revisão para rascunho;
- publicar;
- criar nova versão de conteúdo publicado;
- arquivar;
- consultar histórico e auditoria funcional.

### SUPPORT

- consultar somente conteúdo `PUBLISHED`;
- consultar visibilidade `CLIENT`, `INTERNAL` e `BOTH`;
- filtrar por produto, categoria e termo;
- não criar, editar, publicar ou arquivar.

### CLIENT

- consultar somente conteúdo `PUBLISHED`;
- consultar apenas visibilidade `CLIENT` ou `BOTH`;
- consultar somente produtos autorizados à sua identidade;
- não consultar versões anteriores, rascunhos ou conteúdo interno;
- não criar, editar, publicar ou arquivar.

## Superfícies propostas

### Catálogo autorizado

Rota única proposta:

`/knowledge`

O conteúdo e as ações serão projetados conforme o perfil autenticado.

Elementos:

- busca textual;
- filtros por produto, categoria, status e visibilidade conforme permissão;
- cards ou tabela com densidade equivalente ao 7Commander;
- labels para status, visibilidade e versão;
- drawer para consulta rápida;
- página de leitura completa quando o conteúdo exigir mais espaço;
- loading, empty, error e forbidden;
- responsividade.

### Administração

Rotas propostas:

- `/admin/knowledge/new`;
- `/admin/knowledge/[sourceId]`.

Elementos:

- formulário de conteúdo;
- histórico de versões;
- ações por ícone e tooltip;
- confirmação para publicar e arquivar;
- indicação clara de versão editável e versão publicada;
- feedback por toast.

O drawer deve ser usado para resumo, metadata e consulta rápida. Edição extensa deve permanecer em página dedicada.

## Modelo local preliminar

### KnowledgeSource

- `id`, identidade lógica estável;
- `productId`;
- `title`;
- `category`;
- `sourceType`, inicialmente `MANUAL`;
- `currentPublishedVersionId`, opcional;
- `createdBy`;
- `createdAt`;
- `updatedAt`.

### KnowledgeVersion

- `id`;
- `sourceId`;
- `version`;
- `title`;
- `category`;
- `content`;
- `visibility`, `CLIENT | INTERNAL | BOTH`;
- `status`, `DRAFT | IN_REVIEW | PUBLISHED | ARCHIVED`;
- `checksum`;
- `authorUserId`;
- `reviewerUserId`, opcional;
- `createdAt`;
- `updatedAt`;
- `submittedForReviewAt`, opcional;
- `publishedAt`, opcional;
- `archivedAt`, opcional.

### KnowledgeAuditEvent

- `id`;
- `sourceId`;
- `versionId`;
- `actorUserId`;
- `eventType`;
- `createdAt`;
- `description`.

Eventos candidatos:

- `CREATED`;
- `UPDATED`;
- `SUBMITTED_FOR_REVIEW`;
- `RETURNED_TO_DRAFT`;
- `PUBLISHED`;
- `NEW_VERSION_CREATED`;
- `ARCHIVED`.

## Workflow proposto

```text
DRAFT
  -> IN_REVIEW
    -> PUBLISHED
    -> DRAFT, quando devolvido para ajuste

PUBLISHED
  -> nova versão DRAFT
  -> ARCHIVED

ARCHIVED
  -> nova versão DRAFT, se o conteúdo precisar ser retomado
```

Regras:

- somente `DRAFT` pode ser editado;
- `IN_REVIEW` fica bloqueado para edição até devolução;
- publicação exige título, produto, categoria, conteúdo, visibilidade e checksum válidos;
- versão publicada é imutável;
- alteração de conteúdo publicado cria nova versão;
- apenas uma versão publicada ativa por `sourceId`;
- arquivamento remove o conteúdo das consultas autorizadas futuras;
- histórico preserva versões anteriores;
- números de versão são crescentes e não reutilizados.

## Checksum e idempotência

O checksum deverá ser calculado no serviço sobre conteúdo normalizado:

```text
productId + title + category + visibility + content
```

Objetivos:

- detectar publicação sem alteração material;
- impedir versões duplicadas acidentais;
- preparar futura indexação;
- permitir comparação entre versões.

A tecnologia concreta do hash deve permanecer substituível. O modo local não deve depender de serviço externo.

## Busca local proposta

A busca inicial deverá considerar:

- título;
- categoria;
- conteúdo;
- produto.

Regras:

- comparação sem diferenciação de maiúsculas/minúsculas;
- normalização de acentos;
- filtros sempre aplicados antes da projeção para a UI;
- CLIENT só pesquisa dentro do conjunto já autorizado;
- nenhum resultado oculto pode ser inferido por contagem, filtro ou mensagem de erro.

Busca semântica, chunks, vetores e embeddings ficam preparados apenas por contrato e documentação.

## Dados fictícios propostos

Criar um conjunto pequeno e claramente fictício para Human Validation:

- artigo CLIENT/BOTH do 7Commander;
- artigo INTERNAL do 7Commander;
- artigo CLIENT/BOTH do 7Finance;
- conteúdo em `DRAFT`;
- conteúdo em `IN_REVIEW`;
- conteúdo `PUBLISHED`;
- conteúdo `ARCHIVED`;
- pelo menos um histórico com duas versões.

Os textos não devem representar política comercial definitiva nem conter dados reais.

## Contratos candidatos

### KnowledgeRepository

- `list(context, filters)`;
- `findById(context, sourceId)`;
- `saveSource(context, source)`;
- `saveVersion(context, version)`;
- `transact(update)`;
- `subscribe(listener)`.

### KnowledgeService

- `listAuthorized(filters)`;
- `getAuthorized(sourceId)`;
- `create(input)`;
- `updateDraft(versionId, input)`;
- `submitForReview(versionId)`;
- `returnToDraft(versionId)`;
- `publish(versionId)`;
- `createNewVersion(sourceId)`;
- `archive(versionId)`;
- `history(sourceId)`.

Os nomes e assinaturas são preparatórios e devem ser refinados antes do primeiro commit funcional.

## Testes mínimos propostos

1. ADMIN cria conteúdo em `DRAFT`;
2. DRAFT pode ser editado;
3. envio altera para `IN_REVIEW`;
4. IN_REVIEW não pode ser editado;
5. publicação cria versão imutável;
6. nova alteração cria nova versão DRAFT;
7. checksum bloqueia duplicidade sem alteração;
8. arquivamento remove conteúdo das consultas correntes;
9. CLIENT visualiza somente `PUBLISHED` com visibilidade `CLIENT` ou `BOTH`;
10. CLIENT nunca visualiza `INTERNAL`;
11. CLIENT só consulta produto autorizado;
12. SUPPORT consulta conteúdo publicado compatível;
13. busca não revela conteúdo não autorizado;
14. histórico preserva versões;
15. refresh preserva dados locais;
16. ações não autorizadas retornam forbidden;
17. Alpha/Beta mantêm seus contextos de produto autorizados;
18. nenhum contrato chama Atena, provider de IA ou embeddings.

## Roteiro proposto de Human Validation

### ADMIN

1. Criar conteúdo fictício.
2. Salvar e editar DRAFT.
3. Enviar para revisão.
4. Validar bloqueio de edição.
5. Devolver para ajuste.
6. Publicar.
7. Criar nova versão.
8. Confirmar preservação da versão anterior.
9. Arquivar.
10. Validar busca, filtros, labels, drawers e histórico.

### SUPPORT

1. Consultar conteúdo publicado.
2. Validar conteúdo CLIENT, INTERNAL e BOTH.
3. Confirmar ausência de ações administrativas.
4. Validar pesquisa e navegação.

### CLIENT

1. Entrar como Alpha e consultar somente produtos autorizados.
2. Confirmar ausência de DRAFT, IN_REVIEW e ARCHIVED.
3. Confirmar ausência total de INTERNAL.
4. Entrar como Beta e validar o contexto de produto correspondente.
5. Validar desktop, tablet e celular.

## Decisões necessárias antes de iniciar código

1. O fluxo `IN_REVIEW` será obrigatório antes de publicar?
2. O revisor precisa ser diferente do autor no modo local?
3. SUPPORT poderá consultar todas as visibilidades publicadas, como proposto?
4. A categoria será texto controlado ou catálogo configurável?
5. A busca CLIENT ficará disponível já na SPEC 06?
6. A reativação de conteúdo arquivado sempre criará nova versão?
7. O conjunto fictício proposto está aprovado?
8. As rotas propostas estão aprovadas?

## Explicitamente fora deste recorte

- código funcional da SPEC 06;
- Atena e AI Router;
- chat;
- retrieval semântico;
- embeddings e banco vetorial;
- geração automática de conteúdo;
- importação de arquivos ou URLs;
- Supabase e RLS real;
- Edge Functions;
- Gmail e Google Cloud;
- 7Service;
- SLA;
- dados reais.

## Gate de início

A SPEC 06 permanece **NOT STARTED**. O desenvolvimento só pode começar após aprovação deste recorte, das decisões pendentes e dos critérios de Human Validation.
