# 7Support - API Contracts

## Objetivo

Definir contratos estáveis para frontend, integrações e futuras superfícies externas sem expor detalhes internos do banco.

## Princípios

- autenticação obrigatória;
- autorização backend;
- IDs internos não substituem contexto de sessão;
- paginação em listagens;
- filtros validados;
- erros estruturados;
- idempotência em operações sensíveis;
- versionamento quando houver consumidores externos;
- não expor INTERNAL_NOTE a CLIENT;
- não aceitar client_id/requester_user_id como autoridade enviados pelo browser.

## Recursos iniciais

### Tickets

- criar ticket;
- listar tickets autorizados;
- consultar ticket;
- responder;
- anexar;
- alterar status conforme perfil;
- atribuir;
- categorizar;
- alterar prioridade;
- resolver;
- reabrir.

### Knowledge

ADMIN:
- criar;
- editar;
- enviar para revisão;
- publicar;
- arquivar;
- versionar.

CLIENT/SUPPORT:
- consultar somente conteúdo permitido.

### Atena

- iniciar conversa;
- enviar mensagem;
- consultar histórico autorizado;
- escalonar para ticket.

## Erro padrão conceitual

```json
{
  "error": {
    "code": "TICKET_FORBIDDEN",
    "message": "Operação não autorizada.",
    "correlationId": "..."
  }
}
```

Não expor stack trace, SQL, token ou detalhes internos ao cliente.

## Idempotência

Obrigatória pelo menos para:
- criação de ticket quando houver retry de rede;
- envio de notificação;
- escalonamento Atena -> ticket;
- webhooks;
- operações externas que possam ser repetidas.

## Paginação

Preferir cursor em listagens de alto volume.

Parâmetros devem possuir limites máximos definidos para evitar consultas sem controle.

## Compatibilidade

O contrato deve permitir venda futura do 7Support sem exigir reescrita do domínio.

Isso não significa implementar integração com 7HUB agora.
