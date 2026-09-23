# 7Support - First Release Acceptance

## Objetivo

Definir o gate mínimo para considerar o núcleo de atendimento utilizável antes da evolução para Hermes, SLA avançado e 7HUB.

## Cenário base

Criar:
- Cliente A;
- Cliente B;
- usuário CLIENT A;
- usuário CLIENT B;
- operador SUPPORT;
- operador ADMIN;
- Produto 1 autorizado ao Cliente A;
- Produto 2 não autorizado ao Cliente A.

## Validação CLIENT

1. Login válido.
2. Dashboard carrega somente dados autorizados.
3. Novo chamado mostra somente produtos permitidos.
4. Identificação do usuário e cliente é preenchida automaticamente.
5. Cliente informa tipo, assunto, descrição, impacto e anexo.
6. Cliente não escolhe prioridade interna.
7. Ao enviar, ticket é persistido e recebe código `CS-xxxxxx`.
8. Confirmação aparece em tela.
9. Ticket aparece em Meus chamados.
10. Cliente consegue responder.
11. Cliente consegue baixar anexo autorizado.
12. Cliente não consegue acessar ticket de outro tenant.
13. Cliente não consegue acessar produto não autorizado alterando request manualmente.
14. Cliente não consegue visualizar INTERNAL_NOTE.

## Validação SUPPORT

1. Dashboard mostra fila real.
2. Novo ticket aparece como não atribuído ou conforme regra definida.
3. SUPPORT consegue assumir.
4. SUPPORT consegue responder publicamente.
5. SUPPORT consegue adicionar nota interna.
6. SUPPORT consegue alterar categoria.
7. SUPPORT consegue alterar prioridade.
8. SUPPORT consegue alterar status respeitando transições válidas.
9. Timeline registra alterações.
10. Resposta pública fica disponível ao cliente.
11. Nota interna permanece invisível ao cliente.
12. SUPPORT consegue resolver chamado.

## Validação de notificações

1. Ticket criado gera intenção de notificação.
2. Cliente recebe e-mail quando provider está operacional.
3. `contactconsultservices@gmail.com` recebe notificação operacional.
4. Resposta do suporte gera notificação ao cliente.
5. Resolução gera notificação.
6. Falha do provider não remove nem reverte ticket.
7. Retry não gera duplicação indevida.
8. Resultado do envio fica persistido.

## Validação de anexos

1. Storage privado.
2. Cliente A não acessa anexo do Cliente B.
3. URL temporária expira.
4. MIME/tamanho inválido é rejeitado.
5. Nome enviado não controla caminho físico inseguro.

## Validação de segurança

1. RLS ativa.
2. Tenant A isolado de Tenant B.
3. service role ausente do frontend.
4. credenciais Gmail ausentes do frontend.
5. OpenAI key ausente do frontend.
6. API não confia em client_id/requester_user_id enviados pelo browser.
7. INTERNAL_NOTE filtrada também na API.
8. operações críticas auditadas.
9. rate limit aplicado aos endpoints sensíveis.
10. erro não expõe stack/secret ao usuário.

## Validação técnica

Executar com sucesso:
- typecheck;
- lint;
- build;
- git diff --check;
- migrations do zero;
- testes de RLS;
- testes de integração;
- E2E prioritário.

## Critério de aprovação

A primeira versão só pode ser marcada como aprovada quando não houver FAIL crítico em:
- isolamento tenant;
- autorização;
- exposição de nota interna;
- persistência de ticket;
- acesso a anexos;
- secrets;
- integridade de auditoria.

Falha de e-mail não é FAIL de integridade do ticket, desde que seja registrada, recuperável e visível operacionalmente.

## Próximo gate

Após aprovação deste núcleo, iniciar Knowledge Base e Hermes conforme `DEV_IMPLEMENTATION_PLAN.md`.
