# 7Support - DEV START HERE

## Objetivo

O 7Support é o domínio de atendimento e suporte da Consult Services para os produtos do ecossistema 7.

Ele deve permitir que clientes abram, acompanhem e respondam chamados, recebam notificações e utilizem a assistente Atena para dúvidas operacionais. A equipe interna da Consult Services deve possuir uma visão própria para triagem, atendimento, notas internas, SLA, conhecimento e auditoria.

## Fronteiras obrigatórias

1. O 7Support não substitui o 7Service.
2. O 7Service continua sendo a fonte administrativa de clientes, usuários, produtos, contratos, licenças, acessos e entitlements.
3. O 7Support mantém somente dados do domínio de atendimento.
4. O futuro 7HUB será a principal porta de entrada do cliente para Suporte.
5. A equipe Consult Services poderá operar o atendimento por uma superfície interna integrada ao 7Service ou por uma interface interna do próprio 7Support, sem duplicar dados.
6. Cliente nunca deve receber acesso a telas administrativas do 7Service.
7. Atena é uma assistente de suporte, não uma autoridade sobre regras de negócio e não pode inventar funcionalidades ou estados do produto.
8. E-mail é canal de notificação, não fonte de verdade do chamado.
9. Toda autorização sensível deve ser validada no backend.
10. RLS, RBAC, auditoria e isolamento entre clientes são requisitos de arquitetura.
11. Atena deve usar um AI Router interno e não pode depender diretamente de um único provider.
12. OpenRouter é o provider primário inicial para modelos gratuitos homologados.
13. OpenAI é o fallback aprovado e pode ser usado diretamente quando o fluxo exigir maior previsibilidade ou qualidade.
14. Nenhuma chave de provider de IA pode ser exposta ao frontend.

## Stack de referência

Seguir o padrão do 7Commander:

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase/PostgreSQL
- Supabase Auth ou identidade central compatível
- Row Level Security
- APIs/Server Actions/Edge Functions para operações privilegiadas
- Vercel
- Playwright para E2E
- AI Router server-side
- OpenRouter + modelos free homologados
- OpenAI server-side como fallback
- Gmail API ou provider desacoplado para notificações transacionais

## Ordem de leitura

1. `00-product/PRODUCT_SPEC.md`
2. `01-architecture/ARCHITECTURE.md`
3. `01-architecture/DATABASE.md`
4. `01-architecture/SECURITY_AND_AUTH.md`
5. `02-ux/UX_AND_NAVIGATION.md`
6. `03-integrations/INTEGRATIONS.md`
7. `04-ai/ATENA_OPENAI.md`
8. `DEV_IMPLEMENTATION_PLAN.md`
9. `SPEC_STATUS.md`

## Regra de desenvolvimento

O desenvolvedor não deve começar por telas isoladas. A ordem correta é:

fundação técnica -> identidade/autorização -> banco/RLS -> tickets -> atendimento -> notificações -> conhecimento -> Atena/AI Router -> SLA/métricas -> integrações ampliadas.

Qualquer regra não definida deve ser tratada como pendência de especificação, não como liberdade para inventar comportamento.
