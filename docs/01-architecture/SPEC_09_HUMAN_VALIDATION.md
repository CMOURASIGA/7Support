# SPEC 09 - Human Validation

Status: PENDING. Não declarar APPROVED antes da homologação de CHRISTIAN.
Branch: `feat/spec-09-sla`, base develop `32b829f08fbed45089dac057fb828f3fb0e58618`.
Preview e SHA exatos: entrega e PR da SPEC 09. Acessar o Preview correspondente ao HEAD do PR.

## Preparação

Usar somente identidades fictícias e dados locais do Preview. O seletor de acesso rápido de validação permanece disponível no login.

- CLIENT Alpha: cliente.alpha@demo.7support.local / demo-alpha.
- CLIENT Beta: cliente.beta@demo.7support.local / demo-beta.
- SUPPORT: suporte@demo.7support.local / demo-suporte.
- ADMIN: admin@demo.7support.local / demo-admin.

Manter o mesmo navegador/perfil para compartilhar o banco local entre logins. Não usar os chamados demo anteriores para validar um novo relógio: eles exibem SLA não configurado. Para recomeçar em uma base vazia de homologação, usar um novo perfil/contexto de navegador, preservando o ambiente anterior.

## Cenários curtos, sem espera de minutos

| Etapa | Ação | Resultado esperado |
|---|---|---|
| Política | ADMIN abre Políticas SLA | 7Commander/7Finance, quatro prioridades, metas fictícias e pausa habilitada. Aviso de valores demo |
| Versionamento | Criar nova versão de uma política, salvar rascunho e Publicar | Versão anterior continua íntegra; nova publicação visível, com metas/pausa/data e auditoria. Publicada não tem edição |
| Limite | Em Laboratório, escolher política publicada e Limite exato | Primeira resposta ainda No prazo, resultado Em andamento |
| Breach | Após o limite | Primeira resposta Prazo excedido, sem esperar minutos |
| Pausa | Aguardando cliente | Resolução Prazo pausado, tempo ativo de 1 min; primeira resposta não pausa. Usar política demo MEDIUM |
| Resultado | Resolvida no prazo | As duas métricas Atendida no prazo |
| Sem resposta | Resolvida sem resposta | Primeira resposta Não atendida no prazo; resolução Atendida no prazo |
| Novo ticket | CLIENT Alpha abre chamado manual de 7Commander | Resumo amigável Em andamento; sem versão, ID ou auditoria técnica |
| Atena | CLIENT Alpha faz pergunta neutra e abre explicitamente chamado no drawer | Mesmo SLA aplicado ao chamado novo; produto fixo, vínculo único e navegação CLIENT preservados |
| Operação | SUPPORT abre o novo ticket, assume e envia nota interna | Detalhe mostra ciclo, meta, tempo ativo/prazo/estado/resultado; nota não atende primeira resposta |
| Resposta | Enviar resposta pública SUPPORT | Primeira resposta Atendida no prazo; refresh mantém o resultado |
| Pausa real | OPEN → IN_PROGRESS → WAITING_CUSTOMER | Resolução pausada e prazo atualizado ao retomar IN_PROGRESS; primeira resposta conserva resultado |
| Resolução | Resolver com motivo, depois encerrar | Primeiro marco de resolução é preservado no fechamento |
| Reabertura | Reabrir com motivo | Novo ciclo com dois resultados Em andamento; ciclo anterior preservado. Política do novo ciclo usa prioridade/publicação vigente |
| Fila/drawer | Fila de atendimento, Situação SLA, consulta rápida | Badge e filtro funcionam; contador de vencidos limita-se aos tickets autorizados da operação; drawer mostra os mesmos indicadores |
| Legado | Abrir chamado demo existente sem reabertura | SLA não configurado; não inventa prazo nem gera alerta histórico |
| Papéis | SUPPORT/CLIENT abrem /admin/sla diretamente | Acesso proibido; opção de configuração aparece somente para ADMIN |
| Isolamento | CLIENT Beta tenta URL do chamado Alpha | Chamado não encontrado; não vê prazo, assunto ou notificação Alpha |
| Mobile | Repetir ADMIN drawer e CLIENT detalhe em tela estreita | Campos legíveis, ações acessíveis, sem overflow horizontal |

O laboratório é isolado e usa o mesmo calculator puro. Não grava chamados/ciclos e não produz notificações. Não alterar o relógio do computador para homologar: isso intencionalmente produz INVALID_HISTORY. Breach real, destinatário e idempotência são comprovados pelos testes automatizados com Clock fake/relógio Playwright, sem espera real.

## Homologação técnica

`tests/unit/sla.cjs` cobre publicação ADMIN, bloqueios CLIENT/SUPPORT, concorrência, metas inválidas, revalidação de sessão, sem política, ticket manual/Atena, marcos públicos e notas/CLIENT, limite exato/+1ms, pausas habilitadas/desabilitadas e múltiplas, resultados de resolução, ausência de resposta, fechamento/reabertura, prioridade congelada, policyVersion congelada, seleção temporal original em falha/retry, instâncias concorrentes, alertas únicos/destinatários, ausência de notificação pessoal unassigned/CLIENT/ADMIN não responsável, isolamento Alpha/Beta, ausência de backfill, datas/histórico inválidos, relógio regressivo, refresh e laboratório puro.

`tests/e2e/sla.spec.ts` cobre configuração/publicação e laboratório ADMIN, bloqueio de rotas, resumo CLIENT, duas abas reais reconciliando um único ciclo, primeira resposta/refresh, breach no relógio Playwright com filtro/contador e um único alerta ao responsável, além de mobile.

Regressão completa da SPEC 08: suíte unitária Atena Escalation e todos os cinco cenários E2E, incluindo duas abas confirmando a mesma origem, drawer/cancelamento/edição, persistência/link CLIENT, resposta neutra, papéis e mobile. TicketService.createFromAtena/originKey não mudou de regra.

Verificação técnica em 08/10/2026: 146 testes unitários aprovados; suíte E2E completa com 32 cenários aprovada, incluindo regressão SPEC 08; seis cenários SLA reexecutados após a proteção adicional contra relógio regressivo entre ciclos, todos aprovados. Typecheck, lint, build e git diff --check aprovados. Nenhum teste exige esperar minutos de SLA. As pausas, políticas, ciclos, resultados e alertas são persistidos nos adaptadores locais versionados.

## Registro de decisão

- Human Validation: PENDING.
- Resultado visual: a preencher por CHRISTIAN.
- Observações: a preencher.
- Integração em develop: somente após aprovação.
- SPEC 10: não iniciada; exige autorização separada.
