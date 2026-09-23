# Atena - OpenAI Integration Specification

## Papel

Atena é a assistente de suporte do 7Support.

Seu objetivo é responder dúvidas operacionais dos produtos Consult Services usando conhecimento autorizado, respeitando cliente, usuário, produto, perfil e visibilidade da informação.

## Provider inicial

OpenAI é o provider inicial aprovado.

A integração deve ocorrer exclusivamente no backend.

## Regras obrigatórias

- API key da OpenAI somente em secret de ambiente.
- Nenhuma chamada direta à OpenAI a partir do browser.
- Provider encapsulado por adapter.
- Modelo configurável por ambiente.
- Timeout definido.
- Retry limitado a falhas transitórias.
- Registro de duração, provider, modelo e uso de tokens.
- Não persistir chain-of-thought.
- Não enviar secrets ao modelo.
- Não enviar dados de outros tenants.
- Minimizar dados pessoais e payloads.
- Não executar ações em produtos na primeira versão.

## Knowledge Grounding

Atena deve responder com base em fontes autorizadas.

Fluxo:

1. resolver identidade e produto;
2. determinar visibilidade CLIENT ou INTERNAL;
3. recuperar conhecimento relevante;
4. montar contexto mínimo;
5. chamar OpenAI;
6. validar resposta;
7. persistir metadados do run;
8. retornar resposta com referências quando disponíveis.

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
- prompt version;
- knowledge version;
- status;
- duration;
- token usage;
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
- status;
- retry count;
- error code;
- knowledge source ids.

Não registrar API key, authorization header ou payload integral sensível.

## Critérios de aceite

1. OpenAI chamada somente server-side.
2. Chave ausente do bundle/frontend.
3. Pergunta coberta retorna resposta consistente com a documentação.
4. Pergunta não coberta retorna insuficiência de evidência.
5. Cliente A não consegue recuperar conhecimento do Cliente B.
6. CLIENT não recupera conhecimento INTERNAL.
7. Prompt injection em fonte não altera as políticas.
8. Provider/modelo/tokens/duração ficam observáveis.
9. Falha da OpenAI é recuperável e não afeta o Ticket Core.
10. Conversa pode ser escalada para ticket sem perda do contexto útil.
