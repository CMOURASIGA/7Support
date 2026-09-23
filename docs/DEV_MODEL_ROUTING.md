# 7Support - Estratégia de Modelo para Execução das SPECs

## Objetivo

Evitar uso de modelos de raciocínio pesado em tarefas que não exigem esse nível de capacidade, reduzindo consumo de tokens e custo de desenvolvimento.

## Regra geral

Usar o modelo mais simples capaz de executar a tarefa com segurança.

### SOL

Usar preferencialmente para:
- setup;
- telas;
- CRUD;
- formulários;
- componentes;
- CSS/Tailwind;
- documentação;
- testes simples;
- correções localizadas;
- templates de e-mail;
- relatórios;
- polish visual;
- ajustes sem impacto transversal.

### ASTRA

Reservar para:
- arquitetura;
- autenticação/autorização complexa;
- RLS multi-tenant;
- modelagem de identidade central;
- integrações entre sistemas;
- migrações sensíveis;
- AI Router;
- RAG;
- segurança;
- refatorações transversais;
- debugging complexo;
- análise de falhas que cruzem múltiplos domínios.

## Matriz por SPEC

| SPEC | Modelo preferencial | Esforço |
|---|---|---|
| 01 Foundation | SOL | Médio |
| 02 Identity, Roles and Tenant Boundary | ASTRA | Avançado |
| 03 Ticket Core | SOL | Médio |
| 04 Support Operations | SOL | Médio |
| 05 Notifications | SOL | Médio |
| 06 Knowledge Base | SOL | Médio |
| 07 Atena + AI Router Foundation | ASTRA | Avançado |
| 08 Atena Escalation to Ticket | SOL | Médio |
| 09 SLA | ASTRA | Médio |
| 10 Satisfaction and Reporting | SOL | Médio |
| 11 7Service Integration | ASTRA | Avançado |

Não existe SPEC 12 de 7HUB no escopo atual.

## Exceções

Dentro de uma SPEC SOL, uma subtarefa pode subir para ASTRA se envolver:
- RLS;
- segurança;
- concorrência;
- migração;
- integração transversal;
- incidente difícil de reproduzir.

Dentro de uma SPEC ASTRA, tarefas mecânicas devem ser delegadas ou executadas com SOL quando possível.

## Política de contexto

Para reduzir tokens:
- trabalhar uma SPEC por vez;
- carregar somente documentos necessários;
- não reenviar documentação inteira em todo ciclo;
- usar checkpoints objetivos;
- preservar decisões em arquivos;
- resumir evidências de teste;
- evitar repetição de logs extensos;
- limitar contexto ao domínio em execução.

## Gate

Nenhuma escolha de modelo substitui:
- typecheck;
- lint;
- build;
- testes;
- Human Validation;
- revisão de segurança quando aplicável.
