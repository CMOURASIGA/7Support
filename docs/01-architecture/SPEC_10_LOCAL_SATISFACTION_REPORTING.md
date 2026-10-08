# SPEC 10 - Satisfaction / Reporting local-first

Status: IMPLEMENTED / PENDING HUMAN VALIDATION. Recorte aprovado por CHRISTIAN em 08/10/2026. Base: develop `fecab9f4f85c8c7ee9620d45aa865cab157752d4`. Branch: `feat/spec-10-satisfaction-reporting`.

## Contratos e autorização

UI → SatisfactionService → TicketService + SatisfactionRepository.
UI → ReportingService → TicketService.reportingTickets + SlaService.reportingSnapshot + SatisfactionRepository → calculator puro.

React não acessa LocalStorage. Somente requester CLIENT avalia; identidade, tenant e produto derivam da sessão/ticket. SUPPORT/ADMIN apenas consultam comentários conforme a autorização interna já existente. CLIENT consulta somente ticket e feedback próprios, nunca agregados. SUPPORT/ADMIN consultam todos os tickets autorizados pela operação, incluindo não atribuídos. Nenhum número de relatório é mockado. Todo o ambiente é rotulado **dados locais de homologação**; nenhum flag demo/produção é inventado no ticket.

## Oportunidade e modelo

Cada nova entrada RESOLVED persiste `satisfactionEligible: true` no evento do Ticket Core. O evento é a fonte persistida da oportunidade; não existe backfill nem segundo banco com estado concorrente de oportunidade. `opportunities()` projeta ELIGIBLE, SUBMITTED ou CANCELLED_BY_REOPEN deterministicamente.

RESOLVED e CLOSED permitem envio. REOPENED anterior ao envio cancela a oportunidade antiga; uma nova resolução cria outra. REOPENED posterior ao envio preserva o feedback imutável. Feedback negativo não altera status nem reabre chamado. Não há prazo artificial de expiração, notificação ou e-mail de satisfação.

SatisfactionRecord persistido no schema `7support.spec10.satisfaction.v1`:

- id, ticketId, resolutionEventId, cycleStartEventId;
- requesterUserId, tenantId, productId;
- resolvedAnswer boolean obrigatório;
- rating opcional, inteiro 1..5 ou null; omitido vira null;
- comment opcional até 2.000 caracteres; trim, vazio/omitido vira null;
- clientRequestId, originKey, submittedAt UTC;
- auditoria SUBMITTED com ator e timestamp.

`cycleStartEventId` referencia CREATED/REOPENED que iniciou o atendimento, sem inventar um ciclo SLA em legado. IDs técnicos não aparecem na UI CLIENT.

## Idempotência e reabertura concorrente

Chave única: `SATISFACTION:<ticketId>:<resolutionEventId>:<requesterUserId>`.

Lock order obrigatório: Ticket Core → Satisfaction. `TicketService.withSatisfactionTicket` mantém o mesmo Web Lock usado nas mudanças de status durante a transação do feedback. Dentro da gravação revalida sessão/identidade, ownership/requester, tenant, produto, evento e histórico atual. Reabertura que ganha o lock primeiro bloqueia o envio antigo. Se o feedback ganha primeiro, ele é histórico válido e a reabertura posterior o preserva. Sem Web Locks, envio falha fechado.

Mesma origem e mesmo conteúdo normalizado retornam o registro existente, independentemente de clientRequestId. Conteúdo diferente retorna CONFLICT. Não existe update/edit. Falha posterior à gravação do feedback é recuperável pelo replay. Relógio injetável no envio, UTC e rejeição de timestamp anterior à resolução. Nenhuma satisfação dispara notificação, mudança de status ou novo ticket.

## Consulta de reporting somente leitura

`ReportingQuery`: start/end ISO UTC canônicos, intervalo `[start,end)`, clientId/productId/type opcionais. Filtros são aplicados sobre tickets já autorizados. Resultados agregados não expõem comentários nem IDs técnicos.

