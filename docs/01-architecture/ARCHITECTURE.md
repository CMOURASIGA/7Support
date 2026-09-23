# 7Support - Architecture

## Visão

O 7Support é um domínio separado, integrado ao 7Service e ao futuro 7HUB.

```text
7Service
  |  clientes, identidades, produtos, contratos, acessos, entitlements
  v
Identity / Access Context
  |
  +-------------------+
  |                   |
  v                   v
7HUB               7Support Internal
Cliente            Consult Services
  |                   |
  +---------+---------+
            |
            v
         7Support
            |
   +--------+---------+---------+
   |                  |         |
Supabase           Gmail      OpenAI
Tickets/RLS        Notify     Hermes
```

## Fonte de verdade

### 7Service

Fonte administrativa para:
- clientes;
- usuários;
- produtos;
- vínculos usuário-cliente;
- acessos por produto;
- entitlements;
- status de assinatura/licença quando aplicável.

### 7Support

Fonte para:
- tickets;
- mensagens;
- anexos;
- eventos de ticket;
- atribuições;
- prioridades e categorias;
- SLA;
- base de conhecimento;
- conversas Hermes;
- notificações;
- avaliações;
- auditoria específica do suporte.

## Regra de integração

O 7Support não deve duplicar cadastro mestre do 7Service como autoridade.

Pode manter referências externas e snapshots mínimos necessários para histórico e resiliência, por exemplo:
- external_client_id;
- external_user_id;
- external_product_id;
- display_name_snapshot.

Snapshots nunca substituem a autoridade do 7Service para decisões atuais de acesso.

## Contexto de autorização

Toda operação deve resolver:

```text
actor
+ organization/client
+ product
+ role
+ entitlement
+ ticket relationship
```

## Superfícies

### Cliente

Preferencialmente consumida pelo 7HUB:
- dashboard;
- meus chamados;
- novo chamado;
- detalhe do chamado;
- Hermes;
- ajuda.

Enquanto o 7HUB não existir, o 7Support pode oferecer uma superfície cliente própria, desde que a arquitetura permita migração posterior sem reescrever o domínio.

### Interna

Pode existir no próprio 7Support ou ser embutida no 7Service:
- dashboard operacional;
- fila;
- todos os chamados;
- detalhe do chamado;
- base de conhecimento;
- Hermes;
- SLA;
- configurações;
- auditoria.

## Backend

Operações privilegiadas devem ocorrer server-side.

Exemplos:
- criação do número amigável;
- cálculo de prioridade;
- atribuição;
- alteração de status;
- leitura de notas internas;
- geração de URL de anexo;
- envio de e-mail;
- acesso ao OpenAI;
- manutenção de base de conhecimento;
- sincronização com 7Service.

## Eventos

Usar padrão de eventos/outbox para integrações que não devem quebrar a transação principal.

Exemplos:
- ticket.created;
- ticket.assigned;
- ticket.public_reply_created;
- ticket.status_changed;
- ticket.resolved;
- ticket.reopened;
- notification.requested;
- notification.sent;
- notification.failed;
- hermes.escalated_to_ticket.

## Regra de consistência

Criar ticket e mensagem inicial é operação de negócio.

Enviar e-mail é efeito colateral.

Se o e-mail falhar:
- ticket continua válido;
- falha é registrada;
- retry pode ocorrer;
- usuário não perde o chamado.

## Observabilidade

Registrar pelo menos:
- request/correlation id;
- actor id;
- client id;
- ticket id;
- operation;
- outcome;
- duration;
- provider externo quando aplicável;
- erro sanitizado.

Nunca registrar secrets, tokens, conteúdo sensível desnecessário ou payload integral enviado ao modelo.

## Ambientes

Separar:
- development;
- preview;
- production.

Cada ambiente deve possuir:
- Supabase próprio ou schema claramente isolado;
- secrets próprios;
- configuração de e-mail própria;
- OpenAI key própria ou segregação equivalente.
