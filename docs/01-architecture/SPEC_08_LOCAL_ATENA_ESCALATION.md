# SPEC 08 - Atena Escalation (local-first)

Base: `develop`, `7ccda0b88119b0d7f981421d2062406330b43ace`.
Branch: `feat/spec-08-atena-escalation`. Implementada, pendente de Human Validation.

## Fluxo e autoridade

CLIENT abre manualmente o drawer na conversa própria ACTIVE. Produto read-only vem da conversa. Tipo QUESTION, impacto LOW_IMPACT, assunto da primeira mensagem USER (160 caracteres), descrição com contexto determinístico. Cancelar não cria chamado. Tipo, impacto, assunto e descrição são revisáveis; não há anexos.

React chama AtenaEscalationService, que utiliza AtenaService, TicketService e AtenaEscalationRepository. Componentes não acessam LocalStorage. Sessão, usuário, tenant, ownership, acesso ao produto e citações são revalidados ao preparar e confirmar. Um novo login invalida o preview anterior. A confirmação reconstrói e compara o contexto autorizado com o snapshot do preview. Alteração da conversa ou revogação exige nova revisão.

Snapshot usa somente os seis últimos USER/ASSISTANT autorizados, com até 8.000 caracteres incluindo rótulos e separadores. ASSISTANT deve estar COMPLETED. A projeção de AtenaService revalida todas as citações; respostas de conhecimento revogado são excluídas. Não são serializados execuções, diagnóstico, provider, prompt técnico, payload, stack, metadados administrativos, anexos ou notas internas. Texto neutro pode ser escalado manualmente. Não existe resumo por IA nem abertura automática.

## Ticket Core e idempotência

`Ticket.origin` é opcional, preservando chamados anteriores e a base versão 2:

```yaml
origin:
  type: ATENA
  conversationId: UUID
  escalationId: UUID
  idempotencyKey: ATENA:<conversationId>:<userId da sessão>
```

`TicketService.createFromAtena` exige CLIENT, ausência de anexos, Web Locks e revalidação do contexto de origem pelo serviço. Não usa identidade ou tenant recebidos da UI. Revalida antes de enfileirar e dentro da transação, imediatamente antes da gravação. O contrato de transação aceita callback assíncrono para essa revalidação dentro do lock.

A mesma transação procura originKey, verifica tenant/solicitante/produto e retorna o existente ou cria o chamado com publicCode e sequência normais. Somente o ramo que cria emite TICKET_CREATED. Locks do Ticket Core serializam instâncias/abas. Escalada falha fechado sem Web Locks, preservando a rotina legada de chamados.

## Persistência e recuperação

Base separada: `7support.spec08.escalations.v1`, versão 1. Cada registro contém id, conversationId, userId, tenantId, productId, ticketId, clientRequestId, status, approvedContextSnapshot, draft, sessionCreatedAt, createdAt, completedAt e auditoria funcional.

Estados: PREPARING → READY → CREATING → COMPLETED. Falha na abertura/conclusão pode produzir FAILED. Locks por conversa evitam confirmações concorrentes no coordenador; unicidade definitiva permanece no Ticket Core.

1. Confirmação é persistida antes da abertura.
2. Ticket Core cria e grava origem e evento CREATED atomicamente.
3. Coordenador salva ticketId e COMPLETED.
4. Se o passo 3 falhar, retry encontra originKey no Ticket Core, retorna o mesmo chamado e reconcilia o vínculo. Não cria ticket nem notificação novos.
5. Refresh consulta o Ticket Core e reconcilia o vínculo pendente antes de mostrar o chamado, sem criar ticket. O drawer aberto mantém retry manual. Uma conversa vinculada nunca oferece outra abertura.

Auditoria: STARTED, CONFIRMED, TICKET_CREATED, LINK_COMPLETED e RETRY_RECOVERED. O evento CREATED do próprio ticket é a evidência durável da criação quando há falha antes da auditoria do vínculo.

A conversa continua ACTIVE. Interface exibe somente o código público e link `/tickets/<ticketId>`. Nenhum identificador técnico é apresentado como informação ao cliente.

## Limites mantidos

Identidade e persistência locais são proteções funcionais da demonstração; não são RLS ou backend de produção. Nenhuma integração cloud/provider real, SLA, anexos da conversa, criação automática ou criação por SUPPORT/ADMIN foi adicionada. SPEC 09 não iniciada. Aprovação e merge continuam pendentes de homologação humana.
