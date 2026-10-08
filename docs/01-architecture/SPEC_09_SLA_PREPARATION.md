# SPEC 09 - SLA: preparação do recorte

Status: PREPARED FOR REVIEW, somente documentação. Nenhuma decisão abaixo autoriza código.
Data: 08/10/2026. Continuidade: develop após integração da SPEC 08 APPROVED, merge `65b2da8672a7827f9b97a4f0b3fe108d02939eb7`. Commit de acesso rápido `f6c252b3a4af722ad06ff8360f0b284cecc6e812` preservado.

## Objetivo e base existente

Adicionar controle local-first de prazo de primeira resposta e resolução, com políticas configuráveis, indicadores e alertas locais auditáveis. Abrange chamados manuais e originados pela Atena, sem alterar a cardinalidade ou a idempotência da SPEC 08.

Referências: DEV_IMPLEMENTATION_PLAN.md (SPEC 09), PRODUCT_SPEC.md (ADMIN configura políticas; SUPPORT opera atendimento) e TICKET_STATE_MACHINE.md (direção de estados). A máquina de estados existente permanece autoridade de transição. CLIENT informa impacto; prioridade operacional continua controlada por SUPPORT/ADMIN.

Não existem metas comerciais definitivas ou calendário comercial aprovados. Não presumir durações, horário útil, feriados, fuso ou regra de pausa como decisões permanentes.

## Recorte inicial recomendado, ainda sujeito a aprovação

- Políticas locais versionadas por produto e prioridade LOW/MEDIUM/HIGH/CRITICAL, com metas positivas em minutos para primeira resposta e resolução.
- ADMIN cria/publica nova versão; SUPPORT consulta e opera chamados; CLIENT vê apenas prazo/situação de seus próprios chamados.
- Cálculo determinístico por relógio injetável. Datas persistidas em UTC; fuso somente na apresentação. Sem IA.
- Tempo corrido 24x7 para a primeira versão. Horário comercial, feriados e calendários regionais ficam para evolução após definição do produto.
- Congelar a versão da política no ciclo de atendimento, sem recalcular chamados automaticamente quando a política for editada.
- Chamados novos recebem a política publicada compatível, quando existir. Sem política válida, mostrar NOT_CONFIGURED; a abertura do ticket continua funcionando.
- Chamados existentes permanecem NOT_CONFIGURED nesta primeira entrega. Aplicação retroativa, backfill e alertas sobre histórico anterior ficam fora do recorte recomendado.
- Avaliar alertas no uso do sistema: leitura da fila/detalhe e ações do TicketService. Não existe monitoramento enquanto o navegador estiver fechado.

As recomendações precisam ser aprovadas antes da implementação; não são regras homologadas.

## Decisões que precisam de revisão

| Tema | Proposta inicial | Decisão necessária |
|---|---|---|
| Calendário | Minutos corridos, 24x7 | Aprovar recorte ou definir calendário útil e fuso |
| Metas | Cadastro ADMIN, sem valores comerciais inventados | Definir valores fictícios de homologação e quais prioridades/produtos exigem política |
| Pausa | pauseWhileWaitingCustomer explícito na política; recomendado pausar somente resolução | Confirmar se primeira resposta também pausa e se essa pausa será habilitada |
| Primeira resposta | Primeira PUBLIC_REPLY de SUPPORT/ADMIN no ciclo | Confirmar tratamento de resolução pública sem resposta anterior |
| Resolução sem resposta | Encerrar ciclo e registrar primeira resposta não atendida; não inventar resposta | Aprovar representação de NOT_MET e sua exposição ao CLIENT |
| Reabertura | Novo ciclo, nova política vigente, dois novos relógios; preservar ciclos anteriores | Confirmar se primeira resposta reinicia ou somente resolução |
| Mudança de prioridade | Manter snapshot do ciclo inicial; prioridade nova não reinicia relógios | Aprovar ou exigir recalcular meta com tempo já consumido e auditoria explícita |
| Edição de política | Nova versão só afeta novos ciclos | Confirmar política de aplicação a chamados já abertos |
| Chamados anteriores | NOT_CONFIGURED, sem backfill automático | Confirmar recorte ou definir ativação/manual retroativa |
| Alerta próximo do limite | Desabilitado até limiar explícito; vencimento como evento básico | Definir percentual/antecedência, destinatário e se alerta prévio entra nesta SPEC |
| Destinatário do vencimento | Responsável atual; sem responsável, indicador na fila | Confirmar se ADMIN deve receber notificação e se CLIENT deve receber alerta |
| Configuração por cliente/plano | Fora da primeira versão | Confirmar políticas globais por produto/prioridade ou introduzir precedência multi-tenant |

