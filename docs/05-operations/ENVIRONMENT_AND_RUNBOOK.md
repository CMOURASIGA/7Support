# 7Support - Environment and Runbook

## Variáveis esperadas

### Supabase

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

### Atena / AI Router

- ATENA_AI_MODE
- ATENA_PRIMARY_PROVIDER
- ATENA_PRIMARY_MODEL
- ATENA_FALLBACK_PROVIDER
- ATENA_FALLBACK_MODEL
- OPENROUTER_API_KEY
- OPENAI_API_KEY
- ATENA_TIMEOUT_MS
- ATENA_MAX_RETRIES

### Gmail

- GMAIL_CLIENT_ID
- GMAIL_CLIENT_SECRET
- GMAIL_REFRESH_TOKEN ou credencial equivalente aprovada
- SUPPORT_OPERATIONAL_EMAIL

Nenhum secret deve usar prefixo NEXT_PUBLIC.

## Falha Gmail

Comportamento:
- ticket permanece válido;
- notification fica FAILED/PENDING_RETRY;
- registrar erro sanitizado;
- aplicar retry limitado;
- alertar operação se exceder limite.

## Falha OpenRouter

- registrar erro;
- aplicar retry transitório quando apropriado;
- no modo AUTO tentar OpenAI conforme política;
- registrar fallback_reason.

## Falha OpenAI

- registrar erro;
- não afetar Ticket Core;
- Atena informa indisponibilidade temporária;
- permitir abertura manual de chamado.

## Falha de ambos providers

- Atena fica indisponível;
- tickets continuam funcionando;
- não bloquear suporte humano.

## Modelo OpenRouter deixa de ser gratuito

- detectar por erro/configuração/monitoramento;
- marcar modelo como não homologado ou indisponível;
- não insistir indefinidamente;
- selecionar outro modelo homologado por configuração;
- usar OpenAI fallback quando necessário.

## Falha 7Service / identidade

- sessões válidas existentes seguem política definida;
- novas decisões críticas devem respeitar validade do contexto/cache;
- não inventar entitlement;
- registrar indisponibilidade;
- não corromper histórico local.

## Fila de notificações acumulada

Verificar:
- provider;
- credenciais;
- rate limit;
- worker;
- retry count;
- erros recorrentes.

Nunca resolver apagando notificações sem registro.

## Supabase indisponível

- não confirmar operação não persistida;
- preservar conteúdo digitado quando possível;
- apresentar erro recuperável;
- evitar duplicação no retry via idempotência.
