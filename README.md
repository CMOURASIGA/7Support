# 7Support

Central de Atendimento e Suporte da Consult Services.

O 7Support é o domínio responsável por abertura, acompanhamento e gestão de chamados dos produtos do ecossistema Consult Services, incluindo comunicação cliente-suporte, anexos, notificações, SLA, base de conhecimento, auditoria e o assistente Hermes.

## Arquitetura do ecossistema

- **7Service**: control plane interno de clientes, usuários, produtos, contratos, licenças, acessos e entitlements.
- **7Support**: domínio de atendimento e suporte.
- **7HUB**: futuro portal do cliente e principal superfície de acesso ao suporte.
- **Hermes**: assistente de suporte baseado em conhecimento autorizado.

O 7Support não substitui nem duplica o 7Service.

## Stack de referência

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase/PostgreSQL
- Row Level Security
- Vercel
- Playwright
- OpenAI server-side para Hermes
- Gmail API/provider desacoplado para notificações

## Para desenvolver

Comece por:

1. `docs/DEV_START_HERE.md`
2. `docs/00-product/PRODUCT_SPEC.md`
3. `docs/01-architecture/ARCHITECTURE.md`
4. `docs/01-architecture/DATABASE.md`
5. `docs/01-architecture/SECURITY_AND_AUTH.md`
6. `docs/02-ux/UX_AND_NAVIGATION.md`
7. `docs/03-integrations/INTEGRATIONS.md`
8. `docs/DEV_IMPLEMENTATION_PLAN.md`
9. `docs/FIRST_RELEASE_ACCEPTANCE.md`
10. `docs/SPEC_STATUS.md`

## Regra principal

O desenvolvedor não deve inventar regras permanentes para itens marcados como pendentes em `SPEC_STATUS.md`. O desenvolvimento deve seguir a ordem das SPECs e preservar segurança, isolamento multi-tenant, auditoria e compatibilidade com 7Service/7HUB.
