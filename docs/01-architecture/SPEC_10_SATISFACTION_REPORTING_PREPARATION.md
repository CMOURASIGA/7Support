# SPEC 10 - Satisfaction / Reporting: preparação

Status: RECORTE APPROVED em 08/10/2026; implementação autorizada por CHRISTIAN.

Este arquivo preserva a proposta original para histórico. As decisões aprovadas e os contratos implementados estão em [SPEC_10_LOCAL_SATISFACTION_REPORTING.md](SPEC_10_LOCAL_SATISFACTION_REPORTING.md), que prevalece sobre perguntas e propostas abaixo. A implementação parte de develop `fecab9f4f85c8c7ee9620d45aa865cab157752d4`. Human Validation da SPEC 10 permanece pendente.
Data: 08/10/2026. Base oficial: develop após SPEC 09 APPROVED.
Merge da SPEC 09: `653bce6bd1b61d03e6c5e5a51ab4a3f3780f5aa9`, PR #9.
Checkpoint funcional homologado: `20f6ad0c3ff104d444b7559102971803b5c53bd8`.
Encerramento documental da aprovação: `47873ca93438164e46dc4e69a2d7554ee0b5990a`.

Este documento propõe um recorte para revisão de CHRISTIAN. Propostas abaixo não são decisões homologadas nem autorização de implementação. Nenhuma branch de feature ou código da SPEC 10 foi iniciado.

## Objetivo e referências

Permitir ao CLIENT avaliar o atendimento do próprio chamado e à operação consultar indicadores derivados dos registros locais efetivos.

DEV_IMPLEMENTATION_PLAN.md prevê resolvido sim/não, rating 1..5, comentário e métricas por cliente/produto/tipo, primeira resposta, resolução, reabertura, SLA e satisfação. HUMAN_VALIDATION_MATRIX.md exige avaliação, filtros, métricas reais e ausência de mocks. DATABASE.md contém referência futura de rating opcional, sem autorizar banco real nesta fase.

Neste modo local-first, dados efetivos significam tickets, mensagens, eventos, ciclos SLA e avaliações persistidos pelos repositories locais. Não usar totais, percentuais ou séries hardcoded. Dados demo devem permanecer identificáveis; decidir abaixo se entram no relatório, sem apresentá-los como produção real.

## Regras da SPEC 09 preservadas

Reporting somente consulta os contratos homologados, sem alterar política, prioridade, resultados ou relógios:

- 24x7 em minutos corridos; UTC no domínio e fuso somente para apresentação.
- Política por produto + prioridade, selecionada no timestamp original; policyVersion congelada no ciclo.
- Primeira resposta somente PUBLIC_REPLY operacional SUPPORT/ADMIN, nunca pausada.
- Resolução pausa em WAITING_CUSTOMER; resolução sem resposta mantém firstResponse NOT_MET.
- REOPENED inicia outro ciclo; ciclos anteriores e suas políticas/resultados permanecem íntegros.
- Mudança de prioridade não altera o ciclo atual.
- Tickets anteriores sem backfill. NOT_CONFIGURED e INVALID_HISTORY não recebem resultados inventados.
- Breach idempotente e alerta somente ao responsável atual, quando houver.
- CLIENT recebe resumo amigável; não recebe diagnóstico, configuração ou auditoria técnica.
- Sem monitoramento com navegador fechado.

A pergunta de satisfação resolvido sim/não não substitui status RESOLVED do Ticket Core. Resposta negativa não autoriza reabertura, escalonamento ou mudança automática de status.

## Recorte inicial proposto

1. CLIENT avalia atendimento próprio após resolução: questão resolvida sim/não, rating opcional de 1 a 5 e comentário opcional.
2. Feedback vinculado ao evento de resolução e ao ciclo de atendimento, para preservar histórico de reaberturas.
3. SUPPORT/ADMIN consultam relatórios internos sobre tickets autorizados, com filtros por período, cliente, produto e tipo.
4. Indicadores de volume, reabertura, primeira resposta, resolução, SLA e satisfação com denominadores explícitos e estados sem dados.
5. Repositories locais versionados, serviços com autorização, idempotência e Web Locks para concorrência entre abas.
6. UI conforme padrão Consult Services/7Commander: formulário contextual/drawer, loading, erro, retry, toast, filtros e responsividade.

Relatórios CLIENT agregados, exportação, gráficos adicionais e comparação por responsável não estão automaticamente incluídos. Decidir antes de implementar.

## Decisões obrigatórias para revisão