Nenhuma aprovação da SPEC 08 resolve estas decisões. Se o recorte exigir calendário, reabertura ou prioridade diferentes, atualizar este documento antes de iniciar código.

## Semântica proposta dos relógios

Início: timestamp do evento CREATED, incluindo origem ATENA. O ciclo de reabertura, se aprovado, começa no evento REOPENED.

Primeira resposta: apenas PUBLIC_REPLY de SUPPORT/ADMIN. Mensagem de abertura do CLIENT, resposta do CLIENT, nota interna, atribuição, transferência e mensagens da Atena não satisfazem a meta. Um segundo envio público não reinicia nem substitui o primeiro marco.

Resolução: primeiro evento de entrada em RESOLVED no ciclo. CLOSED conserva resultado e auditoria; não modifica retroativamente a data de resolução.

| Estado | Direção proposta |
|---|---|
| OPEN | Relógios ainda não satisfeitos ativos |
| IN_PROGRESS | Relógios ainda não satisfeitos ativos |
| UNDER_ANALYSIS | Relógios ainda não satisfeitos ativos |
| WAITING_CUSTOMER | Resolução pausa somente se política aprovada habilitar; primeira resposta conforme decisão acima |
| RESOLVED | Resolução satisfeita; primeira resposta sem marco deve ter tratamento explícito aprovado |
| CLOSED | Ciclo encerrado, resultados preservados |
| REOPENED | Novo ciclo recomendado, sujeito à decisão de produto |

Intervalos de pausa são [entrada, saída), nunca sobrepostos. Pausa aberta é limitada ao instante de avaliação. Múltiplas pausas não podem subtrair tempo duas vezes. Tempo ativo nunca negativo. Resposta e resolução preservam o resultado no instante do marco, mesmo quando o relógio atual avança.

Definir uma convenção única no recorte aprovado: recomendado marco atendido no prazo quando activeElapsed <= target; enquanto sem marco, vencido quando activeElapsed > target. O instante exato do limite não deve ser tratado de forma diferente por telas e alertas. Precisão e arredondamento de apresentação não podem alterar classificação.

Mudança do relógio local para trás, timestamps inválidos ou histórico insuficiente devem gerar estado não calculável explícito, sem inventar prazo ou emitir alertas falsos. Horário do navegador não é autoridade de produção; nesta fase é uma limitação do modo local-first.

## Arquitetura e modelos propostos

```text
UI -> SlaService -> SlaPolicyRepository / TicketService / SlaEvaluationRepository
                -> SlaCalculator (puro, Clock injetável)
                -> NotificationService (somente eventos locais aprovados)
```

React não lê/grava LocalStorage. A autorização usa sessão atual e limites do TicketService; não aceita userId, tenantId ou produto da UI como autoridade. Detalhes de políticas e IDs técnicos não devem aparecer ao CLIENT.

Modelos indicativos, não contratos finais:

- SlaPolicyVersion: id, policyId, version, productId, priority, firstResponseMinutes, resolutionMinutes, pauseWhileWaitingCustomer, calendarMode, status, createdBy/At e publishedAt. Publicação imutável; correção cria nova versão.
- TicketSlaCycle: id, ticketId, tenantId, requesterUserId, cycleNumber, policyVersionId, policySnapshot, startedAt, firstResponseAt, resolvedAt, endedAt, pausas e eventos de auditoria.
- SlaEvaluation: ciclo, métrica, meta, tempo ativo, restante, dueAt quando calculável, evaluatedAt e situação NOT_CONFIGURED/ON_TRACK/PAUSED/MET/BREACHED/NOT_MET/INVALID_HISTORY. Separar resultado atendido/descumprido de estado ativo/pausado para não ocultar vencimento anterior.
- SlaEvent: id, cycleId, metric, type, threshold, createdAt e chave de idempotência.

Na publicação, validar metas finitas/positivas e cobertura determinística de produto/prioridade. Não escolher política pelo primeiro elemento de um array nem criar duas políticas publicadas concorrentes sem regra de precedência. Ausência e ambiguidade devem ter tratamento explícito.

Revisar antes de codificar quais marcos entram no evento do Ticket Core e quais ficam no repository de SLA. Eventos atuais têm CREATED, resposta pública e status com timestamps; prioridade ainda usa descrição textual. Não derivar futuras regras de prioridade analisando texto humano. Mudanças necessárias devem ser localizadas, mantendo chamados anteriores e os testes de Atena.

