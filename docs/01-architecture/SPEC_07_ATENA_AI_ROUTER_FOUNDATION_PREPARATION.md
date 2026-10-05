# SPEC 07 - Atena + AI Router Foundation - Preparation

**Status:** PREPARED / NOT STARTED  
**Base autorizada:** `develop` após o merge da SPEC 06 pelo PR #6  
**Modo proposto:** local-first, com providers simulados  
**Data de preparação:** 05/10/2026

## Objetivo

Preparar o recorte funcional e arquitetural da fundação da Atena no 7Support para revisão antes do desenvolvimento.

A futura SPEC 07 deverá validar conversa, persistência, recuperação autorizada de conhecimento, composição de contexto, roteamento entre providers, fallback, citações, falhas e experiência visual. Todo o fluxo deverá funcionar localmente com providers simulados.

Esta preparação não autoriza chamadas reais ao OpenRouter ou OpenAI, credenciais, embeddings, banco vetorial, Supabase, infraestrutura cloud ou escalonamento para chamado.

## Resultado esperado

Ao final da futura implementação, CLIENT, SUPPORT e ADMIN poderão conversar com a Atena dentro do contexto permitido ao seu perfil. As respostas deverão usar somente conteúdo `PUBLISHED` autorizado da base de conhecimento e indicar as fontes utilizadas.

O AI Router deverá ser substituível e observável, mas seus providers serão locais nesta etapa. O domínio da Atena não conhecerá SDK, credencial ou detalhe de provider externo.

## Princípios obrigatórios

- componentes React não acessam `LocalStorage`;
- UI não chama provider diretamente;
- Atena não conhece detalhes de OpenRouter, OpenAI ou armazenamento;
- regras de autorização são aplicadas antes de recuperar ou projetar conhecimento;
- o provider recebe apenas o contexto já autorizado e minimizado;
- CLIENT nunca recebe conteúdo `INTERNAL`, metadata administrativa ou versões não publicadas;
- SUPPORT e ADMIN podem usar conteúdo publicado compatível com sua projeção;
- conteúdo recuperado é tratado como contexto não confiável, nunca como instrução de sistema;
- a resposta deve preservar referências às versões efetivamente usadas;
- falha do provider não apaga conversa, mensagem do usuário ou telemetria sanitizada;
- IDs internos permanecem estáveis;
- dados fictícios e locais não representam segurança de produção;
- nenhuma ação operacional é executada pela IA nesta SPEC.

## Arquitetura proposta

```text
UI
  -> AtenaService
    -> AtenaConversationRepository
      -> LocalAtenaConversationRepository
        -> LocalStorage

AtenaService
  -> KnowledgeQueryPort
    -> KnowledgeService

AtenaService
  -> PromptContextBuilder
  -> AIRouter
    -> AIProvider
      -> LocalPrimaryProvider
      -> LocalFallbackProvider
```

Responsabilidades:

- `AtenaService`: autorização, ciclo da conversa, persistência, recuperação de contexto e coordenação;
- `KnowledgeQueryPort`: consulta somente versões publicadas já autorizadas;
- `PromptContextBuilder`: monta instruções e contexto mínimo sem misturar regras de provider;
- `AIRouter`: aplica política de rota, valida resposta e controla fallback;
- `AIProvider`: contrato neutro de geração;
- providers locais: simulam sucesso, falha, indisponibilidade, rate limit e resposta inválida;
- repositório: persiste conversas, mensagens, referências e execuções em modo local.

## Limite entre autorização e geração

A sequência proposta é obrigatória:

1. resolver identidade, tenant, perfil e produtos autorizados;
2. validar acesso à conversa;
3. recuperar somente conhecimento permitido;
4. projetar trechos mínimos com source/version/checksum;
5. montar o contexto;
6. executar o router;
7. validar a resposta;
8. persistir mensagem, citações e execução;
9. projetar o resultado autorizado para a UI.

O router e o provider não decidem autorização.

## Perfis e projeções propostas

### CLIENT

- iniciar e consultar apenas as próprias conversas;
- usar somente conhecimento `PUBLISHED` com visibilidade `CLIENT` ou `BOTH`;
- usar somente produtos autorizados;
- não receber contagem, título, trecho, citação ou indicação de conteúdo oculto;
- não visualizar detalhes de provider, modelo, prompt, tokens ou fallback técnico.