| Tema | Proposta inicial | Decisão necessária |
|---|---|---|
| Momento da avaliação | Primeira entrada RESOLVED; avaliação também permitida após CLOSED | Confirmar estados elegíveis, prazo para avaliar e comportamento se reabrir antes de enviar |
| Cardinalidade | Uma avaliação por evento de resolução/ciclo de atendimento | Aprovar ou escolher uma única avaliação por ticket independentemente de reaberturas |
| Reabertura | Preservar feedback anterior; nova resolução gera nova oportunidade | Confirmar se feedback pendente do ciclo anterior fica indisponível após REOPENED |
| Identidade | Apenas requester CLIENT, sessão e tenant derivados do ticket | Confirmar; SUPPORT/ADMIN não avaliam em nome do cliente |
| Campos | Sim/não obrigatório; rating 1..5 e comentário opcionais, comentário até 2.000 caracteres | Aprovar obrigatoriedade, escala e limite |
| Edição | Envio imutável; nova avaliação somente em novo ciclo | Aprovar ou definir edição com histórico e janela de tempo |
| Legado | Sem solicitações retroativas de feedback; relatórios podem incluir tickets existentes com limitações explícitas | Confirmar tratamento de chamados anteriores sem ciclo SLA |
| Destinatário | Registro local, sem nova notificação na primeira versão | Confirmar se aviso ao responsável faz parte desta SPEC e qual idempotência aplica |
| Visibilidade do comentário | CLIENT vê o próprio; SUPPORT/ADMIN consultam conforme autorização operacional | Confirmar quem vê comentário e se relatório precisa incluir texto ou apenas agregados |
| Perfil dos relatórios | SUPPORT/ADMIN, filtrados pela autorização existente do TicketService | Confirmar eventual restrição de SUPPORT aos próprios atendimentos |
| Período | Intervalo UTC [início, fim), com escolha de datas apresentada no fuso definido | Definir fuso de apresentação e evento de referência de cada indicador |
| Coorte | Volumes por CREATED; feedback por submittedAt; tempos/SLA por marcos/ciclos concluídos no período | Aprovar coortes; não misturar silenciosamente datas de criação e resolução |
| Reabertura | Mostrar tickets reabertos distintos e número de eventos REOPENED separadamente | Definir denominador da taxa de reabertura |
| Tempo médio | Métricas por ciclo concluído, em minutos; primeira resposta sem marco excluída da média e contada como ausente | Aprovar média/mediana e tratamento do legado sem snapshot/pausas confiáveis |
| SLA | Taxa MET / (MET + NOT_MET), por métrica e ciclo; PENDING, NOT_CONFIGURED, INVALID_HISTORY separados | Aprovar denominadores e se exibir ciclos ou tickets únicos |
| Satisfação | Taxa de sim entre respostas sim/não; rating médio apenas entre ratings informados | Aprovar; não considerar rating ausente como zero |
| Taxa de resposta | Avaliações recebidas / oportunidades elegíveis na coorte aprovada | Definir oportunidades, inclusive em reaberturas e feedback pendente |
| Demo | Identificar dados demo, sem apresentar números como produção | Decidir inclusão padrão e filtro; avaliar se basta distinguir o ambiente local inteiro |
| Exportação | Fora do recorte inicial recomendado | Confirmar se CSV entra agora e quais campos autorizados pode conter |

Estas eram perguntas da preparação original; a aprovação posterior da SPEC 10 está registrada no contrato definitivo indicado no início. A aprovação da SPEC 09 permanece independente.

## Contratos indicativos

UI → SatisfactionService / ReportingService → TicketService / SlaService / repositories locais.

React não lê LocalStorage. Cálculos agregados devem ser puros, com inputs autorizados e Clock injetável apenas onde houver necessidade temporal. Reporting não dispara avaliações, recalcula políticas nem cria alertas como efeito da agregação; reutiliza projeção de leitura a definir em SlaService, preservando a avaliação operacional da SPEC 09.

Modelo indicativo SatisfactionRecord:

- id, ticketId, resolutionEventId, slaCycleId opcional quando aplicável;
- requesterUserId, tenantId e productId derivados do domínio autenticado;
- resolvedAnswer boolean, rating 1..5 ou null, comment ou null;
- clientRequestId, originKey única, submittedAt UTC;
- auditoria de envio; histórico de revisão apenas se edição for aprovada.

Chave sugerida, sujeita à decisão de cardinalidade: `SATISFACTION:<ticketId>:<resolutionEventId>:<requesterUserId>`. Idempotência no domínio de satisfação sob transação, incluindo retries com outro clientRequestId. Um replay deve retornar o registro existente, sem sobrescrever conteúdo por acidente. Caso conteúdo enviado divirja, definir resposta explícita de conflito em vez de tratar como edição silenciosa.

