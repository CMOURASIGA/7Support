# SPEC 08 - Human Validation

Status: pendente. Usar a branch `feat/spec-08-atena-escalation` e navegador atualizado com Web Locks.

## Roteiro

1. Entrar como `cliente.alpha@demo.7support.local`, senha `demo-alpha`. Abrir Atena, iniciar conversa 7Commander e perguntar como acompanhar um projeto.
2. Clicar Abrir chamado. Verificar produto read-only, tipo Dúvida, impacto baixo, assunto da primeira pergunta e descrição da conversa. Não deve haver anexos.
3. Cancelar. Confirmar que não foi criado chamado. Abrir novamente, editar assunto/descrição/tipo/impacto e confirmar explicitamente.
4. Conferir toast, código CS, link Abrir chamado e conversa ainda ACTIVE. Link deve abrir tela CLIENT com produto e conteúdo revisado.
5. Recarregar, selecionar a conversa e confirmar vínculo preservado, sem botão de nova criação. Conferir somente uma notificação de criação.
6. Em nova conversa perguntar algo sem conhecimento, como “universo desconhecido xyz”. Escalar a resposta neutra manualmente.
7. Criar mais de seis mensagens. Conferir resumo com até seis e limite de 8.000 caracteres.
8. Abrir preview e, em outra sessão de homologação, revogar fonte citada. Confirmar deve falhar; um novo preview deve excluir resposta revogada. Também testar logout/novo login e troca de identidade: preview antigo deve falhar fechado.
9. Entrar como Beta (`cliente.beta@demo.7support.local`, `demo-beta`). Verificar somente 7Finance e ausência das conversas Alpha.
10. Entrar como SUPPORT (`suporte@demo.7support.local`, `demo-suporte`) e ADMIN (`admin@demo.7support.local`, `demo-admin`). Ambos não devem ter ação de escalada. ADMIN não recebe conversas Alpha.
11. Repetir drawer e abertura em celular/tablet/desktop. Verificar campos, rolagem, confirmação e link sem overflow horizontal.
12. Concorrência e falha entre ticket/vínculo estão verificadas automaticamente em testes unitários. Para inspeção técnica, executar `npm run test:unit` e conferir os casos de duas instâncias, falha de persistência e retry com o mesmo ticket.

## Cobertura dos requisitos autorizados

| Itens | Evidência automatizada |
|---|---|
| 1 a 5 | Unit: defaults/produto/cancelamento, revisão; E2E: drawer e edição |
| 6 | Unit: descrição revisada; E2E: texto do ticket |
| 7 e 8 | Unit: snapshot 6 mensagens/8.000 caracteres |
| 9 e 10 | Unit: INTERNAL excluído e revogação após preview |
| 11 | Unit: snapshot explícito sem serializar diagnóstico |
| 12 a 15 | Unit: Beta/ADMIN/SUPPORT negados; E2E: ausência da ação interna |
| 16 a 21 | Unit: ticket, produto, CS, notificação única, retry, duas instâncias concorrentes |
| 22 | Unit: falha real setItem em COMPLETED após criação; retry reconcilia |
| 23 a 25 | Unit: nova instância e bloqueio; E2E: refresh e rota CLIENT |
| 26 e 27 | Unit: resposta neutra e ausência de abertura automática |
| Adicionais | Unit: sessão nova, revalidação dentro da transação, sem Web Locks, truncamento do assunto; E2E: mobile |

## Evidências de execução

- Unit: 103 testes passaram, incluindo 17 casos da SPEC 08.
- Typecheck: passou.
- Lint: passou, sem erros ou warnings de código.
- E2E: 26 testes passaram na suíte completa, incluindo cinco cenários da SPEC 08 e duas abas concorrentes.
- Desktop e mobile: capturas do drawer inspecionadas.
- git diff --check: passou.
- Build: passou (Next.js, 15 rotas).
- Execução local usou Chromium 153 via instalação temporária externa ao projeto porque o CDN do Playwright retornou arquivo inválido. Nenhuma dependência/configuração da aplicação foi alterada para esse contorno.
- Human Validation: não executada pelo usuário; não considerar APPROVED.

Seletores antigos da regressão foram ajustados para nomes/títulos atuais, textos exatos, botão de fechamento dentro do drawer/menu e conclusão da navegação antes de logout. Nenhuma asserção de autorização foi removida.
