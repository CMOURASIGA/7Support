# 7Support - Human Validation Matrix

## Regra

Cada SPEC com interface ou comportamento de negócio deve terminar em Human Validation antes da próxima fase dependente.

Registrar:
- PASS;
- FAIL;
- N/A;
- evidência;
- observação;
- bloqueio.

## SPEC 01

Validar:
- Preview READY;
- health 200;
- shell;
- responsividade base;
- ausência de secrets;
- loading/error básicos.

## SPEC 02

Validar:
- login local;
- logout;
- recuperação de sessão;
- CLIENT;
- SUPPORT;
- ADMIN;
- cliente A x cliente B;
- forbidden;
- RLS;
- isolamento entre tenants;
- campos external_* opcionais preparados;
- nenhum requisito de integração 7Service nesta fase.

## SPEC 03

Validar:
- dashboard cliente;
- novo chamado;
- produto autorizado;
- código CS;
- anexos;
- resposta;
- persistência após refresh.

## SPEC 04

Validar:
- fila;
- assumir;
- transferir;
- prioridade;
- categoria;
- status;
- resposta pública;
- nota interna;
- INTERNAL_NOTE invisível ao cliente.

## SPEC 05

Validar:
- e-mail cliente;
- cópia operacional;
- retry;
- idempotência;
- falha de Gmail não desfaz ticket.

## SPEC 06

Validar:
- CRUD ADMIN;
- DRAFT;
- IN_REVIEW;
- PUBLISHED;
- ARCHIVED;
- versionamento;
- Atena não usa conteúdo não publicado.

## SPEC 07

Validar:
- OpenRouter homologado;
- OpenAI fallback;
- AUTO;
- telemetria;
- grounding;
- tenant boundary;
- prompt injection;
- falha dos providers não quebra tickets.

## SPEC 08

Validar:
- conversa;
- abrir chamado;
- prefill;
- revisão;
- vínculo conversation/ticket.

## SPEC 09

Validar:
- cálculo;
- mudança de status;
- WAITING_CUSTOMER;
- vencimento;
- filtros;
- configuração sem hardcode.

## SPEC 10

Validar:
- avaliação;
- relatórios;
- métricas reais;
- filtros;
- ausência de mocks.

## SPEC 11

Validar:
- usuário criado no 7Service acessa 7Support com mesma identidade;
- produto autorizado aparece;
- produto removido deixa de aparecer;
- bloqueio reflete política;
- divergência/reconciliação;
- senha nunca é copiada.
