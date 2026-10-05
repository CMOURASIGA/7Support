# SPEC 05 - Notifications local-first

**Status:** READY FOR HUMAN VALIDATION  
**Branch:** `feat/spec-05-notifications`  
**Base:** `develop` em `103fe24f9d650ab7824219886924dcefb248d4f4`

## Escopo implementado

Domínio de notificações transacionais em modo local-first, com persistência, destinatário, leitura, contador, idempotência e entrega mock. Não há Gmail, Supabase, cloud, worker, fila externa ou 7Service.

## Arquitetura

```text
UI
  -> NotificationService
    -> NotificationRepository
      -> LocalNotificationRepository
        -> LocalStorage

NotificationService
  -> DeliveryProvider
    -> LocalDeliveryProvider
```

Componentes React não acessam `LocalStorage`. A UI usa `NotificationService` e o controle de demonstração usa o contrato do `LocalDeliveryProvider`.

## Armazenamento local

- notificações e entregas: `7support.spec05.notifications.v1`;
- modo do provider: `7support.spec05.delivery-mode.v1`;
- schema versionado em `NotificationDatabase.version = 1`;
- eventos `storage` e eventos locais atualizam header, central e contador;
- IDs de notificação e delivery são UUIDs estáveis.

LocalStorage permanece apenas como infraestrutura de demonstração. Não equivale a RLS, autenticação segura ou isolamento de banco.

## Matriz implementada

| Evento | Tipo | Destinatário | Conteúdo projetado |
|---|---|---|---|
| chamado criado | `TICKET_CREATED` | CLIENT solicitante | código, assunto, produto e confirmação |
| atribuição | `TICKET_ASSIGNED` | SUPPORT responsável | código, cliente, assunto e prioridade |
| transferência | `TICKET_TRANSFERRED` | novo responsável | código, cliente, assunto e prioridade |
| resposta pública SUPPORT | `SUPPORT_PUBLIC_REPLY` | CLIENT solicitante | aviso de nova resposta, sem copiar a mensagem |
| resposta CLIENT | `CLIENT_PUBLIC_REPLY` | SUPPORT responsável | aviso e contexto mínimo; sem responsável não gera destinatário individual |
| resolução | `TICKET_RESOLVED` | CLIENT solicitante | código, assunto e orientação para histórico |
| reabertura | `TICKET_REOPENED` | SUPPORT responsável | código, assunto e orientação para histórico |

Não geram notificação: prioridade, categoria, `INTERNAL_NOTE`, anexos internos, `UNDER_ANALYSIS`, auditoria e eventos técnicos.

O contrato `TicketNotificationEvent` não possui texto, anexo, nome de arquivo ou metadata de nota interna. Isso impede que o conteúdo reservado chegue ao domínio de notificações.

## Idempotência

A chave é:

```text
eventId:recipientUserId:notificationType
```

A verificação e a inclusão ocorrem dentro da transação serializada do repositório local. Um evento já processado retorna o registro existente e não cria nova entrega.

## Entrega local

O `LocalDeliveryProvider` possui os modos:

- `SUCCESS`: delivery termina como `SENT`;
- `FAILURE`: delivery termina como `FAILED`, com `LOCAL_PROVIDER_FAILURE`.

A notificação e o delivery `PENDING` são persistidos antes da chamada ao provider. Falha de entrega não remove nem impede a existência da notificação. Não há retry automático.

## Autorização e navegação

- consultas retornam somente registros com `userId` igual ao usuário autenticado;
- CLIENT exige também `tenantId` igual ao `clientId` da sessão;
- CLIENT navega para `/tickets/[ticketId]`;
- SUPPORT e ADMIN navegam para `/support/tickets/[ticketId]`;
- as rotas de destino preservam os guards das SPECs anteriores.

## Central visual

- sino no header com tooltip e badge de não lidas;
- item no menu lateral;
- drawer com as seis notificações mais recentes;
- central em `/notifications`;
- filtros Todas e Não lidas;
- detalhe em drawer;
- marcar uma ou todas como lidas;
- estado de delivery;
- loading, empty e error;
- controle local de sucesso/falha para Human Validation;
- layout responsivo seguindo a fundação visual do 7Commander.

Toast continua representando feedback imediato. Notificação representa um evento persistido.

## Testes automatizados

Os testes unitários cobrem:

- criação;
- atribuição e transferência;
- respostas públicas nos dois sentidos;
- bloqueio completo de `INTERNAL_NOTE` e anexo interno;
- resolução e reabertura;
- idempotência;
- leitura, contador e persistência;
- isolamento Alpha/Beta;
- falha do provider com notificação preservada.

Os E2E cobrem central, drawer, leitura após refresh, resposta pública, ausência de vazamento interno, falha do provider e isolamento Beta. A lista do Playwright descobre 13 cenários no total. A execução local requer o binário Chromium do Playwright.

## Roteiro de Human Validation

### 1. Confirmação do CLIENT

1. Entrar como `cliente.alpha@demo.7support.local`.
2. Abrir um chamado novo.
3. Confirmar badge `1` no sino.
4. Abrir o drawer e validar código, assunto e produto.
5. Abrir a central e marcar como lida.
6. Atualizar a página e confirmar leitura preservada.

### 2. Operação interna

1. Entrar como SUPPORT.
2. Assumir chamado sem responsável e confirmar notificação para o responsável.
3. Transferir para ADMIN e confirmar que o responsável anterior não recebe nova notificação.
4. Publicar resposta e confirmar notificação no CLIENT.
5. Criar nota interna com anexo e confirmar ausência total na central do CLIENT.

### 3. Resposta e estados

1. Responder como CLIENT em chamado atribuído e confirmar notificação do responsável.
2. Responder em chamado sem responsável e confirmar que não foi inventado destinatário.
3. Resolver e confirmar notificação do CLIENT.
4. Reabrir e confirmar notificação do responsável.

### 4. Falha do provider

1. Na central, alterar Simulação de entrega para Falha.
2. Executar evento notificável.
3. Confirmar que a notificação existe com label Falha local.
4. Confirmar delivery `FAILED` e ausência de retry.
5. Retornar a simulação para Sucesso.

### 5. Isolamento e navegação

1. Gerar notificação para Alpha.
2. Entrar como Beta e confirmar que ela não aparece.
3. Confirmar que CLIENT abre a rota pública do chamado.
4. Confirmar que SUPPORT/ADMIN abrem o detalhe interno.
5. Validar desktop, tablet e celular.

## Fora do escopo

Gmail API, Google Cloud, credenciais, Supabase, RLS real, Edge Functions, workers, filas cloud, 7Service, Atena, Knowledge Base, SLA e SPEC 06.