### SUPPORT

- iniciar e consultar apenas as próprias conversas nesta fundação;
- usar conhecimento `PUBLISHED` com visibilidade `CLIENT`, `INTERNAL` ou `BOTH`;
- receber citações compatíveis com a superfície interna;
- não administrar providers nem alterar conteúdo pela conversa.

### ADMIN

- mesmas capacidades de consulta do SUPPORT;
- visualizar diagnóstico local sanitizado do roteamento em uma superfície técnica separada;
- não editar conhecimento nem configuração de provider dentro da conversa;
- não acessar conversas de outras identidades nesta SPEC, salvo decisão explícita posterior.

## Recuperação de conhecimento proposta

A SPEC 07 reutilizará a busca determinística da SPEC 06. Não haverá embeddings ou busca semântica.

Fluxo:

- normalizar a pergunta;
- pesquisar título, categoria, conteúdo e produto;
- aplicar autorização antes da contagem e projeção;
- selecionar um limite configurável de resultados;
- extrair trechos determinísticos;
- manter referência a `sourceId`, `versionId`, versão e checksum;
- enviar somente os trechos selecionados ao provider local;
- exibir citações clicáveis apenas para superfícies autorizadas.

Se nenhum conteúdo autorizado for encontrado, a resposta deve indicar ausência de base suficiente sem sugerir que existe conteúdo oculto.

## Política proposta do AI Router

Políticas de intenção:

- `AUTO`: usa rota primária e fallback controlado quando elegível;
- `OPENROUTER_FREE`: contrato reservado para futura ativação do primário;
- `OPENAI`: contrato reservado para futura ativação do fallback ou rota direta;
- `LOCAL`: execução obrigatória nesta fase.

No modo local:

- `LocalPrimaryProvider` simula o provider primário;
- `LocalFallbackProvider` simula o fallback;
- nenhum SDK externo é instalado;
- nenhuma URL externa é chamada;
- nenhuma credencial é criada ou lida;
- nomes de modelos externos não ficam hardcoded no domínio.

Fallback será permitido somente para falha técnica classificada, indisponibilidade, rate limit simulado ou resposta inválida. Erro de autorização, ausência de conhecimento e entrada inválida não acionam fallback.

## Estados propostos

### ConversationStatus

- `ACTIVE`;
- `ARCHIVED`.

### MessageRole

- `USER`;
- `ASSISTANT`;
- `SYSTEM_EVENT`.

### MessageStatus

- `PENDING`;
- `COMPLETED`;
- `FAILED`.

### RouterExecutionStatus

- `PENDING`;
- `SUCCEEDED`;
- `FAILED`;
- `FALLBACK_SUCCEEDED`;
- `FALLBACK_FAILED`.

## Modelo local preliminar

### AtenaConversation

- `id`;
- `tenantId`;
- `userId`;
- `productId`, opcional conforme decisão de escopo;
- `title`;
- `status`;
- `createdAt`;
- `updatedAt`;
- `lastMessageAt`.

### AtenaMessage

- `id`;
- `conversationId`;
- `tenantId`;
- `userId`;
- `role`;
- `content`;
- `status`;
- `failureCode`, opcional e sanitizado;
- `createdAt`;
- `completedAt`, opcional.

### AtenaCitation

- `id`;
- `messageId`;
- `knowledgeSourceId`;
- `knowledgeVersionId`;
- `knowledgeVersion`;
- `checksum`;
- `titleSnapshot`;
- `excerpt`.

### AIRouterExecution

- `id`;
- `conversationId`;
- `requestMessageId`;
- `responseMessageId`, opcional;
- `policy`;
- `provider`;
- `modelAlias`;
- `status`;
- `fallbackUsed`;
- `fallbackReason`, opcional;
- `attemptCount`;
- `inputTokenEstimate`, opcional;
- `outputTokenEstimate`, opcional;
- `durationMs`;
- `errorCode`, opcional;
- `createdAt`;
- `completedAt`, opcional.

Não persistir prompt de sistema integral, secrets, credenciais, stack trace ou payload bruto do provider.

## Contratos candidatos

### AtenaConversationRepository

