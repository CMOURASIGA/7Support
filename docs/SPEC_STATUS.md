# 7Support - Specification Status

**Data de referência:** 23/09/2026

## Status geral

FOUNDATION SPEC - READY FOR DEVELOPMENT

## Decisões aprovadas

| Área | Status | Direção |
|---|---|---|
| Nome | APPROVED | 7Support |
| IA | APPROVED | Atena |
| Papel do 7Support | APPROVED | Domínio de atendimento e suporte |
| 7Service | APPROVED | Continua control plane administrativo |
| 7HUB | APPROVED | Futuro portal do cliente |
| Cliente no 7Service | REJECTED | Cliente não usa frontend administrativo |
| Banco | APPROVED | Supabase/PostgreSQL |
| Stack | APPROVED | padrão 7Commander |
| Multi-tenant | APPROVED | isolamento obrigatório |
| Perfis | APPROVED | CLIENT, SUPPORT, ADMIN |
| Tickets | APPROVED | código amigável CS-000001 |
| Thread | APPROVED | respostas públicas + notas internas |
| E-mail | APPROVED | notificação desacoplada |
| Conta operacional | APPROVED | contactconsultservices@gmail.com |
| Gmail API | APPROVED | provider inicial via Google Cloud |
| Atena | APPROVED | suporte baseado em conhecimento com OpenAI server-side |
| Escalonamento IA -> ticket | APPROVED | com contexto |
| Anexos | APPROVED | privados |
| Auditoria | APPROVED | obrigatória |
| SLA | READY | configurável, valores comerciais futuros |
| Satisfação | READY | sim/não + rating opcional |
| WhatsApp/Telegram | OUT OF SCOPE | fase inicial |
| Ações automáticas da IA | OUT OF SCOPE | fase inicial |

## Pendências que não bloqueiam Foundation

- SLA comercial definitivo por plano/cliente;
- prazo de reabertura após encerramento;
- visibilidade de tickets por toda a organização vs somente solicitante;
- tamanho máximo definitivo de anexos;
- formatos finais dos templates de e-mail;
- domínio público definitivo;
- remetente institucional definitivo;
- política final de retenção LGPD;
- modelo OpenAI definitivo, mantendo OpenAI como provider inicial aprovado;
- estratégia final de embedding/vector store;
- calendário comercial de SLA.

Estas pendências devem permanecer configuráveis ou explicitamente não implementadas. O dev não deve inventar regra permanente.

## Ordem autorizada

1. SPEC 01 Foundation
2. SPEC 02 Identity/Roles/Tenant
3. SPEC 03 Ticket Core
4. SPEC 04 Support Operations
5. SPEC 05 Notifications
6. SPEC 06 Knowledge Base
7. SPEC 07 Atena Foundation
8. SPEC 08 Atena Escalation
9. SPEC 09 SLA
10. SPEC 10 Satisfaction/Reporting
11. SPEC 11 7Service Integration
12. SPEC 12 7HUB Integration

## Definition of Done inicial

A primeira versão utilizável deve permitir:

- cliente autenticado;
- produto autorizado;
- abertura de chamado;
- código público;
- confirmação em tela;
- e-mail;
- fila interna;
- suporte assumindo;
- resposta pública;
- nota interna;
- status;
- anexos;
- resolução;
- histórico;
- auditoria;
- isolamento multi-tenant.

Atena pode entrar após o ticket core estar validado.

## Gate

O repositório está documentalmente autorizado para início da SPEC 01, respeitando `DEV_START_HERE.md` e `DEV_IMPLEMENTATION_PLAN.md`.
