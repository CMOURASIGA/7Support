# SPEC 07 - Atena visual e Human Validation local

**Status:** READY FOR HUMAN VALIDATION. Núcleo aprovado em `3f09971b0b027f73a1ffd8b8eab9dffc026e8d8e`.
**Branch:** `feat/spec-07-atena-ai-router-foundation`.
**Rota:** `/atena`.

## Recorte

A página segue o shell do 7Support alinhado ao 7Commander: sidebar, produto autorizado, lista privada, histórico, composer, resposta completa, fontes em drawer, retry manual, arquivamento, loading, empty, error, toasts, tooltips e responsividade.

A UI chama `AtenaService`. A configuração de demonstração passa por `localAtenaDemoService`, que exige ADMIN. Nenhum componente acessa LocalStorage ou provider diretamente. O preset é efêmero nesta aba e retorna a sucesso quando a Atena é aberta por CLIENT ou SUPPORT. O núcleo mantém autorização, idempotência e persistência.

CLIENT e SUPPORT não recebem diagnóstico, policy, provider, fallback, tokens ou controles de simulação. A fonte exibe título, versão e trecho; o drawer abre somente após `getAuthorizedCitation` revalidar a autorização e não aponta para superfície administrativa.

## Cenários ADMIN de demonstração local

| Controle | Resultado esperado |
|---|---|
| Primário com sucesso | Resposta extrativa e citação, sem fallback. |
| Falha primária, fallback com sucesso | Resposta e diagnóstico `FALLBACK_SUCCEEDED`. |
| Falha total | Mensagem USER preservada, sem ASSISTANT, retry manual. |
| Rate limit | Fallback com motivo `RATE_LIMIT`. |
| Resposta vazia | Fallback com motivo `EMPTY_RESPONSE`. |
| Resposta inválida | Fallback com motivo `INVALID_RESPONSE`. |
| Latência simulada | Resposta completa após atraso local. |

Selecione o cenário antes de perguntar sobre conhecimento publicado. Sem base suficiente, o núcleo responde de forma neutra e não chama provider. Na falha total, altere para sucesso e use o retry da mesma mensagem.

## Roteiro de Human Validation

### CLIENT Alpha

1. Entrar como `cliente.alpha@demo.7support.local` e abrir Atena na sidebar.
2. Confirmar apenas 7Commander no seletor e iniciar conversa.
3. Perguntar `Como acompanhar um projeto?`. Conferir resposta, fonte, versão 2 e trecho.
4. Abrir fonte no drawer, atualizar a página e selecionar a conversa. Confirmar persistência.
5. Perguntar `responsável estado anterior`. Confirmar `Não encontrei conteúdo suficiente na base autorizada para responder isso com segurança.`
6. Confirmar ausência de INTERNAL, 7Finance, diagnóstico e controles locais.

### CLIENT Beta

1. Entrar como `cliente.beta@demo.7support.local` e confirmar apenas 7Finance.
2. Perguntar `Onde consultar lançamentos?` e conferir citação correspondente.
3. Confirmar ausência de 7Commander nas conversas e nas fontes.

### SUPPORT

1. Iniciar conversa para 7Commander e perguntar `Falha conhecida na atualização de etapa`.
2. Confirmar uso da publicação INTERNAL e sua citação autorizada.
3. Confirmar ausência de diagnóstico e controles ADMIN.
4. Arquivar a conversa e confirmar saída da lista ativa, preservando histórico local.

### ADMIN

1. Testar primário com sucesso e fallback bem-sucedido.
2. Testar falha total. Confirmar USER preservado, ausência de resposta inventada e botão de retry.
3. Alterar para sucesso e usar retry. Confirmar uma única USER e uma ASSISTANT.
4. Testar rate limit, resposta vazia, inválida e latência.
5. Conferir somente policy, provider lógico, modelAlias, status, fallback, motivo, tentativas, duração, estimativas e erro sanitizado.
6. Confirmar ausência de prompt, payload bruto, stack, credenciais e conhecimento oculto.

### Regressão

1. Validar desktop, tablet e celular, incluindo sidebar móvel, composer, drawer e histórico longo.
2. Validar refresh, loading, empty, error e citações cuja publicação foi retirada.
3. Confirmar isolamento Alpha/Beta e privacidade inclusive para ADMIN.
4. Confirmar que conversa não cria ticket, notificação nem altera Knowledge Base.
5. Confirmar ausência de streaming, ações automáticas e provider externo.

## Limites

LocalStorage e providers simulados validam o fluxo funcional, sem segurança de sessão de produção ou RLS. Busca lexical conservadora pode responder de forma neutra quando não cobre os termos relevantes. OpenRouter, OpenAI, Supabase, Gmail, 7Service, cloud e SPEC 08 seguem não iniciados.

Quatro E2E novos cobrem CLIENT Alpha/Beta, SUPPORT e ADMIN. Discovery não equivale a execução; o Chromium do Playwright precisa estar instalado para executá-los. Os testes unitários do núcleo seguem como gate separado.
