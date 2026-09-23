# 7Support - Integrations

## 1. 7Service

### Papel

O 7Service é a fonte administrativa de:
- clientes;
- usuários;
- produtos;
- contratos;
- licenças;
- acessos;
- entitlements.

### Integração mínima

O 7Support precisa obter:
- external_client_id;
- client display name;
- external_user_id;
- user display name;
- e-mail;
- external_product_id;
- product code/name;
- role;
- entitlement/access status.

### Regra

O 7Support pode manter projeções locais para desempenho e resiliência, mas não deve se tornar fonte de verdade de cadastro ou licenciamento.

### Estratégia

Preparar duas formas complementares:
1. leitura síncrona da autoridade para decisões críticas;
2. sincronização/eventos para projeções locais.

Falha temporária do 7Service não deve corromper tickets existentes.

## 2. 7HUB

### Papel

Portal do cliente.

### Escopo de suporte no 7HUB

- dashboard de suporte;
- meus chamados;
- novo chamado;
- detalhe;
- Hermes;
- ajuda.

O domínio e regras permanecem no 7Support.

### Regra

Não duplicar lógica de ticket no 7HUB. O 7HUB é uma superfície consumidora.

## 3. Gmail / Google Cloud

### Objetivo

Enviar notificações transacionais e cópia operacional para:
`contactconsultservices@gmail.com`.

### Uso

Eventos iniciais:
- ticket criado;
- resposta do suporte;
- solicitação de informação ao cliente;
- resolução;
- reabertura;
- falha importante de entrega para observabilidade interna.

### Arquitetura

```text
evento de negócio
  -> notifications
  -> worker/provider
  -> Gmail API
  -> email_deliveries
```

### Regras

- persistir ticket antes de enviar;
- idempotency key por evento/template/destinatário;
- retries limitados com backoff;
- registrar falha;
- não duplicar e-mail em retry;
- templates versionados;
- não colocar informação sensível desnecessária no e-mail;
- link deve direcionar ao 7Support/7HUB autenticado.

### Conta

A conta `contactconsultservices@gmail.com` deve receber cópia/notificação operacional.

O remetente definitivo deve ser configurável para permitir migração futura para conta institucional.

## 4. OpenAI - Hermes

### Objetivo

Responder dúvidas operacionais com base em documentação autorizada.

### Regras

- uso somente server-side;
- provider encapsulado por adapter;
- modelo configurável;
- timeout;
- retry limitado somente para falhas transitórias;
- custo/tokens/duração observáveis;
- nenhuma resposta sem base suficiente deve ser apresentada como fato;
- citar fontes internas quando tecnicamente disponível;
- não executar ação destrutiva ou alteração em produto na fase inicial.

### RAG

Fluxo recomendado:
1. identificar produto/contexto;
2. buscar fontes autorizadas;
3. filtrar por visibilidade;
4. montar contexto mínimo;
5. gerar resposta;
6. validar estrutura;
7. persistir run e mensagens;
8. oferecer escalonamento.

### Escalonamento

Ao criar ticket a partir do Hermes:
- gerar resumo;
- incluir produto;
- incluir pergunta original;
- incluir resposta relevante;
- armazenar referência à conversa;
- não copiar chain-of-thought;
- usuário revisa assunto/descrição antes do envio quando possível.

## 5. Produtos do ecossistema

Integrações futuras podem fornecer:
- versão atual;
- ambiente;
- correlation id;
- deep link para tela;
- erros conhecidos.

Nenhum produto deve precisar conhecer detalhes internos do banco do 7Support.

Usar contratos de API/eventos.

## 6. Webhooks

Quando existirem:
- assinatura obrigatória;
- timestamp/anti-replay;
- idempotência;
- logging sanitizado;
- rate limit;
- DLQ ou registro de falha.

## 7. Observabilidade externa

Toda chamada externa deve registrar:
- provider;
- operation;
- status;
- duration;
- correlation_id;
- retry_count;
- error_code sanitizado.

Nunca registrar credenciais ou tokens.
