# 7Support - Specification Status

**Data de referência:** 23/09/2026

## Status geral

SPEC 02 - LOCAL VALIDATION IN PROGRESS

## Decisões aprovadas

| Área | Status | Direção |
|---|---|---|
| Nome | APPROVED | 7Support |
| IA | APPROVED | Atena |
| Papel do 7Support | APPROVED | Domínio de atendimento e suporte |
| 7Service | DEFERRED | integração ocorrerá após o 7Support estar operacional |
| 7HUB | OUT OF SCOPE | Não consome 7Support no cenário atual; revisar apenas se houver decisão futura de produto |
| Identidade inicial | APPROVED | Supabase Auth local no 7Support; identidade central fica para fase posterior |
| Banco | APPROVED | Supabase/PostgreSQL |
| Stack | APPROVED | padrão 7Commander |
| Multi-tenant | APPROVED | isolamento obrigatório |
| Perfis | APPROVED | CLIENT, SUPPORT, ADMIN |
| Tickets | APPROVED | código amigável CS-000001 |
| Thread | APPROVED | respostas públicas + notas internas |
| UX labels | APPROVED | estados e processos por labels/badges |
| UX notifications | APPROVED | feedback de ações por toast/notificação |
| UX drawers | APPROVED | consulta rápida e ações contextuais |
| UX action icons | APPROVED | botões com ícones claros e tooltip |
| E-mail no chamado | APPROVED | visível, vindo do cadastro local do usuário e não editável no ticket |
| E-mail | APPROVED | notificação desacoplada |
| Conta operacional | APPROVED | contactconsultservices@gmail.com |
| Gmail API | APPROVED | provider inicial via Google Cloud |
| Atena | APPROVED | suporte baseado em conhecimento com AI Router multi-provider |
| AI Router | APPROVED | OpenRouter Free homologado como primário + OpenAI fallback |
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
- modelos OpenRouter gratuitos homologados podem mudar conforme disponibilidade;
- modelo OpenAI de fallback definitivo;
- estratégia final de embedding/vector store;
- calendário comercial de SLA.

Estas pendências devem permanecer configuráveis ou explicitamente não implementadas. O dev não deve inventar regra permanente.

## Ordem autorizada

1. SPEC 01 Foundation
2. SPEC 02 Local Identity/Roles/Tenant
3. SPEC 03 Ticket Core
4. SPEC 04 Support Operations
5. SPEC 05 Notifications
6. SPEC 06 Knowledge Base
7. SPEC 07 Atena + AI Router Foundation
8. SPEC 08 Atena Escalation
9. SPEC 09 SLA
10. SPEC 10 Satisfaction/Reporting
11. SPEC 11 7Service Integration, somente após sistema operacional completo

## Decisão temporária da SPEC 02

A validação inicial de login, sessão, papéis e contexto de tenant será realizada em LocalStorage com identidades fictícias. O Supabase não será provisionado antes da validação funcional.

O documento `docs/01-architecture/SPEC_02_LOCAL_MODE_AND_SUPABASE_ACTIVATION.md` define o schema, a migration e o RLS obrigatórios para ativação futura. LocalStorage não substitui RLS e não pode receber dados reais.

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

## Gate atual

SPEC 01 aprovada. Próxima etapa autorizada: SPEC 02 Local Identity, Roles and Tenant Boundary.

A integração com 7Service não deve ser antecipada.
