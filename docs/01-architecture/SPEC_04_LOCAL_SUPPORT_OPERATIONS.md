# SPEC 04 - Support Operations local-first

## Escopo

Operação interna para SUPPORT e ADMIN sobre o mesmo repositório de chamados da SPEC 03. Nenhuma integração com cloud, Supabase, Gmail, SLA, Atena ou 7Service. As rotas internas são `/support/queue`, `/support/tickets` e `/support/tickets/[ticketId]`.

## Dados e migração

O documento local continua sob a chave `7support.spec03.tickets.v1`, com versão interna 2. A primeira leitura de versão 1 preenche `priority = MEDIUM`, `category = type` e responsável `user-support` para chamados em andamento, preservando UUID, código CS, mensagens, anexos, eventos e `nextPublicNumber`. Chamados OPEN permanecem sem responsável. Novos chamados recebem prioridade inicial média apenas para triagem interna; o cliente não escolhe nem edita esse campo. Os operadores fictícios são Equipe de Suporte, Marina Costa, Rafael Lima e Administração 7Support.

`TicketService` mantém a separação UI → Service → TicketRepository → LocalTicketRepository → LocalStorage. Operações recebem o ator da sessão local, nunca do formulário. `listInternal`, `getInternal`, `assume`, `assign`, `changePriority`, `changeCategory`, `changeStatus`, `postInternal` e `attachmentInternal` exigem SUPPORT/ADMIN. Eventos operacionais registram ator, descrição, data/hora e correlation ID. Transferência guarda responsável anterior e novo na descrição auditável. Sem banco/RLS, a barreira local é apenas funcional.

## Visibilidade

`PUBLIC_REPLY` pode ser visto pelo cliente do chamado. `INTERNAL_NOTE`, seus anexos e eventos internos ficam restritos à leitura interna. `list` e `get` projetam somente mensagens públicas e eventos públicos; `attachment` consulta essa projeção. A troca de modo no composer limpa rascunho e anexos e usa cores e aviso explícito para evitar envio acidental. A resposta do cliente em WAITING_CUSTOMER continua sem alteração automática de status.

## Máquina de estados

As transições seguem `TICKET_STATE_MACHINE.md`: OPEN → IN_PROGRESS; IN_PROGRESS → WAITING_CUSTOMER, UNDER_ANALYSIS, RESOLVED; WAITING_CUSTOMER → IN_PROGRESS; UNDER_ANALYSIS → IN_PROGRESS, RESOLVED; RESOLVED → CLOSED ou REOPENED; CLOSED → REOPENED; REOPENED → IN_PROGRESS. Somente SUPPORT/ADMIN executam essas transições nesta SPEC. Resolução e reabertura exigem motivo. Não existe prazo comercial de reabertura definido; o cliente não recebe ação de reabertura nesta etapa. Resposta pública é bloqueada em RESOLVED e CLOSED até reabertura.

## Human Validation

1. Entrar como SUPPORT e ADMIN; conferir dashboard, fila ativa e todos os chamados Alpha/Beta. Conferir indicadores, filtros combinados, busca e limpeza.
2. No CS-000001, abrir drawer e detalhe, assumir, transferir para Marina, alterar prioridade e categoria. Confirmar toast, timeline com ator e persistência após refresh.
3. Mudar OPEN → IN_PROGRESS → UNDER_ANALYSIS → RESOLVED, com motivo; tentar transição inválida e confirmar bloqueio. Reabrir com motivo e retomar IN_PROGRESS.
4. No CS-000003, confirmar WAITING_CUSTOMER → IN_PROGRESS somente por ação interna.
5. Registrar nota interna e anexo TXT; registrar resposta pública. Entrar como Cliente Alpha e confirmar que só a resposta pública aparece, inclusive após refresh. Download de anexo interno não deve estar acessível pela experiência CLIENT.
6. Entrar como Cliente Beta; confirmar somente seus registros. Colar URL interna e URL de detalhe Alpha; confirmar bloqueio. Conferir CLIENT da SPEC 03, visual desktop/tablet/mobile e ausência de scroll horizontal.

## Verificação automatizada

`tests/unit/support-operations.cjs` cobre migração e preservação de IDs, autorização, auditoria, atribuição, transferência, prioridade, categoria, status, resolução, reabertura, visibilidade pública/interna, anexos e isolamento Alpha/Beta. `tests/e2e/support-operations.spec.ts` cobre o fluxo de interface e rotas por perfil; executar quando Chromium e servidor estiverem disponíveis no ambiente.
