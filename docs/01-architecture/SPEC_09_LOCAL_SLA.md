# SPEC 09 - SLA local-first

Status: IMPLEMENTED / PENDING HUMAN VALIDATION. Recorte autorizado em 08/10/2026.
Base: develop `32b829f08fbed45089dac057fb828f3fb0e58618`.
Branch: `feat/spec-09-sla`. SPEC 10 não iniciada.

## Contratos e autoridade

UI → SlaService → SlaPolicyRepository / SlaCycleRepository / SlaCalculator / TicketService / NotificationService.

Contratos em `src/services/sla/types.ts`. O calculator é puro: recebe ciclo, histórico normalizado e instante UTC. Clock é injetado em SlaService e, de forma localizada, em TicketService. Os componentes usam serviços; nenhum acessa LocalStorage.

A sessão determina identidade, papel e tenant. TicketService.slaHistory aplica ownership e isolamento CLIENT antes de projetar somente marcos, timestamps e referências. Não transmite texto de notas, anexos ou diagnósticos. CLIENT recebe apenas ClientSlaView, sem ciclos, política, versão ou auditoria. Configuração é ADMIN; SUPPORT consulta a operação. Sessão é revalidada após awaits e dentro das transações.

## Política versionada

SlaPolicyVersion: id, productId, priority, version, status DRAFT/PUBLISHED, firstResponseMinutes, resolutionMinutes, pauseResolutionWhileWaitingCustomer, createdAt/By, publishedAt, audit, demo e basedOnPublishedId.

Metas: inteiros positivos até 5.256.000 minutos. Produto autorizado ao ADMIN e prioridade reconhecida. Publicação é imutável e idempotente para a mesma versão. Não existe edição de versão publicada. Uma correção cria rascunho com nova versão e base de publicação. Web Lock serializa publicação; um rascunho cuja base foi substituída não publica. Duas publicações no mesmo instante não são aceitas, evitando política temporal ambígua.

Seleção: filtrar por produto, prioridade do início e `publishedAt <= cycleStartedAt`; escolher a publicação mais recente naquele instante. Versões publicadas anteriores permanecem PUBLISHED no histórico. Não se seleciona apenas a política atual. Policy snapshot e policyVersionId ficam congelados no ciclo. Ausência de política também é congelada; publicação posterior não cobre retroativamente esse ciclo.

Dados fictícios publicados no adaptador local para 7Commander e 7Finance:

| Prioridade | Primeira resposta (min) | Resolução (min) |
|---|---:|---:|
| LOW | 240 | 2880 |
| MEDIUM | 120 | 1440 |
| HIGH | 60 | 480 |
| CRITICAL | 15 | 240 |

Pausa de resolução habilitada nesses dados. Não constituem SLA comercial definitivo. Calendário fixo 24x7; UTC persistido, fuso apenas para apresentação.

## Ticket Core e ciclo

Alterações localizadas, sem mudança das transições:

- CREATED de novos chamados, manuais ou Atena, contém `slaStart.priority`.
- STATUS_CHANGED para REOPENED contém `slaStart.priority` com a prioridade naquele evento.
- PRIORITY_CHANGED registra oldPriority/newPriority estruturados, preservando a auditoria existente.
- Resposta operacional contém eventId para ordenar marcos mesmo quando resposta, resolução e reabertura compartilham o mesmo milissegundo. ADMIN publica com authorType SUPPORT, conforme contrato existente.
- Clock opcional no construtor permite testes determinísticos. Instância normal usa o relógio do navegador.

SlaCycle: id, originKey `SLA:<ticketId>:<startEventId>`, ticketId, tenantId, startEventId, cycleNumber, startedAt, priorityAtCycleStart, policyVersionId, policySnapshot, evaluatedAt, evaluation e audit.

Evaluation persiste métricas, resultados, marcos de primeira resposta/resolução e pausas. Estado: NOT_CONFIGURED, ON_TRACK, PAUSED, BREACHED, INVALID_HISTORY. Resultado independente: PENDING, MET, NOT_MET.

A reconciliação ocorre na leitura autorizada da fila/detalhe e após ações que atualizam essas telas. O browser avalia novamente a cada 15 segundos enquanto a tela está aberta. Ciclo e snapshot são persistidos sob Web Lock. Não há execução com navegador fechado.

Falha entre ticket/evento e ciclo: retry lê o evento original, deriva chave única, usa o timestamp e prioridade originais e seleciona a política temporal. Não cria ticket nem ciclo duplicado. Não depende de ter gravado uma reserva anterior no SLA. Ausência de Web Locks falha fechado para gravações de SLA.

