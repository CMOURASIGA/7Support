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
   +--------+---------+------------------+
   |                  |                  |
Supabase           Gmail             AI Router
Tickets/RLS        Notify            Atena
                                       |
                              +--------+--------+
                              |                 |
                         OpenRouter           OpenAI
                         Free Primary         Fallback
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
- conversas Atena;
- notificações;
- avaliações;
- auditoria específica do suporte.

## AI Router

Atena não deve conhecer diretamente detalhes de OpenRouter ou OpenAI.

Toda geração deve passar por um contrato interno de provider, por exemplo:

```text
AtenaService
   -> AIRouter
        -> OpenRouterAdapter
        -> OpenAIAdapter
```

O router deve suportar pelo menos:

- `OPENROUTER_FREE`: utiliza modelo gratuito homologado;
- `OPENAI`: utiliza modelo OpenAI configurado;
- `AUTO`: utiliza política configurada, com fallback controlado.

O nome dos modelos não deve ficar hardcoded no domínio.

## Política inicial de roteamento

- perguntas operacionais simples e respostas baseadas em RAG podem usar OpenRouter Free;
- somente modelos gratuitos previamente homologados devem ser usados;
- não depender do router aleatório `openrouter/free` como garantia de produção;
- falha, indisponibilidade, rate limit ou resposta inválida pode acionar fallback para OpenAI;
- fluxos internos mais sensíveis ou que exijam previsibilidade podem usar OpenAI diretamente;
- a política deve ser configurável por ambiente.

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
- Atena;
- ajuda.

Enquanto o 7HUB não existir, o 7Support pode oferecer uma superfície cliente própria, desde que a arquitetura permita migração posterior sem reescrever o domínio.

### Interna

Pode existir no próprio 7Support ou ser embutida no 7Service:
- dashboard operacional;
- fila;
- todos os chamados;
- detalhe do chamado;
- base de conhecimento;
- Atena;
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
- acesso ao AI Router;
- acesso a OpenRouter/OpenAI;
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
- atena.escalated_to_ticket.

## Regra de consistência

Criar ticket e mensagem inicial é operação de negócio.

Enviar e-mail ou chamar provider de IA é efeito colateral.

Falha de provider não deve corromper ticket nem histórico.

## Observabilidade

Registrar pelo menos:
- request/correlation id;
- actor id;
- client id;
- ticket id quando aplicável;
- operation;
- outcome;
- duration;
- provider;
- model;
- fallback_used;
- fallback_reason;
- input_tokens;
- output_tokens;
- custo estimado quando disponível;
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
- OpenRouter key própria ou segregação equivalente;
- OpenAI key própria ou segregação equivalente;
- política de AI Router configurável.
