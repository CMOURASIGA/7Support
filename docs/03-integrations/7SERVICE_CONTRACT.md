# 7Support - Contrato Futuro com 7Service

## Status

PLANEJADO - NÃO BLOQUEIA O DESENVOLVIMENTO OPERACIONAL DO 7SUPPORT.

## Estratégia

O 7Support deve ser construído primeiro como sistema completo e operacional de forma autônoma.

Somente após tickets, suporte, notificações, base de conhecimento, Atena, SLA e relatórios estarem validados será iniciada a integração com o 7Service.

## Fase atual

O 7Support mantém localmente:
- usuários;
- clientes;
- produtos;
- vínculos usuário-cliente;
- vínculos usuário-produto;
- papéis;
- acessos necessários ao domínio de suporte.

Autenticação inicial:
- Supabase Auth do próprio 7Support.

## Preparação obrigatória

Mesmo operando localmente, manter campos que facilitem integração futura:
- external_user_id nullable;
- external_client_id nullable;
- external_product_id nullable;
- identity_source;
- sync_status quando necessário.

IDs internos do 7Support permanecem estáveis e nunca devem ser substituídos por IDs externos.

## Fase futura

Quando a integração for autorizada:
- 7Service passa a fornecer identidade e dados mestres;
- usuários existentes devem ser reconciliados;
- produtos e acessos devem ser sincronizados;
- histórico do 7Support permanece intacto;
- nenhuma senha/hash é copiada;
- autenticação deve evoluir para identidade compartilhada/central.

## Regra de senha

Proibido:
- copiar hash de senha;
- ler senha;
- armazenar senha em tabela de negócio;
- sincronizar senha entre Supabases;
- enviar senha por integração.

## Reconciliação futura

Deve detectar:
- usuário local sem correspondente;
- usuário central bloqueado;
- produto removido;
- entitlement alterado;
- divergência de cliente;
- dado desatualizado.

Nenhuma reconciliação pode apagar ou reescrever histórico de tickets.
