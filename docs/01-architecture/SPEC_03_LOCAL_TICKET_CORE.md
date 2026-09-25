# SPEC 03 - Ticket Core local-first

Base: `develop` após integração do PR #2 da SPEC 02.1. Escopo: experiência CLIENT, sem Supabase, cloud ou rotinas internas da SPEC 04.

## Contratos e persistência

`UI -> TicketService -> TicketRepository -> LocalTicketRepository -> LocalStorage`.

- `src/features/tickets/types.ts` contém Ticket, Message, Attachment, Event, enumerações e rótulos públicos. ID técnico é UUID; `publicNumber` é independente e `publicCode` exibe `CS-` com no mínimo seis dígitos.
- `TicketRepository` expõe leitura, transação e assinatura de mudanças. O adaptador local armazena um documento versionado `7support.spec03.tickets.v1`. Inicializa sete casos fictícios uma única vez. Logout/login não restaura os casos e refresh não apaga os novos registros.
- `TicketService` obtém a sessão vigente na camada de serviço. CLIENT lista, consulta e responde apenas aos seus próprios tickets e só cria tickets em produtos autorizados. Não usa clientId, requesterId ou prioridade enviados pelo formulário.
- Anexos ficam em `dataUrl` no adaptador local e em metadados tipados por ticket/mensagem. Até 4 arquivos PDF, PNG, JPG ou TXT, 512 KB por arquivo e 2 MB por ação, por causa da cota do armazenamento local. A futura persistência deverá mover bytes para storage privado e trocar o adaptador sem expor notas internas ao cliente.
- Escritas têm serialização em uma aba e, onde suportado, Web Locks entre abas. O armazenamento local continua sendo uma demonstração, sem isolamento de segurança equivalente a RLS. A migração para Supabase requer sequência atômica de banco, autorização no servidor e upload privado.
- Responder a WAITING_CUSTOMER registra mensagem pública e evento, sem mudar status: a transição documentada `WAITING_CUSTOMER -> IN_PROGRESS` pertence a SUPPORT/ADMIN na SPEC 04. Chamados RESOLVED/CLOSED não aceitam resposta nem reabertura nesta SPEC.

## Demonstração

Cliente Alpha, produto 7Commander: OPEN `CS-000001`, IN_PROGRESS `CS-000002`, WAITING_CUSTOMER `CS-000003`, RESOLVED `CS-000004`.

Cliente Beta, produto 7Finance: OPEN `CS-000005`, WAITING_CUSTOMER `CS-000006`, RESOLVED `CS-000007`.

Novo chamado começa em `CS-000008` nessa base inicial. UUIDs são gerados na primeira inicialização e persistem.

## Human Validation

1. CLIENT Alpha: ver 4 casos reais nos indicadores e em Meus chamados. Filtrar status, produto, período, buscar código e assunto. Abrir drawer e navegar ao detalhe.
2. Abrir ticket com tipo, impacto, produto permitido, descrição e anexo TXT; confirmar toast, código, status NOVO, mensagem, download e persistência após refresh.
3. Responder a ticket OPEN/WAITING_CUSTOMER; confirmar thread e timeline sem mudança automática indevida de status. Ver RESOLVED sem composer.
4. Sair, entrar como CLIENT Beta: ver apenas 7Finance e 3 casos Beta; colar URL do ticket Alpha e confirmar ausência de dados.
5. Entrar em SUPPORT/ADMIN: tela inicial informa que fila e ações internas entram na SPEC 04; rotas de CLIENT negadas. Conferir mobile, estados vazios, erro, drawer, tooltips e ausência de rolagem horizontal.
6. Repetir após refresh e após nova sessão. Para restaurar demonstração manualmente, limpar os dados do site no navegador. Nunca usar dados reais nesse modo local.

A validação visual completa do frontend fica para depois das rotinas das SPECs 03 e 04. SPEC 04 depende de autorização separada.
