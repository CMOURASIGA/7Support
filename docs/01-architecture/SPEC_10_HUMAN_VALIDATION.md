# SPEC 10 - Human Validation

Status esperado da entrega: `READY FOR HUMAN VALIDATION`.

## Preparação reproduzível

1. Abrir o Preview em janela anônima.
2. Para dados operacionais reais, criar um chamado como CLIENT Alpha, assumir e resolver como SUPPORT. Não usar os tickets demo para validar o filtro Operacional.
3. Manter o ticket atribuído ao SUPPORT para validar o alerta de insatisfação.
4. Usar a origem `Demonstração` apenas para validar a separação visual dos dados sem gerar interpretação operacional.

## CLIENT Alpha: satisfação

1. Entrar com `cliente.alpha@demo.7support.local` / `demo-alpha`.
2. Abrir um chamado próprio resolvido.
3. Confirmar que o formulário exige Sim ou Não, aceita rating opcional 1..5 e comentário até 2.000 caracteres.
4. Enviar Não com rating 2 e um comentário reconhecível.
5. Esperado: toast de sucesso, registro imutável, comentário visível somente no próprio detalhe e formulário removido.
6. Recarregar. Esperado: avaliação preservada e nenhuma segunda oportunidade para a mesma resolução.
7. Abrir o mesmo endereço como CLIENT Beta. Esperado: chamado não encontrado, sem informação sobre Alpha.

## Reabertura e novo ciclo

1. Resolver um chamado e, antes da avaliação, reabri-lo como SUPPORT.
2. Esperado: a oportunidade antiga fica indisponível.
3. Resolver novamente. Esperado: uma nova oportunidade aparece; avaliações anteriores, se existentes, permanecem preservadas.

## Notificação interna

1. Após a avaliação negativa acima, entrar como SUPPORT responsável.
2. Esperado: exatamente uma notificação `Avaliação requer atenção` para o chamado.
3. Confirmar que comentário, rating detalhado e IDs técnicos não aparecem na notificação.
4. Recarregar CLIENT e SUPPORT. Esperado: nenhuma duplicação; ticket continua RESOLVED e prioridade inalterada.

## Relatórios SUPPORT/ADMIN

1. Entrar como SUPPORT e abrir `/support/reports`.
2. Esperado: cards de volume, tempos médio/mediano, reabertura, SLA, satisfação, rating e participação; todos mostram amostra/denominador quando aplicável.
3. Alternar 7, 30, 90 dias, mês atual e personalizado. Aplicar cliente, produto, tipo e origem.
4. Esperado: filtro `Operacional, sem demo` não mistura seeds. `Demonstração` mostra apenas registros identificados como demo.
5. Validar período sem registros. Esperado: `—` para taxas/médias sem denominador, nunca 0% inventado.
6. Validar desktop, tablet e celular, inclusive tabela com rolagem horizontal restrita ao componente.
7. Entrar como CLIENT e navegar diretamente para `/support/reports`. Esperado: `/forbidden`.

## Exportação

1. Exportar SUMMARY, TICKETS, SLA e SATISFACTION com filtros ativos.
2. Esperado: CSV usa o mesmo período e conjunto autorizado exibido.
3. Confirmar que SATISFACTION não contém comentário individual; nenhum arquivo contém IDs técnicos de ciclo/evento.
4. Usar texto iniciado por `=`, `+`, `-` ou `@` em um campo exportável. Esperado: valor neutralizado, sem fórmula executável.

## Regressão

- Escalonamento Atena da SPEC 08 continua criando um único ticket e origem aparece como Atena.
- Políticas, ciclos, pausas, resultados congelados e alertas SLA da SPEC 09 permanecem inalterados.
- Nenhum e-mail real, Supabase, RLS, 7Service ou job externo foi ativado.
- Refresh, duas abas e retry não duplicam avaliação nem notificação.

## Checkpoint de validação parcial - 09/10/2026

Checkpoint de origem: `6c3c16b390f7e3b71ee79fdcf656a6a0993389b7`.

- HV-02 validada no Preview com `CS-000004`: a avaliação do primeiro ciclo permaneceu imutável; a reabertura invalidou o ciclo encerrado; após novo fluxo `REOPENED -> IN_PROGRESS -> UNDER_ANALYSIS -> RESOLVED`, surgiu uma nova oportunidade e o histórico anterior foi preservado. O envio concorrente ou tardio após reabertura também permanece coberto pelos testes unitários de domínio.
- HV-03 validada para 7, 30 e 90 dias, mês atual, cliente, produto, tipo e origens `OPERATIONAL`, `MANUAL`, `ATENA`, `DEMO` e `ALL`. A validação encontrou uma falha no primeiro uso do período personalizado vazio; o seletor passa a inicializar um intervalo válido de 30 dias e ganhou cenário E2E específico.
- As quatro ações de exportação foram exercitadas no Preview. A suíte unitária confirma filtros compartilhados, exclusão de comentário e IDs internos e neutralização de CSV Injection.
- As regressões de Atena Escalation e SLA permanecem cobertas pela suíte integral de 156 testes unitários. Nenhuma integração externa foi ativada.
- O cenário E2E foi descoberto pelo Playwright, mas a execução local segue bloqueada pela ausência do binário Chromium no ambiente. A validação funcional foi executada no navegador do Preview; o novo cenário automatizado deve rodar no CI/Preview que disponibilize Chromium.
