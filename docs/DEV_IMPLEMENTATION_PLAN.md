# 7Support - Plano de Implementação

## Regra geral

A execução deve ser incremental e cada fase precisa preservar:
- typecheck;
- lint;
- build;
- migrations reproduzíveis;
- RLS;
- testes do escopo;
- documentação atualizada.

Não iniciar uma fase dependente enquanto a anterior possuir falha crítica de segurança ou domínio.

---

## SPEC 01 - Foundation

### Objetivo

Criar a base técnica seguindo o padrão 7Commander.

### Entregas

- Next.js App Router;
- TypeScript;
- Tailwind;
- estrutura de componentes;
- Supabase;
- variáveis de ambiente;
- lint;
- formatting;
- typecheck;
- Playwright;
- logs;
- tratamento global de erros;
- health endpoint;
- layouts base;
- environments dev/preview/prod.

### Estrutura sugerida

```text
src/
  app/
  components/
  features/
  lib/
  services/
  types/
  config/

supabase/
  migrations/
  functions/

docs/
```

### Aceite

- aplicação sobe local e Preview;
- health 200;
- Supabase conectado;
- nenhum secret no frontend;
- build aprovado.

---

## SPEC 02 - Identity, Roles and Tenant Boundary

### Objetivo

Implementar identidade, perfis e isolamento.

### Entregas

- CLIENT;
- SUPPORT;
- ADMIN;
- resolução de client/user context;
- referências ao 7Service;
- RLS;
- middleware/guards;
- página forbidden;
- sessão;
- testes tenant A x tenant B.

### Aceite crítico

CLIENT A não acessa qualquer dado do CLIENT B.

---

## SPEC 03 - Ticket Core

### Objetivo

Implementar abertura e consulta de chamados.

### Entregas

- migrations de tickets;
- public_code CS-000001;
- tipos;
- impacto;
- status;
- mensagens públicas;
- anexos privados;
- Dashboard CLIENT;
- Meus chamados;
- Novo chamado;
- detalhe;
- timeline básica.

### Regras

- identidade preenchida automaticamente;
- produtos derivados do acesso;
- cliente não define prioridade interna;
- ticket persistido antes de notificação.

### Aceite

Cliente cria, lista, consulta e responde ticket autorizado.

---

## SPEC 04 - Support Operations

### Objetivo

Criar operação interna.

### Entregas

- dashboard suporte;
- fila;
- todos os chamados;
- filtros;
- assumir;
- transferir;
- prioridade;
- categoria;
- status;
- PUBLIC_REPLY;
- INTERNAL_NOTE;
- resolução;
- reabertura;
- timeline/auditoria operacional.

### Aceite crítico

CLIENT nunca recebe INTERNAL_NOTE por UI, API, realtime, export ou busca.

---

## SPEC 05 - Notifications

### Objetivo

Notificar eventos sem acoplar consistência ao provider.

### Entregas

- notifications;
- email_deliveries;
- templates;
- Gmail API/provider adapter;
- confirmação de abertura;
- resposta do suporte;
- resolução;
- cópia para contactconsultservices@gmail.com;
- retries;
- idempotência;
- observabilidade.

### Aceite

Falha do Gmail não desfaz ticket nem resposta.

---

## SPEC 06 - Knowledge Base

### Objetivo

Criar fonte de conhecimento confiável.

### Entregas

- knowledge_sources;
- visibilidade CLIENT/INTERNAL/BOTH;
- produto;
- versão;
- CRUD ADMIN;
- busca;
- ingestão inicial;
- versionamento/checksum;
- preparação para embeddings.

### Aceite

Conteúdo interno nunca aparece para CLIENT.

---

## SPEC 07 - Atena + OpenAI Foundation

### Objetivo

Disponibilizar assistente de suporte com provider real controlado.

### Entregas

- chat;
- contexto de produto;
- retrieval;
- provider adapter;
- OpenAI como provider inicial aprovado, exclusivamente server-side;
- API key somente em secret de ambiente;
- model configurável por ambiente;
- provider adapter para evitar acoplamento;
- prompt versionado;
- timeout/retry;
- ai_conversations;
- ai_messages;
- ai_runs;
- observabilidade;
- resposta de insuficiência de evidência;
- citações quando aplicável.

### Regras

- não inventar;
- não executar ações nos produtos;
- não expor outros tenants;
- não persistir chain-of-thought.

### Aceite crítico

Pergunta não coberta deve resultar em resposta de insuficiência e não em fato inventado.

---

## SPEC 08 - Atena Escalation to Ticket

### Objetivo

Transformar conversa não resolvida em ticket.

### Entregas

- CTA Abrir chamado com esta conversa;
- resumo;
- associação da conversa;
- prefill;
- revisão do usuário;
- criação de ticket;
- ai_escalations.

### Aceite

O ticket preserva contexto útil sem exigir repetição integral.

---

## SPEC 09 - SLA

### Objetivo

Adicionar controle operacional.

### Entregas

- políticas;
- prioridade;
- first response due;
- resolution due;
- pausa em WAITING_CUSTOMER se regra aprovada;
- alertas;
- vencimento;
- filtros;
- indicadores.

### Regra inicial

Valores definitivos de SLA devem ser configuráveis. Não hardcodar regra comercial como permanente.

### Aceite

Mudança de política não exige alterar código comum.

---

## SPEC 10 - Satisfaction and Reporting

### Entregas

- resolvido sim/não;
- rating 1..5;
- comentário;
- métricas;
- tickets por cliente;
- por produto;
- por tipo;
- tempo de primeira resposta;
- tempo de resolução;
- reabertura;
- SLA;
- satisfação.

### Aceite

Métricas derivadas de dados reais, sem mocks.

---

## SPEC 11 - 7Service Integration

### Objetivo

Substituir quaisquer mocks/projeções provisórias por integração oficial.

### Entregas

- clientes;
- usuários;
- produtos;
- acessos;
- entitlements;
- sync;
- estados de falha;
- auditoria;
- reconciliação.

### Aceite

Produto não autorizado não aparece e não pode ser forçado por API.

---

## SPEC 12 - 7HUB Integration

### Objetivo

Expor experiência cliente no portal.

### Entregas

- contratos de API;
- navegação;
- deep links;
- SSO/identidade compartilhada conforme arquitetura do ecossistema;
- migração da superfície cliente sem duplicação de regra.

### Aceite

7HUB consome o domínio, não replica banco/lógica.

---

# Gates de qualidade por SPEC

Executar:
- typecheck;
- lint;
- build;
- git diff --check;
- testes unitários relevantes;
- testes de integração;
- E2E do fluxo;
- Human Validation quando houver interface.

## Security Gate obrigatório antes de produção

- RLS testada;
- tenant isolation;
- INTERNAL_NOTE isolada;
- anexos privados;
- secrets server-side;
- rate limiting;
- autorização backend;
- prompt injection tests;
- idempotência de notificações;
- audit logs;
- backup/restore verificado.

## O que não fazer

- não duplicar 7Service;
- não transformar 7Support em cadastro mestre;
- não expor cliente ao frontend administrativo do 7Service;
- não usar Gmail como storage de ticket;
- não usar e-mail como chave;
- não permitir prioridade crítica escolhida diretamente pelo cliente;
- não criar IA sem knowledge boundary;
- não colocar OpenAI key no browser;
- não implementar autoação em produtos nesta fase;
- não hardcodar produtos atuais como enum estrutural;
- não apagar histórico operacional pelo fluxo normal.
