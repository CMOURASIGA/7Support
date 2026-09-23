# 7Support - Database

## Princípios

- PostgreSQL/Supabase.
- UUID como chave primária interna.
- Identificador amigável separado para tickets.
- RLS obrigatória em tabelas multi-tenant.
- Soft delete ou status em registros administrativos.
- Sem cascade destrutivo em histórico, auditoria ou mensagens.
- Timestamps em UTC.
- E-mail nunca é chave relacional.
- Referências ao 7Service devem usar IDs externos estáveis.
- Dados históricos importantes podem possuir snapshots de nome, produto e cliente.

## Entidades principais

### support_clients

Referência local mínima ao cliente administrado pelo 7Service.

Campos sugeridos:
- id uuid;
- external_client_id text unique not null;
- display_name text not null;
- status;
- synced_at;
- created_at;
- updated_at.

Não é cadastro mestre.

### support_users

Referência ao usuário/identidade.

Campos:
- id uuid;
- external_user_id text unique not null;
- external_client_id text not null;
- display_name;
- email_snapshot;
- user_type: CLIENT | INTERNAL;
- status;
- synced_at;
- timestamps.

### support_products

Referência ao catálogo de produtos do 7Service.

Campos:
- id;
- external_product_id;
- code;
- display_name;
- status;
- timestamps.

### support_user_product_access

Cache ou projeção de autorização.

Campos:
- id;
- external_user_id;
- external_client_id;
- external_product_id;
- role_code;
- entitlement_status;
- source_updated_at;
- synced_at.

Decisão crítica de acesso deve poder ser revalidada na fonte quando necessário.

## Tickets

### tickets

Campos mínimos:
- id uuid;
- public_number bigint ou sequence;
- public_code text unique;
- client_id;
- requester_user_id;
- product_id;
- type;
- category_id nullable;
- impact;
- priority;
- status;
- subject;
- description_snapshot opcional se mensagem inicial estiver separada;
- assigned_to_user_id nullable;
- first_response_at nullable;
- resolved_at nullable;
- closed_at nullable;
- reopened_at nullable;
- last_customer_message_at nullable;
- last_support_message_at nullable;
- created_at;
- updated_at.

Índices:
- public_code;
- client_id + created_at desc;
- status + priority + created_at;
- assigned_to_user_id + status;
- product_id + status;
- requester_user_id + created_at.

### ticket_messages

- id;
- ticket_id;
- author_user_id;
- author_type: CLIENT | SUPPORT | SYSTEM | AI;
- visibility: PUBLIC_REPLY | INTERNAL_NOTE | SYSTEM_EVENT;
- body;
- created_at;
- edited_at nullable;
- deleted_at nullable apenas se houver regra explícita.

Regra: INTERNAL_NOTE nunca deve ser retornada a CLIENT.

### ticket_attachments

- id;
- ticket_id;
- message_id nullable;
- storage_bucket;
- storage_path;
- original_filename;
- mime_type;
- size_bytes;
- uploaded_by;
- created_at;
- malware_scan_status nullable para evolução futura.

Bucket privado.

### ticket_events

Timeline imutável de eventos de negócio:
- id;
- ticket_id;
- event_type;
- actor_user_id nullable;
- old_value jsonb nullable;
- new_value jsonb nullable;
- metadata jsonb sanitizado;
- created_at.

Exemplos:
- CREATED
- ASSIGNED
- PRIORITY_CHANGED
- STATUS_CHANGED
- CATEGORY_CHANGED
- PUBLIC_REPLY_CREATED
- INTERNAL_NOTE_CREATED
- RESOLVED
- REOPENED
- CLOSED
- SLA_BREACHED

### ticket_assignments

Se for necessário histórico explícito:
- id;
- ticket_id;
- assigned_to_user_id;
- assigned_by_user_id;
- started_at;
- ended_at.

## Configuração

### ticket_categories

- id;
- name;
- code;
- product_id nullable;
- active;
- sort_order.

Categorias podem ser globais ou específicas por produto.

### sla_policies

- id;
- name;
- client_id nullable;
- product_id nullable;
- priority;
- first_response_minutes;
- resolution_minutes;
- active;
- effective_from;
- effective_to nullable.

A política mais específica prevalece sobre default.

### sla_state

Opcional se cálculo em runtime não for suficiente:
- ticket_id;
- first_response_due_at;
- resolution_due_at;
- first_response_breached_at;
- resolution_breached_at;
- paused_at;
- accumulated_pause_seconds.

## Conhecimento

### knowledge_sources

- id;
- product_id;
- source_type: MANUAL | DOC | URL | IMPORT;
- title;
- source_reference;
- status;
- visibility: CLIENT | INTERNAL | BOTH;
- version;
- checksum;
- created_by;
- created_at;
- updated_at.

### knowledge_chunks

Se RAG for utilizado:
- id;
- source_id;
- product_id;
- visibility;
- content;
- embedding;
- metadata;
- created_at.

A tecnologia de embedding deve permanecer substituível.

## Hermes

### ai_conversations

- id;
- client_id;
- user_id;
- product_id nullable;
- status;
- started_at;
- ended_at nullable;
- escalated_ticket_id nullable.

### ai_messages

- id;
- conversation_id;
- role: USER | ASSISTANT | SYSTEM;
- content;
- citations jsonb nullable;
- model;
- provider;
- token_usage jsonb nullable;
- created_at.

Não persistir chain-of-thought.

### ai_runs

- id;
- conversation_id;
- model;
- provider;
- prompt_version;
- knowledge_version;
- status;
- duration_ms;
- input_tokens nullable;
- output_tokens nullable;
- error_code nullable;
- created_at.

### ai_escalations

- id;
- conversation_id;
- ticket_id;
- summary;
- created_at.

## Notificações

### notifications

Representa intenção de notificar:
- id;
- ticket_id nullable;
- user_id nullable;
- channel: EMAIL | IN_APP;
- template_code;
- payload jsonb sanitizado;
- status: PENDING | SENT | FAILED;
- attempts;
- next_attempt_at nullable;
- created_at;
- sent_at nullable.

### email_deliveries

Detalhe do provider:
- id;
- notification_id;
- provider;
- provider_message_id nullable;
- recipient;
- status;
- error_code nullable;
- created_at;
- delivered_at nullable.

## Avaliação

### customer_satisfaction

- id;
- ticket_id unique;
- client_id;
- requester_user_id;
- resolved: boolean;
- rating smallint nullable check 1..5;
- comment nullable;
- created_at.

## Auditoria

### audit_logs

- id;
- actor_user_id nullable;
- actor_type;
- client_id nullable;
- entity_type;
- entity_id;
- action;
- before jsonb nullable;
- after jsonb nullable;
- correlation_id;
- created_at.

Não permitir edição pela aplicação.

## Sequência pública

Preferir sequence do PostgreSQL para public_number.

Exemplo de composição:
`CS-` + LPAD(public_number, 6, '0').

Nunca usar MAX()+1.

## Retenção

Política final de retenção deve ser definida antes de qualquer purge automático.

Até lá:
- não excluir fisicamente tickets;
- não excluir mensagens;
- não excluir auditoria;
- permitir anonimização futura somente mediante regra formal.