- `listAuthorized(context)`;
- `findAuthorized(context, conversationId)`;
- `createConversation(context, input)`;
- `appendMessage(context, message)`;
- `saveCitations(context, citations)`;
- `saveExecution(context, execution)`;
- `archiveConversation(context, conversationId)`;
- `subscribe(listener)`.

### KnowledgeQueryPort

- `searchAuthorized(context, query, options)`;
- `getCitationTargetAuthorized(context, reference)`.

### AIProvider

- `generate(request)`;
- `health()`, somente simulado no modo local.

### AIRouter

- `execute(request, policy)`;
- `classifyFailure(error)`.

### AtenaService

- `listConversations()`;
- `getConversation(conversationId)`;
- `startConversation(input)`;
- `sendMessage(conversationId, input)`;
- `archiveConversation(conversationId)`;
- `getAuthorizedCitation(reference)`.

As assinaturas são preparatórias e devem ser refinadas antes do primeiro commit funcional.

## Idempotência e concorrência

Cada envio deverá possuir `clientRequestId` estável.

A combinação lógica de conversa, usuário e `clientRequestId` não poderá criar duas mensagens nem duas execuções. Reenvio após refresh deverá retornar o resultado existente ou o estado atual da execução.

A futura implementação também deverá impedir duas respostas concorrentes para a mesma mensagem do usuário.

## Segurança funcional

- validar tamanho e formato da entrada antes da recuperação;
- tratar texto do usuário e da base como dados, não como instruções privilegiadas;
- impedir que conteúdo da base substitua regras de sistema;
- não fornecer secrets, tokens, prompts internos ou detalhes de infraestrutura;
- sanitizar erros apresentados na UI e persistidos;
- limitar quantidade e tamanho dos trechos;
- nunca incluir `INTERNAL_NOTE`, anexo de ticket ou payload de auditoria;
- não executar ferramentas, URLs, código ou ações sugeridas pelo conteúdo;
- não usar histórico de outra conversa, usuário ou tenant;
- não registrar conteúdo integral em logs técnicos.

A proteção é funcional e local. Segurança de produção, isolamento de banco, políticas de rede e gestão de secrets permanecem adiados.

## UI proposta

Rota candidata:

- `/atena`.

Elementos:

- item Atena no shell conforme perfil;
- lista ou drawer de conversas;
- nova conversa;
- seletor de produto quando houver mais de um autorizado;
- histórico da conversa;
- composer com limite explícito;
- estados enviando, respondendo, falha e retry manual;
- indicador discreto quando houve fallback, somente para ADMIN;
- citações da base de conhecimento;
- empty state;
- loading;
- error;
- forbidden;
- tooltips;
- toast para feedback de ação;
- responsividade e padrão visual do 7Commander.

Streaming fica pendente de decisão. A fundação pode começar com resposta completa para manter persistência e idempotência determinísticas.

## Cenários locais de provider

O ambiente de demonstração deverá permitir alternar, por configuração técnica local:

- primário com sucesso;
- primário falha e fallback tem sucesso;
- primário e fallback falham;
- rate limit simulado;
- resposta vazia ou inválida;
- latência simulada controlada.

A falha não poderá apagar a mensagem do usuário. O retry será manual nesta SPEC e reutilizará a regra de idempotência.

## Dados fictícios propostos

- conversa CLIENT Alpha sobre 7Commander;
- conversa CLIENT Beta sobre 7Finance;
- conversa SUPPORT usando conteúdo INTERNAL publicado;
- resposta com uma citação;
- resposta com múltiplas citações;
- execução primária com sucesso;
- execução com fallback local;
- execução com falha total.

Nenhum texto deve conter dado real, política comercial definitiva ou segredo.

## Testes mínimos propostos