## Falhas, idempotência e alertas

- Snapshot/ciclo deve ser único por ticket e evento de início: `SLA:<ticketId>:<startEventId>`.
- Alerta de vencimento deve ser único por ciclo/métrica/limiar: `SLA:<cycleId>:<metric>:<threshold>`.
- Usar locks/transação local para concorrência entre abas. Criar/reconciliar ciclo sem criar outro ticket.
- Se ticket for salvo e ciclo falhar, retry/leitura reconcilia a partir do evento original com a versão/snapshot de política definida no início; não escolher silenciosamente política nova no retry.
- Se alerta for persistido e notificação falhar, retry usa o mesmo evento e a idempotência do NotificationService. Não emitir nova notificação a cada render, refresh ou reavaliação.
- Alertas já emitidos não desaparecem quando alguém muda prioridade, resolve, reabre ou edita política; conservar a auditoria, sem reenvio indevido.
- Tenant e destinatário são derivados do ticket/sessão. Não expor assunto, conteúdo ou estado de outro CLIENT em contador, filtro ou alerta.
- Não enviar e-mail real, fazer escalonamento automático, transferir responsáveis ou mudar status pelo cálculo do SLA.

A escolha entre snapshot integrado ao Ticket Core e reserva persistida do SLA exige revisão arquitetural antes do código. Não repetir a fragilidade de idempotência restrita ao repository coordenador.

## UI proposta

ADMIN: cadastro/versionamento/publicação de políticas em superfície administrativa. SUPPORT/ADMIN: indicadores de primeira resposta e resolução no detalhe/drawer, filtros de situação na fila e contadores calculados sobre chamados autorizados. CLIENT: apresentação resumida nos próprios chamados, com distinção entre prazo, pausa e resultado, sem acesso à configuração interna.

Exibir claramente “SLA não configurado” quando não houver política. Não mostrar promessa de horário comercial quando o relógio for 24x7. Não declarar monitoramento contínuo: alertas locais são avaliados enquanto o aplicativo está em uso.

Seguir Consult Services/7Commander: ações contextuais, drawer, labels/badges, feedback de loading/erro/retry/toast e responsividade. Filtros não alteram timestamps, histórico ou máquina de estados.

## Testes e Human Validation a preparar após aprovação

1. Publicação ADMIN, bloqueio CLIENT/SUPPORT e sessão alterada durante gravação.
2. Metas inválidas, ausência de política, precedência e publicação concorrente.
3. Mesmos critérios de ciclo/política para ticket manual e ticket da Atena; regressão completa da SPEC 08.
4. Primeira resposta pública interna satisfaz meta; nota interna/resposta CLIENT/Atena/atribuição não satisfazem.
5. Limite exato, antes/depois do vencimento e resultado preservado após resposta/resolução.
6. Pausa desabilitada/habilitada, várias pausas, pausa aberta, saída e timestamp inválido.
7. Resolução/fechamento/reabertura conforme decisão aprovada, sem apagar ciclo anterior.
8. Prioridade e nova versão de política conforme regra aprovada, sem reiniciar tempo silenciosamente.
9. Falha ticket -> ciclo, falha evento -> notificação, retry e duas abas sem duplicidade.
10. Alertas únicos e destinatários corretos; responsabilidade transferida sem vazamento ou reenvio indevido.
11. CLIENT Alpha/Beta, apenas próprios tickets; filtros/contadores sem INTERNAL/diagnóstico.
12. Refresh preserva política, snapshot, ciclo, pausas, marcos e auditoria.
13. Chamados antigos preservados e NOT_CONFIGURED, sem backfill/alerta histórico não autorizado.
14. Relógio fake em unitários; nenhum teste dependente de esperar minutos reais.
15. Desktop/tablet/celular, labels de prazo/pausa/vencimento e cenário sem política.
16. Typecheck, lint, build, unitários, E2E e git diff --check; Human Validation antes de APPROVED.

## Fora do escopo e gate

Continuam excluídos: OpenRouter/OpenAI reais, Supabase, RLS real, Gmail, Google Cloud, 7Service e infraestrutura cloud. Também não entram neste recorte recomendado: jobs/cron cloud, execução com navegador fechado, calendário regional/feriados, mudança automática de estado, escalonamento automático, satisfação/reporting da SPEC 10 e integração de identidade.

Próximo passo: revisar as decisões deste documento, aprovar o recorte e só então autorizar branch e implementação da SPEC 09. A SPEC 09 não tem código iniciado; a existência deste arquivo não altera esse gate.