Chamados existentes não têm o marcador de ativação: NOT_CONFIGURED, sem backfill nem alertas históricos. Uma reabertura nova pode iniciar ciclo com a política vigente naquele novo instante.

## Calculator e pausas

Primeira resposta: primeira PUBLIC_REPLY SUPPORT/ADMIN dentro do ciclo. CLIENT, Atena, notas, atribuição, transferência, prioridade e status não satisfazem. Nunca pausa.

Resolução: primeira entrada RESOLVED. CLOSED conserva os resultados. REOPENED inicia novo ciclo, com dois relógios novos; ciclos concluídos não são sobrescritos. Mudança de prioridade ou publicação posterior não altera o ciclo atual.

Resolução sem resposta: firstResponse.result NOT_MET, satisfiedAt null. Não inventa resposta. O indicador pode representar meta não atendida mesmo antes de vencer; alerta é exclusivamente por tempo efetivamente excedido.

Pausas de resolução, quando habilitadas: intervalos [entrada WAITING_CUSTOMER, saída). Pausa aberta termina provisoriamente no instante de avaliação. São validadas pela sequência de estados e acumuladas uma única vez. Tempo ativo = tempo corrido menos pausas. Durante pausa aberta não há previsão de saída: dueAt null; após retomar, prazo soma pausas concluídas.

Marco atendido no prazo: activeElapsed <= target. Pendente vence somente activeElapsed > target. Precisão em milissegundos; arredondamento visual não altera regra.

Timestamps UTC inválidos, datas normalizadas indevidamente, eventos fora de ordem/duplicados, transições inconsistentes, snapshot incompatível e relógio anterior à última avaliação geram INVALID_HISTORY. Projeção inválida não inventa deadline ou alerta. Um ciclo concluído mantém seu registro integral mesmo diante de relógio inválido posterior.

## Breach e notificação

SlaAlert: key `SLA:<cycleId>:<metric>:BREACHED`, cycleId, metric, detectedAt, recipientUserId, notified.

Primeira detecção interna de tempo excedido persiste alerta sob o mesmo lock de ciclos. Sem responsável, conserva indicador e não cria notificação pessoal; atribuição posterior não refaz essa primeira detecção. Com responsável, NotificationService usa a chave SLA como idempotencyKey global, sem acrescentar destinatário. Isso evita duplicação inclusive entre abas ou transferência durante retry.

Entrega pendente consulta o responsável atual, aplica TicketService/autorização e usa o evento persistido. Se notificação foi criada e o recibo SLA falha, retry encontra a mesma notificação e conclui o recibo. Alertas não desaparecem com resolução, reabertura ou publicação. CLIENT não emite nem recebe notificação de breach; ADMIN somente se for responsável. Operadores autorizados vêm do cadastro operacional existente.

Provider continua LOCAL_MOCK, com status de entrega existente. Nenhum e-mail real, pre-alerta, escalonamento ou alteração automática de status.

## UI e homologação

- `/admin/sla`: produto, prioridade, metas, pausa, versões/status, drawer de novo rascunho, publicação explícita e histórico/auditoria.
- SUPPORT/ADMIN: fila com badge/filtro de SLA, indicador e contador de vencidos sobre tickets autorizados; detalhe e drawer com metas, tempo ativo, prazo, estados/resultados e ciclos anteriores.
- CLIENT: resumo amigável de primeira resposta e resolução, somente no próprio chamado.
- Laboratório ADMIN: cenários isolados de limite exato, +1ms, pausa, resolução no prazo e resolução sem resposta. Usa o calculator real; não altera registros nem envia alertas.

Roteiro em SPEC_09_HUMAN_VALIDATION.md. Testes de entrega real local e concorrência usam Clock fake e relógio Playwright, sem espera de minutos.

## Verificação e limites

Suíte unitária e E2E incluem regras de política/ciclo/pausa, seleção temporal em reconciliação, alertas, roles/tenant e regressão completa da SPEC 08. Resultados finais registrados no PR e no roteiro.

Fora do escopo: calendário comercial, feriados, política por plano/cliente, pre-alerta, jobs/cron, browser fechado, autoscalada/autostatus, e-mail real, OpenRouter/OpenAI, Supabase/RLS reais, Gmail, Google Cloud, 7Service, infraestrutura cloud e SPEC 10 Satisfaction/Reporting.
