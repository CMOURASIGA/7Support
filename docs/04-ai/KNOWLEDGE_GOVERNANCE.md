# 7Support - Governança da Base de Conhecimento da Atena

## Objetivo

A base de conhecimento da Atena será mantida por usuários ADMIN dentro do próprio 7Support.

Não depender de edição manual no banco ou deploy para atualizar conteúdo operacional.

## Superfície ADMIN

Menu sugerido:

```text
Administração
  -> Base de conhecimento
```

## Estados

- DRAFT
- IN_REVIEW
- PUBLISHED
- ARCHIVED

Atena deve usar somente conteúdo PUBLISHED.

## Conteúdo

Cada item deve possuir pelo menos:
- título;
- produto;
- categoria;
- conteúdo;
- visibilidade;
- status;
- versão;
- autor;
- revisor quando aplicável;
- data de publicação;
- data de atualização;
- validade/revisão futura opcional.

## Visibilidade

- CLIENT
- INTERNAL
- BOTH

CLIENT nunca deve recuperar conteúdo INTERNAL.

## Fluxo

1. ADMIN cria conteúdo.
2. Conteúdo nasce DRAFT.
3. ADMIN edita.
4. Conteúdo pode ir para IN_REVIEW.
5. Conteúdo é PUBLISHED.
6. Indexação/reindexação ocorre.
7. Atena passa a usar a versão publicada.
8. Versão anterior permanece preservada para auditoria quando necessário.
9. Conteúdo obsoleto vira ARCHIVED.

## Atualização

Publicar nova versão deve:
- preservar versionamento;
- atualizar checksum;
- invalidar/reindexar chunks;
- registrar ator;
- registrar data;
- atualizar knowledge_version usada pela Atena.

## Qualidade

Conteúdo deve ser objetivo e operacional.

Evitar:
- informação não confirmada;
- instruções temporárias sem validade;
- secrets;
- dados pessoais de clientes;
- regras comerciais não aprovadas.

## Auditoria

Registrar:
- criação;
- alteração;
- envio para revisão;
- publicação;
- arquivamento;
- reativação;
- reindexação.

## Atena

Cada resposta deve permitir rastrear quais fontes publicadas foram utilizadas.

Quando uma fonte for arquivada:
- não deve entrar em novas respostas;
- histórico antigo pode preservar referência à versão utilizada.

## Importação futura

Pode existir upload de documento ou URL, mas o conteúdo importado deve seguir o mesmo fluxo de revisão/publicação.

Importar não significa publicar automaticamente.