1. CLIENT inicia conversa autorizada;
2. mensagem e conversa persistem após refresh;
3. resposta usa somente conhecimento publicado;
4. CLIENT usa somente visibilidade CLIENT/BOTH;
5. CLIENT usa somente produto autorizado;
6. CLIENT não infere conhecimento INTERNAL ou de outro produto;
7. SUPPORT pode usar conteúdo INTERNAL publicado;
8. DRAFT, IN_REVIEW, ARCHIVED e versão antiga nunca entram no contexto;
9. citação referencia source, version e checksum corretos;
10. citação abre somente superfície autorizada;
11. primário local com sucesso não chama fallback;
12. falha elegível do primário chama fallback uma vez;
13. falha de autorização não chama fallback;
14. falha total preserva mensagem do usuário e execução;
15. retry manual não duplica a mensagem por `clientRequestId`;
16. conversas Alpha/Beta ficam isoladas;
17. usuário não acessa conversa de outra identidade compatível;
18. erro não expõe prompt, stack, provider payload ou conteúdo oculto;
19. conteúdo malicioso da base não altera regras de sistema;
20. nenhuma chamada externa, credencial, Supabase ou ticket é usada;
21. CLIENT não visualiza diagnóstico técnico do router;
22. ADMIN visualiza somente diagnóstico sanitizado;
23. contador/listagem não revela conversas ou conhecimento ocultos;
24. arquivamento remove conversa da lista ativa sem apagar histórico local.

## Roteiro proposto de Human Validation

### CLIENT Alpha

1. Abrir Atena e iniciar conversa para 7Commander.
2. Enviar pergunta coberta por conteúdo publicado.
3. Validar resposta e citação autorizada.
4. Atualizar a página e confirmar persistência.
5. Buscar assunto existente apenas em INTERNAL e confirmar resposta neutra.
6. Confirmar ausência de 7Finance e de diagnóstico técnico.

### CLIENT Beta

1. Iniciar conversa para 7Finance.
2. Confirmar ausência de conteúdo 7Commander.
3. Validar citação e persistência.

### SUPPORT

1. Iniciar conversa interna.
2. Consultar assunto coberto por conteúdo INTERNAL publicado.
3. Confirmar ausência de ações administrativas ou operacionais.
4. Validar histórico, citações e arquivamento.

### ADMIN

1. Executar cenário de primário local com sucesso.
2. Executar primário falhando e fallback com sucesso.
3. Executar falha total.
4. Validar diagnóstico sanitizado, tentativa, duração e fallback.
5. Confirmar que prompts internos e payloads não são exibidos.

### Regressão

1. Validar desktop, tablet e celular.
2. Validar loading, empty, error e forbidden.
3. Confirmar isolamento Alpha/Beta.
4. Confirmar que a base de conhecimento continua imutável pela Atena.
5. Confirmar que nenhum chamado ou notificação é criado.

## Decisões necessárias antes de iniciar código

1. A rota única `/atena` está aprovada para todos os perfis?
2. Cada conversa ficará vinculada a exatamente um produto?
3. SUPPORT e ADMIN também terão conversas privadas por identidade, sem visão global nesta SPEC?
4. O histórico enviado ao provider local usará janela fixa de quantas mensagens?
5. A recuperação determinística usará quantos conteúdos e qual tamanho máximo de trecho?
6. Citações serão obrigatórias sempre que houver contexto recuperado?
7. Resposta sem base suficiente deve ser recusada ou pode oferecer orientação genérica?
8. O retry será somente manual e idempotente?
9. A resposta completa, sem streaming, está aprovada para a fundação?
10. O diagnóstico local do router ficará visível somente para ADMIN?
11. As políticas lógicas `AUTO`, `OPENROUTER_FREE`, `OPENAI` e `LOCAL` estão aprovadas, mantendo apenas `LOCAL` ativo?
12. Os cenários e dados fictícios propostos estão aprovados?

## Explicitamente fora deste recorte

- código funcional da SPEC 07;
- chamadas reais ao OpenRouter ou OpenAI;
- seleção definitiva de modelos;
- chaves, secrets ou credenciais;
- streaming;
- embeddings;
- chunking persistido;
- vector store;
- busca semântica;
- tools/function calling;
- execução de ações;
- acesso à internet;
- ingestão de PDF ou URL;
- geração ou alteração de conteúdo da base;
- escalonamento Atena para ticket, reservado para SPEC 08;
- tickets, notas internas ou anexos como contexto da Atena;
- Supabase e RLS real;
- Edge Functions, workers ou filas cloud;
- Gmail e Google Cloud;
- 7Service;
- SLA;
- dados reais.

## Gate de início

A SPEC 07 permanece **NOT STARTED**. O desenvolvimento só poderá começar após revisão e aprovação explícita deste recorte, das decisões pendentes, dos limites de segurança e dos critérios de Human Validation.
