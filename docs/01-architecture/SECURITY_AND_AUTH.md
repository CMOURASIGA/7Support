# 7Support - Security and Authorization

## Objetivo

Garantir isolamento entre clientes, separação cliente/suporte/admin e proteção dos dados de atendimento.

## Perfis funcionais

- CLIENT
- SUPPORT
- ADMIN

Podem existir permissões mais finas posteriormente, mas não substituir autorização backend por ocultação de UI.

## Regras CLIENT

CLIENT pode:
- ler tickets do próprio escopo;
- criar ticket para produto autorizado;
- responder ticket próprio/autorizado;
- ler apenas mensagens públicas;
- anexar arquivo a ticket autorizado;
- avaliar ticket autorizado;
- usar Atena dentro do próprio contexto.

CLIENT nunca pode:
- consultar outro tenant;
- ler INTERNAL_NOTE;
- definir assigned_to;
- definir SLA;
- alterar prioridade interna;
- acessar audit_logs globais;
- acessar knowledge INTERNAL;
- consultar prompts internos do Atena.

## Escopo de ticket do cliente

Primeira implementação recomendada:
- requester vê seus próprios tickets.

Preparar arquitetura para modo futuro:
- membros autorizados da organização podem ver tickets da organização.

Não habilitar visibilidade organizacional ampla sem regra explícita.

## Regras SUPPORT

SUPPORT pode:
- ler tickets dentro da fila autorizada;
- responder publicamente;
- criar notas internas;
- alterar status, categoria e prioridade;
- assumir/transferir conforme permissão;
- ler conhecimento interno;
- utilizar Atena interno.

SUPPORT não deve administrar políticas globais sem permissão específica.

## Regras ADMIN

ADMIN pode:
- administrar configuração de suporte;
- administrar operadores e permissões do domínio;
- consultar auditoria;
- manter base de conhecimento;
- configurar SLA e integrações.

## RLS

RLS obrigatória pelo menos em:
- tickets;
- ticket_messages;
- ticket_attachments;
- customer_satisfaction;
- ai_conversations;
- ai_messages;
- notifications quando expostas a usuários.

### Exemplo conceitual CLIENT

Para ler ticket:
```text
authenticated_user
AND actor_type = CLIENT
AND ticket.requester_user_id = actor.external_user_id
```

ou política organizacional futura explicitamente autorizada.

### Mensagens

CLIENT:
```text
ticket autorizado
AND visibility != INTERNAL_NOTE
```

SUPPORT/ADMIN:
conforme papel backend validado.

## Backend authority

A UI nunca é autoridade para:
- product_id permitido;
- client_id;
- requester_user_id;
- priority interna;
- assigned_to;
- visibility de nota;
- status transition;
- entitlement.

Campos de identidade devem ser derivados da sessão/contexto, não aceitos cegamente do request.

## Transições de status

Implementar máquina de estado ou função central.

Exemplos:
- OPEN -> IN_PROGRESS
- IN_PROGRESS -> WAITING_CUSTOMER
- WAITING_CUSTOMER -> IN_PROGRESS
- IN_PROGRESS -> UNDER_ANALYSIS
- UNDER_ANALYSIS -> RESOLVED
- RESOLVED -> CLOSED
- RESOLVED/CLOSED -> REOPENED conforme regra
- REOPENED -> IN_PROGRESS

Não permitir qualquer status -> qualquer status.

## Anexos

- bucket privado;
- MIME allowlist;
- limite de tamanho configurável;
- nome físico não derivado diretamente do nome enviado;
- download por URL temporária;
- verificar autorização antes de gerar URL;
- não executar arquivos;
- registrar metadata;
- preparar integração futura com malware scan.

## Secrets

Somente server-side:
- SUPABASE_SERVICE_ROLE_KEY;
- OpenAI API key;
- Gmail credentials;
- signing secrets;
- webhook secrets.

Nunca prefixar secrets administrativos com NEXT_PUBLIC.

## IA

Atena:
- não recebe secrets;
- não recebe dados de outros clientes;
- não recebe payload integral de ticket quando não necessário;
- não executa alterações em produtos na primeira versão;
- não pode inventar resposta quando falta evidência;
- deve diferenciar documentação de inferência;
- deve respeitar visibilidade CLIENT/INTERNAL da base;
- deve registrar provider/modelo/duração/tokens sem chain-of-thought.

## Prompt injection

Conteúdo de documentos e mensagens deve ser tratado como dado, não como instrução de sistema.

Não permitir que conhecimento importado altere:
- políticas de autorização;
- system prompt;
- acesso a ferramentas;
- escopo de tenant.

## Rate limiting

Aplicar em:
- login;
- criação de ticket;
- upload;
- respostas;
- Atena;
- endpoints de integração;
- reenvio de notificação.

## Auditoria obrigatória

Registrar:
- criação;
- atribuição;
- transferência;
- mudança de prioridade;
- mudança de status;
- mudança de categoria;
- nota interna;
- resolução;
- reabertura;
- alteração de SLA/configuração;
- manutenção de conhecimento;
- escalonamento Atena -> ticket.

## Testes de segurança mínimos

1. CLIENT A não lê ticket do CLIENT B.
2. CLIENT não lê INTERNAL_NOTE.
3. CLIENT não consegue forçar product_id não autorizado.
4. CLIENT não consegue alterar assigned_to.
5. SUPPORT não acessa configuração ADMIN se não autorizado.
6. URL de anexo expira e exige autorização.
7. service role não aparece no bundle.
8. OpenAI key não aparece no cliente.
9. tentativa de prompt injection não amplia acesso.
10. ticket continua íntegro se e-mail/provider falhar.
