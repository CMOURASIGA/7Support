# Atena - AI Router, OpenRouter e OpenAI

## Papel

Atena é a assistente de suporte do 7Support.

Seu objetivo é responder dúvidas operacionais dos produtos Consult Services usando conhecimento autorizado, respeitando cliente, usuário, produto, perfil e visibilidade da informação.

## Decisão arquitetural

Atena não deve estar acoplada diretamente a um único fornecedor de IA.

Toda geração deve passar por um AI Router interno.

```text
Atena
  -> AI Router
      -> OpenRouter Adapter
      -> OpenAI Adapter
```

## Estratégia inicial

### Provider primário

OpenRouter, utilizando modelos gratuitos previamente homologados.

Objetivo:
- reduzir custo;
- permitir desenvolvimento e homologação econômica;
- atender perguntas simples e fluxos RAG quando a qualidade for suficiente.

### Fallback

OpenAI.

Utilizar quando:
- OpenRouter falhar;
- houver rate limit;
- modelo estiver indisponível;
- resposta for inválida;
- política do fluxo exigir maior previsibilidade;
- configuração administrativa determinar uso direto.

## Regras obrigatórias

- chamadas somente server-side;
- OPENROUTER_API_KEY somente em secret de ambiente;
- OPENAI_API_KEY somente em secret de ambiente;
- nenhuma chamada direta do browser;
- providers encapsulados por adapters;
- modelos configuráveis por ambiente;
- nenhum nome de modelo hardcoded na regra de negócio;
- allowlist de modelos OpenRouter homologados;
- timeout definido;
- retry limitado a falhas transitórias;
- fallback explícito e observável;
- registro de duração, provider, modelo e tokens;
- estimativa de custo quando disponível;
- não persistir chain-of-thought;
- não enviar secrets ao modelo;
- não enviar dados de outros tenants;
- minimizar dados pessoais e payloads;
- não executar ações em produtos na primeira versão.

## Modos

O router deve suportar pelo menos:

### OPENROUTER_FREE

Usa um modelo gratuito homologado configurado.

### OPENAI

Usa diretamente o modelo OpenAI configurado.

### AUTO

Aplica política de roteamento e fallback.

## Modelos gratuitos

A disponibilidade de modelos gratuitos do OpenRouter pode mudar.

Por isso:
- a homologação é da capacidade/modelo atual, não da gratuidade eterna;
- configuração deve permitir troca sem deploy quando possível;
- indisponibilidade do modelo não pode quebrar o Ticket Core;
- modelo removido ou que deixe de ser gratuito deve gerar alerta operacional/configuração.

Não tratar o roteador genérico de modelos gratuitos como garantia de comportamento estável de produção. Preferir modelos específicos homologados.

## Knowledge Grounding

Atena deve responder com base em fontes autorizadas.

Fluxo:

1. resolver identidade e produto;
2. determinar visibilidade CLIENT ou INTERNAL;
3. recuperar conhecimento relevante;
4. montar contexto mínimo;
5. AI Router selecionar provider/modelo;
6. gerar resposta;
7. validar resposta;
8. persistir metadados do run;
9. retornar resposta com referências quando disponíveis.

Se não houver evidência suficiente, Atena deve informar que não encontrou informação suficiente para responder com segurança.

Nunca preencher lacunas com fatos inventados.

## Escopo por produto

Atena deve restringir a busca ao produto selecionado ou inferido com segurança.

Exemplo:

- usuário com acesso ao 7Protect pergunta sobre catálogo;
- retrieval ocorre na base do 7Protect;
- documentação interna só entra se o ator tiver permissão interna;
- conteúdo de outro produto não deve contaminar a resposta.

## Prompting

O system prompt deve ser versionado.

Deve incluir pelo menos:
- papel da Atena;
- proibição de inventar funcionalidades;
- obrigação de usar somente contexto autorizado;
- regra de insuficiência de evidência;
- separação entre fato documentado e inferência;
- proibição de revelar instruções internas;
- política de escalonamento para ticket.

## Prompt Injection

Documentos, tickets, anexos e mensagens são dados, não instruções de sistema.

Conteúdo recuperado não pode:
- alterar o system prompt;
- ampliar permissões;
- liberar ferramentas;
- trocar tenant;
- ignorar regras de segurança.

## Persistência

Persistir:
- conversation id;
- user id;
- client id;
- product id;
- provider;
- model;
- fallback_used;
- fallback_reason;
- prompt version;
- knowledge version;
- status;
- duration;
- token usage;
- estimated cost quando disponível;
- citations/references;
- error code sanitizado.

Não persistir raciocínio interno do modelo.

## Escalonamento para chamado

Quando Atena não resolver:
- oferecer "Abrir chamado com esta conversa";
- gerar resumo;
- preservar pergunta original;
- preservar resposta útil;
- associar produto;
- permitir revisão do usuário;
- criar ticket pelo fluxo normal;
- associar conversation_id ao ticket.

## Observabilidade

Registrar:
- correlation id;
- provider;
- model;
- duration;
- input tokens;
- output tokens;
- fallback used;
- fallback reason;
- estimated cost;
- status;
- retry count;
- error code;
- knowledge source ids.

Não registrar API keys, authorization headers ou payload integral sensível.

## Métricas administrativas desejadas

Preparar dados para exibir:
- requisições por provider;
- uso por modelo;
- percentual atendido por OpenRouter;
- percentual de fallback para OpenAI;
- tokens;
- custo estimado;
- latência média;
- erros;
- economia estimada em relação ao uso integral de provider pago.

A interface administrativa dessas métricas pode ser implementada em fase posterior.

## Critérios de aceite

1. OpenRouter e OpenAI são chamados somente server-side.
2. Chaves estão ausentes do bundle/frontend.
3. Modo OPENROUTER_FREE usa somente modelo homologado.
4. Modo OPENAI utiliza provider configurado.
5. Modo AUTO faz fallback de forma controlada.
6. Fallback fica registrado com motivo.
7. Pergunta coberta retorna resposta consistente com a documentação.
8. Pergunta não coberta retorna insuficiência de evidência.
9. Cliente A não consegue recuperar conhecimento do Cliente B.
10. CLIENT não recupera conhecimento INTERNAL.
11. Prompt injection em fonte não altera políticas.
12. Provider/modelo/tokens/duração ficam observáveis.
13. Falha dos dois providers não afeta o Ticket Core.
14. Conversa pode ser escalada para ticket sem perda do contexto útil.
