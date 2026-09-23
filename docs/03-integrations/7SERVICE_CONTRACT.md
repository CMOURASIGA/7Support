# 7Support - Contrato com 7Service

## Objetivo

Reutilizar no 7Support os clientes, usuários, produtos e identidade administrados pelo 7Service.

## Decisão

O usuário criado e ativado no 7Service deve utilizar a mesma identidade para acessar o 7Support.

Isso significa mesma conta e mesma credencial de autenticação.

Não significa copiar, sincronizar ou armazenar senha entre sistemas.

## Regra de identidade

A arquitetura deve evoluir para uma identidade central compartilhada.

```text
7Service
  -> identidade central
       -> 7Commander
       -> 7Protect
       -> outros produtos
       -> 7Support
```

7Support deve confiar no identificador central da identidade.

Nunca criar uma segunda senha apenas para suporte quando o usuário já possui identidade ativa.

## Dados consumidos

O 7Support precisa obter pelo menos:

- central_user_id;
- external_client_id;
- user display name;
- e-mail;
- status do usuário;
- external_product_id;
- product code;
- product display name;
- role por produto quando relevante;
- entitlement/access status.

## Produtos no suporte

Ao abrir chamado, o cliente só pode selecionar produtos aos quais possui acesso ou vínculo válido conforme política do 7Service.

## Senhas

Proibido:
- copiar hash de senha;
- ler senha;
- armazenar senha em tabela de negócio;
- sincronizar senha entre Supabases;
- enviar senha por integração.

Autenticação deve ser resolvida pelo provedor de identidade central.

## Disponibilidade

Falha temporária do 7Service não deve apagar nem corromper tickets existentes.

Para autorização atual:
- usar projeção/cache local com validade definida;
- revalidar na autoridade para operações críticas conforme arquitetura disponível;
- registrar estado de sincronização.

## Provisionamento

Ao criar/ativar usuário no 7Service:
- identidade central existe;
- usuário pode ser projetado/sincronizado para 7Support;
- acesso ao suporte é concedido conforme política aprovada;
- login ocorre com a mesma identidade.

## Reconciliação

Deve existir mecanismo para detectar:
- usuário ausente localmente;
- usuário bloqueado;
- produto removido;
- entitlement alterado;
- divergência de client_id;
- dado desatualizado.

Nenhuma reconciliação deve alterar histórico de tickets.
