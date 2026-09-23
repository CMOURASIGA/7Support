# 7Support - Product Specification

## Nome

7Support

## Posicionamento

Central de Atendimento e Suporte da Consult Services.

## Objetivo

Centralizar o atendimento dos clientes dos sistemas desenvolvidos pela Consult Services, com rastreabilidade completa do ciclo do chamado, comunicação entre cliente e suporte, notificações, conhecimento reutilizável e apoio do assistente Hermes.

## Usuários

### CLIENT

Usuário final de um cliente Consult Services.

Pode:
- visualizar seus chamados e, quando permitido, chamados da organização;
- abrir chamado somente para produtos aos quais possui acesso;
- responder interações públicas;
- anexar arquivos;
- acompanhar status;
- consultar histórico;
- avaliar atendimento;
- utilizar o Hermes;
- converter conversa do Hermes em chamado.

Não pode:
- visualizar notas internas;
- visualizar dados de outros clientes;
- manipular prioridade interna;
- definir SLA;
- atribuir atendente;
- acessar configuração administrativa.

### SUPPORT

Operador de suporte Consult Services.

Pode:
- visualizar fila autorizada;
- assumir e transferir chamados;
- responder cliente;
- criar notas internas;
- alterar status e prioridade;
- categorizar;
- consultar histórico do cliente e produto dentro do escopo necessário ao suporte;
- utilizar Hermes e base de conhecimento;
- registrar resolução.

### ADMIN

Administrador do 7Support.

Além das permissões de suporte, pode:
- configurar categorias;
- configurar prioridades;
- configurar políticas de SLA;
- administrar operadores;
- manter base de conhecimento;
- configurar integrações;
- consultar auditoria e métricas globais.

## Fluxo principal do cliente

1. Usuário autentica.
2. Sistema resolve identidade, organização e produtos autorizados.
3. Cliente acessa Dashboard ou Meus chamados.
4. Cliente abre novo chamado.
5. Sistema gera identificador amigável, por exemplo `CS-000001`.
6. Chamado é persistido antes de qualquer notificação.
7. Cliente recebe confirmação em tela.
8. Notificação por e-mail é enviada ao cliente.
9. Cópia/notificação operacional é enviada para `contactconsultservices@gmail.com`.
10. Chamado entra na fila de suporte.
11. Suporte assume, responde e altera o ciclo de status.
12. Cliente responde no próprio 7Support/7HUB.
13. Chamado é resolvido.
14. Cliente pode confirmar resolução, reabrir quando permitido e avaliar atendimento.

## Fluxo Hermes

1. Usuário seleciona Hermes.
2. O contexto permitido identifica cliente, usuário, produto e permissões.
3. Hermes consulta apenas conhecimento autorizado e relacionado ao produto.
4. Se houver evidência suficiente, responde com orientação operacional.
5. Se não houver evidência suficiente, declara que não encontrou informação suficiente.
6. Deve ser oferecida ação "Abrir chamado com esta conversa".
7. Ao abrir, o ticket recebe resumo e referência da conversa, sem exigir que o usuário repita tudo.

## Status iniciais

- OPEN
- IN_PROGRESS
- WAITING_CUSTOMER
- UNDER_ANALYSIS
- RESOLVED
- CLOSED
- REOPENED

Evitar criar novos status sem necessidade clara.

## Tipos de solicitação iniciais

- QUESTION
- INCIDENT
- SERVICE_REQUEST
- ACCESS
- IMPROVEMENT

## Impacto informado pelo cliente

- LOW_IMPACT
- PARTIAL_IMPACT
- BLOCKING

O cliente informa impacto. A prioridade operacional é calculada ou ajustada pelo suporte.

## Prioridades internas

- LOW
- MEDIUM
- HIGH
- CRITICAL

## Identificador de chamado

O identificador público deve ser amigável e sequencial ou pseudo-sequencial, por exemplo:

`CS-000001`

O UUID interno não deve ser usado como principal referência visual.

## Mensagens

Cada chamado deve suportar:

- PUBLIC_REPLY
- INTERNAL_NOTE
- SYSTEM_EVENT

Notas internas nunca podem ser retornadas a usuários CLIENT.

## Anexos

Suportar arquivos relevantes ao diagnóstico, com storage privado e acesso autorizado por URL assinada ou mecanismo equivalente.

## Avaliação

Após resolução/encerramento, permitir:

- resolvido: sim/não;
- nota opcional de 1 a 5;
- comentário opcional.

## Requisitos não funcionais

- responsivo;
- acessível;
- auditável;
- isolamento multi-tenant;
- nenhum secret no frontend;
- nenhuma dependência de e-mail para consistência do chamado;
- tratamento de loading, empty, forbidden, error e success;
- datas em UTC no banco e apresentação no timezone do usuário;
- logs estruturados;
- idempotência para notificações e operações sensíveis.

## Fora do escopo inicial

- suporte por WhatsApp ou Telegram como canal bidirecional;
- voz;
- billing;
- chatbot autônomo executando alterações em sistemas clientes;
- ingestão automática de e-mails como ticket;
- SLA contratual complexo por calendário regional;
- automação de correção técnica nos produtos.
