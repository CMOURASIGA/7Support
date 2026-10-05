# SPEC 05 - Notifications — Preparation

**Status:** PREPARED / NOT STARTED  
**Base autorizada:** `develop` após o merge da SPEC 04 pelo PR #4  
**Modo:** local-first  
**Data de preparação:** 05/10/2026

## Objetivo

Preparar a implementação futura de notificações transacionais do 7Support sem iniciar código nesta etapa. A implementação deverá preservar o domínio validado nas SPECs 01–04 e permitir a substituição posterior da infraestrutura local por adaptadores cloud.

Este documento não autoriza integração com Supabase, Gmail, 7Service, Atena, Knowledge Base ou qualquer serviço externo.

## Escopo candidato para validação antes do desenvolvimento

- registrar notificações geradas por eventos de chamados;
- manter uma caixa local de entregas para demonstração e Human Validation;
- representar estados de entrega de forma explícita;
- evitar duplicidade para o mesmo evento e destinatário;
- respeitar tenant, perfil e visibilidade pública/interna;
- disponibilizar feedback operacional sem expor conteúdo interno ao CLIENT;
- preparar contratos para um provider de e-mail futuro, sem ativá-lo.

## Eventos candidatos

| Evento de domínio | Destinatário candidato | Observação |
|---|---|---|
| chamado criado | solicitante | confirmação com código público do chamado |
| chamado atribuído | responsável | contexto operacional mínimo |
| resposta pública adicionada | contraparte aplicável | nunca incluir nota ou anexo interno |
| status alterado | solicitante e/ou responsável | conforme transição e visibilidade |
| chamado resolvido | solicitante | resumo e orientação de reabertura |
| chamado reaberto | responsável | incluir motivo público permitido |

A matriz definitiva de eventos e destinatários deve ser aprovada antes da implementação. Nenhuma regra comercial permanente deve ser inferida.

## Limites de segurança funcional

- `INTERNAL_NOTE`, eventos internos e anexos internos nunca podem compor notificações para CLIENT.
- Toda consulta e gravação local deve carregar `tenantId`.
- Produtos autorizados e papéis continuam sendo avaliados pelos serviços existentes.
- Conteúdo derivado de payload de UI deve ser revalidado na camada de serviço.
- O modo local serve para validação funcional e não equivale a autenticação segura, RLS ou isolamento de banco.

## Arquitetura obrigatória

```text
UI
  -> NotificationService
    -> NotificationRepository
      -> LocalNotificationRepository
        -> LocalStorage

NotificationService
  -> DeliveryProvider
    -> LocalDeliveryProvider (somente demonstração)
```

Regras:

- componentes não acessam `LocalStorage`;
- UI não conhece detalhes de persistência ou provider;
- IDs de notificações, entregas e eventos permanecem estáveis;
- regras de elegibilidade, destinatário, conteúdo e idempotência ficam no domínio/serviço;
- repositórios tratam somente persistência;
- providers tratam somente entrega;
- contratos devem aceitar um adaptador futuro sem reescrever o domínio.

## Contratos a detalhar na implementação

### NotificationRepository

- `listByUser(context)`
- `findById(context, notificationId)`
- `save(context, notification)`
- `markAsRead(context, notificationId)`
- `existsByIdempotencyKey(context, key)`

### DeliveryProvider

- `send(message)`
- resposta normalizada com `providerMessageId`, estado e erro seguro;
- nenhuma dependência do domínio em SDK externo.

### NotificationService

- recebe eventos de domínio já persistidos;
- decide elegibilidade e destinatários;
- projeta somente dados permitidos;
- calcula chave de idempotência;
- persiste notificação e tentativa de entrega;
- expõe comandos e consultas para a UI.

Os nomes e assinaturas acima são preparatórios e devem ser refinados antes do primeiro commit funcional.

## Modelo local preliminar

### Notification

- `id`
- `tenantId`
- `userId`
- `ticketId`
- `eventId`
- `type`
- `title`
- `body`
- `status`
- `readAt`
- `createdAt`
- `idempotencyKey`

### NotificationDelivery

- `id`
- `notificationId`
- `channel`
- `provider`
- `status`
- `attemptCount`
- `lastAttemptAt`
- `deliveredAt`
- `providerMessageId`
- `errorCode`

Estados candidatos de entrega: `PENDING`, `SENT`, `FAILED`. Retentativas automáticas e limites permanecem fora de decisão até aprovação.

## Experiência candidata

- manter toast para feedback imediato das ações;
- caixa/central local para consultar notificações persistidas;
- badge de não lidas;
- drawer para leitura rápida, conforme o padrão visual do 7Commander;
- estados loading, empty, error e forbidden;
- ações com ícone, tooltip e hierarquia consistente;
- comportamento responsivo validado em regressão.

Toast de confirmação de uma ação e notificação persistida são conceitos distintos.

## Critérios de aceite a definir para a SPEC 05

- isolamento funcional Alpha/Beta;
- CLIENT recebe apenas conteúdo público permitido;
- SUPPORT/ADMIN visualizam apenas notificações autorizadas;
- geração idempotente;
- leitura/não leitura persistida localmente;
- falha do provider local não perde o registro da notificação;
- timeline do chamado não é duplicada pela infraestrutura de notificações;
- migração local preserva IDs e dados das SPECs anteriores;
- testes unitários dos serviços e regras de projeção;
- cenários E2E dos fluxos críticos;
- Human Validation visual e funcional.

## Decisões pendentes antes de iniciar

- matriz final evento × destinatário × canal;
- conteúdo mínimo de cada template;
- quais notificações aparecem na central interna e na área do cliente;
- política de leitura e retenção local;
- comportamento de retentativa;
- preferência por usuário e opt-out, se aplicável;
- momento futuro de ativação do provider Gmail;
- política de links e URLs públicas nos templates.

## Explicitamente fora desta preparação

- código funcional da SPEC 05;
- envio real de e-mail;
- credenciais Google/Gmail;
- Supabase Auth, banco, RLS, Edge Functions ou Realtime;
- filas cloud e workers;
- webhooks externos;
- integração com 7Service;
- Atena, AI Router e Knowledge Base;
- SLA e escalonamentos automáticos;
- dados reais de clientes.

## Gate de início

A SPEC 05 permanece **NOT STARTED**. O desenvolvimento só pode começar após aprovação deste recorte, da matriz de eventos/destinatários e dos critérios de Human Validation.
