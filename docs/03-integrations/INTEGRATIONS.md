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
- Atena;
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

## 4. AI Router - Atena

### Objetivo

Permitir que Atena utilize múltiplos providers sem acoplamento do domínio.

### Providers aprovados inicialmente

#### OpenRouter

Papel inicial:
- provider primário para modelos gratuitos homologados;
- desenvolvimento;
- homologação;
- perguntas operacionais simples;
- respostas fundamentadas pelo RAG quando a qualidade homologada for suficiente.

Regras:
- somente server-side;
- chave em secret de ambiente;
- modelo configurável;
- manter allowlist de modelos homologados;
- não depender de um modelo gratuito permanecer gratuito indefinidamente;
- não assumir disponibilidade ilimitada;
- tratar rate limit, indisponibilidade e remoção do modelo;
- não usar seleção aleatória de modelo como garantia de qualidade em produção.

#### OpenAI

Papel:
- fallback aprovado;
- provider direto para fluxos que exijam maior previsibilidade/qualidade;
- contingência quando OpenRouter não estiver disponível ou não atender aos critérios.

Regras:
- somente server-side;
- chave em secret de ambiente;
- modelo configurável;
- timeout/retry;
- observabilidade de tokens e custo.

## 5. Política de roteamento

O AI Router deve suportar:

- provider principal;
- modelo principal;
- provider fallback;
- modelo fallback;
- modo AUTO;
- timeout;
- retry;
- critérios de fallback.

Exemplos de critérios de fallback:
- HTTP/provider error;
- rate limit;
- timeout;
- modelo indisponível;
- resposta vazia;
- schema inválido;
- validação de qualidade/grounding reprovada quando aplicável.

Fallback não deve mascarar falhas. Deve ser registrado.

## 6. Telemetria de IA

Persistir ou observar:
- provider;
- model;
- fallback_used;
- fallback_reason;
- duration;
- input_tokens;
- output_tokens;
- estimated_cost;
- status;
- error_code.

Isso deve permitir avaliar posteriormente:
- percentual atendido gratuitamente;
- percentual de fallback;
- qualidade por modelo;
- custo por provider;
- latência;
- falhas por modelo.

## 7. RAG

Fluxo recomendado:
1. identificar produto/contexto;
2. buscar fontes autorizadas;
3. filtrar por visibilidade;
4. montar contexto mínimo;
5. AI Router selecionar provider/modelo;
6. gerar resposta;
7. validar estrutura e grounding;
8. persistir run e mensagens;
9. oferecer escalonamento.

Nenhuma resposta sem base suficiente deve ser apresentada como fato.

## 8. Escalonamento

Ao criar ticket a partir da Atena:
- gerar resumo;
- incluir produto;
- incluir pergunta original;
- incluir resposta relevante;
- armazenar referência à conversa;
- não copiar chain-of-thought;
- usuário revisa assunto/descrição antes do envio quando possível.

## 9. Produtos do ecossistema

Integrações futuras podem fornecer:
- versão atual;
- ambiente;
- correlation id;
- deep link para tela;
- erros conhecidos.

Nenhum produto deve precisar conhecer detalhes internos do banco do 7Support.

Usar contratos de API/eventos.

## 10. Webhooks

Quando existirem:
- assinatura obrigatória;
- timestamp/anti-replay;
- idempotência;
- logging sanitizado;
- rate limit;
- DLQ ou registro de falha.

## 11. Observabilidade externa

Toda chamada externa deve registrar:
- provider;
- operation;
- status;
- duration;
- correlation_id;
- retry_count;
- error_code sanitizado.

Nunca registrar credenciais ou tokens.
