# SPEC 10 - roteiro de Human Validation

Status: PENDING. Recorte aprovado; esta entrega ainda não é APPROVED nem autorizada para merge. Usar Preview do PR e dados locais de homologação. Cada navegador/origem possui seu próprio armazenamento.

## Fluxo curto de satisfação

1. CLIENT Alpha (`cliente.alpha@demo.7support.local`, `demo-alpha`): abra ticket 7Commander. Não deve haver pergunta de satisfação antes da resolução.
2. SUPPORT (`suporte@demo.7support.local`, `demo-suporte`): abra o mesmo ticket, coloque Em atendimento, responda publicamente e resolva com motivo. Operador não pode enviar avaliação.
3. CLIENT Alpha: abrir ticket e conferir “Seu problema foi resolvido?”, Sim/Não obrigatório, estrelas e comentário opcionais. Enviar Não + 3 estrelas + comentário. Ticket deve continuar RESOLVED. Recarregar: feedback somente leitura, sem nova ação para a mesma resolução.
4. SUPPORT: conferir comentário; reabrir e resolver novamente. CLIENT: nova oportunidade e feedback anterior preservado. Enviar Sim sem nota/comentário; ausência não deve aparecer como zero.
5. Criar outro ticket, resolver e reabrir antes de avaliar. CLIENT: oportunidade antiga cancelada; nova resolução permite novo envio.
6. CLIENT Beta não deve consultar ticket/avaliação Alpha. SUPPORT/ADMIN não avaliam em nome do CLIENT.

## Relatórios

7. SUPPORT/ADMIN: menu Relatórios, aviso “Dados locais de homologação”, período atual e filtros Alpha/7Commander/Pergunta. Consultar. Comparar números com tickets e feedbacks dos passos anteriores. Os valores não são produção.
8. Conferir volume criado, tickets resolvidos/reabertos distintos e eventos REOPENED separados. Taxa de reabertura usa tickets resolvidos como denominador.
9. Conferir médias/medianas em minutos ativos e amostras. SLA usa MET/(MET+NOT_MET); PENDING, NOT_CONFIGURED e INVALID_HISTORY separados. Legado ou snapshot ausente não inventa tempo. Visitar detalhe operacional antes para persistir avaliação quando necessário, nunca através do relatório.
10. Satisfação usa submittedAt. Taxa positiva Sim/(Sim+Não); rating médio exclui notas ausentes. **Revisar a premissa explícita da taxa de resposta:** oportunidades por resolução no período, respostas dessas oportunidades até o fim do intervalo, excluindo canceladas pela reabertura. Este bloco tem coorte diferente e não mistura silenciosamente submittedAt.
11. Período futuro vazio: zeros de contagem, “Sem amostra” em médias/taxas e “Sem dados neste período” nas segmentações. Conferir fuso e intervalo UTC [start,end) efetivamente utilizado.
12. CLIENT: sem menu e acesso direto `/support/reports` bloqueado. Desktop e 390px: formulários/cards legíveis, sem overflow horizontal.

## Provas técnicas sem espera real

`npm run test:unit` usa Clock fake e executa concorrência, reabertura antes do commit, idempotência/conflito, sessão/tenant/requester, rating/comentário, marcos SLA, pausa, médias/medianas, intervalo exato/DST, coortes e cancelamentos. Captura armazenamento antes/depois para provar reporting sem seed/migração/reconciliação/breach/notificação/evaluatedAt. Suite inclui regressão SPEC 08/09.

`tests/e2e/satisfaction-reporting.spec.ts` verifica formulário, envio imutável, refresh, novo ciclo, cancelamento, duas abas, comentários operacionais, filtros/indicadores reais, armazenamento inalterado na consulta, acesso CLIENT e responsividade. Não exige esperar minutos reais. Os testes SLA existentes controlam o relógio do navegador.

## Registro da homologação

- Responsável: pendente.
- Data: pendente.
- Preview/SHA: usar o PR da entrega.
- Resultado: PENDING.
- Observações e revisão da coorte da taxa de resposta: pendentes.

Não iniciar SPEC 11 sem autorização explícita.

## Verificação automatizada da entrega

- Typecheck e lint: PASS.
- Build Next.js: PASS, rota `/support/reports` incluída.
- Unit tests: 195/195 PASS, incluindo 49 novos cenários Satisfaction/Reporting.
- E2E: 38/38 PASS, incluindo seis novos cenários e regressão integral SPEC 08/09.
- `git diff --check`: PASS.
- Screenshots de formulário, reporting desktop/mobile produzidos pela suíte Playwright e inspecionados.

Estes checks não substituem a aprovação humana acima. O PR permanece Draft até homologação.