Identidade, tenant, ownership, produto, evento de resolução e elegibilidade são revalidados dentro da gravação. Reabertura concorrente exige validar o histórico atual no instante do commit. Definir ordem de locks compartilhada com Ticket Core se necessário, evitando deadlock e janela de autorização.

ReportingQuery indicativo: intervalo temporal, produto, cliente e tipo permitidos. ReportingResult deve conter contagem elegível, denominadores, totais excluídos por motivo, séries e indicadores opcionais quando há dados suficientes. Zero respostas não significa zero satisfação: representar sem avaliações. Médias sem marcos não devem ser preenchidas com zero.

## Semântica proposta dos indicadores

| Indicador | Fonte | Limite de interpretação |
|---|---|---|
| Tickets por cliente/produto/tipo | Ticket Core, snapshots e CREATED | Mesmo ticket contado uma vez na coorte; filtros sobre conjunto autorizado |
| Tickets resolvidos | Primeiro RESOLVED ou estado atual, conforme definição aprovada | Distinguir ticket único de resoluções por ciclo |
| Reabertura | Eventos REOPENED | Contar eventos e tickets distintos separadamente |
| Primeira resposta | Marco operacional validado | CLIENT, Atena e INTERNAL_NOTE não entram; sem marco fica ausente |
| Resolução | Marco e tempo ativo do ciclo SLA | Pausas preservadas; não reconstruir meta usando prioridade/política atuais |
| SLA primeira resposta/resolução | Resultados congelados e estados homologados | NOT_CONFIGURED e INVALID_HISTORY separados, sem backfill |
| Questão resolvida segundo CLIENT | resolvedAnswer | Não equivale a alteração de status operacional |
| Rating médio | Ratings informados | Null excluído; informar tamanho da amostra |
| Taxa de resposta | Feedbacks e oportunidades elegíveis | Depende de decisão explícita de cardinalidade/coorte |

Ticket existente sem ciclo SLA pode entrar em volume. Sua resolução/primeira resposta pode ter marco no Ticket Core, mas não deve receber tempo ativo SLA inferido ou suposta pausa ausente. Definir se tempos corridos legados terão indicador separado ou serão excluídos da média, sempre com contagem explicativa.

Dados inválidos não produzem durações negativas. Um ciclo em andamento não entra na média de ciclos concluídos. Históricos anteriores permanecem preservados, mesmo se o ticket for reaberto ou sua prioridade mudar.

## Testes e Human Validation a preparar depois da revisão

- CLIENT proprietário envia; outro usuário/tenant e SUPPORT/ADMIN não enviam em seu nome.
- Estados elegíveis, legado, resolução/fechamento/reabertura e sessão alterada durante transação.
- Campos inválidos, rating opcional, comentário vazio/limite, idempotência/retry e duas abas.
- Reabertura concorrente com envio sem duplicação, sobrescrita ou transição automática.
- Refresh preserva avaliação e vínculo; ticket manual/Atena seguem regra uniforme.
- Métricas calculadas de fixtures conhecidas, sem valores hardcoded: volumes, marcos, múltiplos ciclos e pausas.
- Denominadores/coortes/período [início, fim), limites de datas e apresentação de fuso.
- Sem dados, rating ausente, NOT_CONFIGURED, INVALID_HISTORY e legenda de demo.
- Isolamento Alpha/Beta em listas, contadores, filtros, comentários e eventual exportação.
- Regressão completa das SPECs 08 e 09: origem Atena, ciclos, seleção temporal, pausas e alertas únicos.
- Human Validation com pequenos conjuntos locais de resultado esperado; sem esperar minutos reais.
- Typecheck, lint, build, testes unitários/E2E e git diff --check antes da entrega para homologação.

## Fora do escopo e gate

Continuam excluídos OpenRouter/OpenAI reais, Supabase/RLS reais, Gmail, Google Cloud, 7Service e infraestrutura cloud. Proposta também exclui BI externo, jobs/cron, envio real de pesquisas, automação de reabertura/escalonamento, mudanças das regras de SLA, inferência de satisfação por IA e ranking de funcionários.

Modelo recomendado conforme DEV_MODEL_ROUTING.md: SOL, esforço médio. Nenhuma delegação/modelo especial exigido nesta preparação.

Próximo passo: CHRISTIAN revisa cardinalidade, elegibilidade, edição, coortes, denominadores, papéis e tratamento do legado/demo. Somente após aprovação explícita do recorte será autorizada a implementação da SPEC 10. SPEC 11 não iniciada.