`LocalTicketRepository.readOnly()` lê tickets existentes sem seed ou escrita de migração. Normalização de schema legado ocorre somente em memória. `SlaService.reportingSnapshot()` lê ciclos persistidos e filtra por ticket/tenant autorizado. Não chama getInternal/getClient, reconcile, calculator SLA operacional ou NotificationService. Nenhuma consulta cria ticket/ciclo/política, atualiza evaluatedAt, detecta breach, salva alerta ou inicializa feedback. Snapshot ausente ou ainda pendente permanece explicitamente excluído, mesmo que a consulta operacional posterior pudesse reconciliá-lo.

Datas escolhidas na UI usam o fuso local do navegador. A data final inclui o dia selecionado e é convertida para meia-noite local do dia seguinte, preservando DST. A UI mostra o intervalo UTC efetivamente consultado e o fuso. Reporting não precisa de Clock: lê timestamps persistidos e um intervalo explícito.

## Coortes e denominadores

| Indicador | Coorte e regra | Denominador/amostra |
|---|---|---|
| Criados | CREATED em [start,end) | Tickets distintos |
| Resolvidos/reabertos | Tickets da coorte CREATED, eventos anteriores a end | Tickets resolvidos distintos para taxa de reabertura |
| Eventos REOPENED | Todos os eventos antes de end dos tickets da coorte CREATED | Contagem de eventos, separada dos tickets distintos |
| Primeira resposta/resolução | RESOLVED do ciclo em [start,end) | Tempos ativos persistidos válidos; média e mediana, n explícito |
| Primeira resposta ausente | Ciclo válido concluído sem marco operacional | Conta ausência; não vira zero na média |
| SLA por métrica | RESOLVED do ciclo em [start,end) | MET / (MET + NOT_MET) |
| SLA excluído | PENDING, NOT_CONFIGURED, INVALID_HISTORY separados | Fora do denominador MET + NOT_MET |
| Avaliações/Sim/Não/rating | submittedAt em [start,end) | Sim / (Sim + Não); rating médio apenas informados |
| Taxa de resposta | Oportunidades RESOLVED em [start,end), respondidas antes de end | Respostas dessas oportunidades / oportunidades não canceladas |

A taxa de resposta usa a coorte de resolução porque oportunidades ainda sem resposta não têm submittedAt. Esta definição foi a premissa de implementação comunicada durante o trabalho; está separada e explicitamente rotulada na UI, para revisão na Human Validation. Não dividir respostas recebidas no período por oportunidades de outro período silenciosamente. Cancelamentos por reabertura são separados e excluídos. Feedback já enviado permanece nas métricas históricas. Denominador vazio resulta em null / “Sem amostra”, nunca percentual artificial.

Histórico inválido e tempos não finitos/negativos não geram médias. Tickets sem snapshot não recebem cálculo com createdAt/resolvedAt bruto. Legado ainda participa de volume e reaberturas reais; futura resolução marcada permite feedback. Ciclos em andamento ficam fora das médias de concluídos. Múltiplos ciclos e políticas congeladas são preservados. As regras homologadas da SPEC 09 (24x7, UTC, primeira resposta operacional, pausa somente resolução, policyVersion temporal, sem backfill, alertas somente operacionais) não mudam.

## UI e validação

Detalhes CLIENT e SUPPORT/ADMIN incluem painel contextual. CLIENT vê Sim/Não obrigatório, estrelas e comentário opcionais, confirmação de imutabilidade, loading, erro/retry, toast e histórico somente leitura. Operadores veem histórico e comentários, sem ação de envio. Reabertura mostra cancelamento amigável.

`/support/reports`: menu interno, filtros de período/cliente/produto/tipo, cards de volume/atendimento/SLA/satisfação, coortes e denominadores visíveis, amostras e exclusões, segmentação real e estados sem dados. Responsivo em desktop/mobile. Sem exportação, ranking ou dashboard CLIENT.

Testes novos: `tests/unit/satisfaction-reporting.cjs` e `tests/e2e/satisfaction-reporting.spec.ts`. Suíte completa inclui regressão Atena Escalation e SLA. Roteiro: [SPEC_10_HUMAN_VALIDATION.md](SPEC_10_HUMAN_VALIDATION.md).

Fora do escopo: SPEC 11, integração 7Service, real AI, Supabase/RLS real, Gmail/Google Cloud, infraestrutura cloud, exportação CSV, notificações de satisfação, jobs/cron e automação de status.
