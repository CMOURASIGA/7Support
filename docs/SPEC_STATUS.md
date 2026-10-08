# 7Support - Specification Status

**Data de referência:** 08/10/2026

## Status geral

SPEC 01 APPROVED. SPEC 02 APPROVED (modo local). SPEC 02.1 APPROVED (fundação visual). SPEC 03 APPROVED. SPEC 04 APPROVED (modo local-first). SPEC 05 APPROVED (modo local-first). SPEC 06 APPROVED (modo local-first). SPEC 07 APPROVED (modo local-first). SPEC 08 APPROVED (modo local-first). SPEC 09 APPROVED (Human Validation concluída em 08/10/2026; modo local-first). SPEC 10 IMPLEMENTED / PENDING HUMAN VALIDATION (recorte aprovado; modo local-first). SPEC 11 NÃO INICIADA.

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
| SLA | APPROVED | SPEC 09 local-first 24x7; valores comerciais futuros |
| Satisfação | PENDING HUMAN VALIDATION | SPEC 10: avaliação imutável por resolução, sim/não + rating/comentário opcionais |
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
3. SPEC 02.1 Visual Alignment with 7Commander, homologação obrigatória antes de Ticket Core
4. SPEC 03 Ticket Core
5. SPEC 04 Support Operations
6. SPEC 05 Notifications
7. SPEC 06 Knowledge Base
8. SPEC 07 Atena + AI Router Foundation
9. SPEC 08 Atena Escalation
10. SPEC 09 SLA
11. SPEC 10 Satisfaction/Reporting
12. SPEC 11 7Service Integration, somente após sistema operacional completo

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

## Observações não bloqueantes da Human Validation da SPEC 04

- melhorar futuramente a densidade de algumas colunas da fila;
- avaliar compactação de eventos da timeline em históricos longos;
- melhorar a quebra visual de e-mail no drawer;
- concluir a regressão de responsividade.

## Gate atual

SPEC 01, 02, 02.1, 03, 04, 05, 06 e 07 aprovadas. A Human Validation da SPEC 07 homologou a experiência CLIENT e SUPPORT, as citações e a proteção dos diagnósticos. O isolamento Alpha/Beta, os cenários de provider, a idempotência, o grounding e a segurança funcional foram confirmados pela suíte automatizada. A validação manual específica do CLIENT Beta foi dispensada com base nessa cobertura.

O PR #7 foi integrado em `develop`, merge `f2c57f8f9bcc3dedadc802bcb1959c00028ff9f7`. SPEC 08 APPROVED em 08/10/2026. A Human Validation homologou abertura explícita, drawer de revisão, produto read-only, defaults, assunto/descrição derivados, escalada manual de resposta neutra, criação de CS-000008, notificação, vínculo persistido, bloqueio de segunda escalada e navegação CLIENT, mantendo os dados e o status inicial no Ticket Core.

A suíte automatizada mantém homologados idempotência por origem, concorrência entre abas, retry, recuperação entre ticket e vínculo, notificação única, isolamento Alpha/Beta, bloqueio SUPPORT/ADMIN, revalidação de sessão, exclusão de conteúdo revogado, limite de seis mensagens/8.000 caracteres e ausência de INTERNAL, diagnóstico e criação automática.

O PR #8 foi retirado de Draft e integrado em `develop` por merge normal, SHA `65b2da8672a7827f9b97a4f0b3fe108d02939eb7`, preservando o commit de acesso rápido de validação `f6c252b3a4af722ad06ff8360f0b284cecc6e812`. A SPEC 08 está encerrada. O recorte da SPEC 09 foi revisado e aprovado em 08/10/2026, com implementação autorizada a partir de develop `32b829f08fbed45089dac057fb828f3fb0e58618`, branch `feat/spec-09-sla`. SPEC 09 APPROVED em 08/10/2026, por confirmação explícita de CHRISTIAN: políticas imutáveis versionadas por produto/prioridade, seleção temporal pelo início do ciclo, dois relógios 24x7, pausas de resolução, reconciliação e breach local idempotente. Contrato em `docs/01-architecture/SPEC_09_LOCAL_SLA.md` e roteiro em `docs/01-architecture/SPEC_09_HUMAN_VALIDATION.md`. Human Validation registrada no roteiro. O PR #9 foi retirado de Draft e integrado em develop por merge normal `653bce6bd1b61d03e6c5e5a51ab4a3f3780f5aa9`, preservando o checkpoint funcional `20f6ad0c3ff104d444b7559102971803b5c53bd8` e a aprovação documental `47873ca93438164e46dc4e69a2d7554ee0b5990a`. SPEC 09 encerrada. O recorte da SPEC 10 foi revisado e aprovado explicitamente por CHRISTIAN em 08/10/2026. Implementação autorizada a partir de develop `fecab9f4f85c8c7ee9620d45aa865cab157752d4`, branch `feat/spec-10-satisfaction-reporting`. SPEC 10 IMPLEMENTED / PENDING HUMAN VALIDATION: satisfação imutável por nova resolução, reabertura cancela oportunidade ainda não enviada, idempotência por origem e reporting estritamente somente leitura. Contrato em `docs/01-architecture/SPEC_10_LOCAL_SATISFACTION_REPORTING.md`; roteiro em `docs/01-architecture/SPEC_10_HUMAN_VALIDATION.md`. SPEC 11 NÃO INICIADA; sem autorização para código. OpenRouter/OpenAI reais, Supabase, RLS real, Gmail, Google Cloud, 7Service e infraestrutura cloud permanecem fora do escopo.
