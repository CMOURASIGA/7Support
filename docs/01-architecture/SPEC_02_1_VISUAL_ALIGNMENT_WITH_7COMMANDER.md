# SPEC 02.1 - Visual Alignment with 7Commander

Checkpoint corretivo entre SPEC 02 e SPEC 03. Referência primária: `CMOURASIGA/7Commander`, branch `develop`, consultada em 25/09/2026 (`styles/tokens.css`, `app/globals.css`, `components/layout/*`, `components/ui/workspace-primitives.tsx`).

## Escopo implementado

- Tokens de cor, tipografia, borda, radius e sombra transportados da base visual do 7Commander para o 7Support. Identidade Consult Services no topo da sidebar e no login.
- Shell com sidebar azul, cabeçalho branco fixo, área de conteúdo de até `max-w-7xl`, padding de 16/20 px e painéis `page-hero` e `workspace-card`.
- Sidebar móvel em gaveta com backdrop, faixa de ícones de 76 px em tablet e menu de 256 px em desktop. O 7Commander oferece o mesmo modelo de drawer no mobile e faixa de ícones em telas intermediárias. Não foi acrescentado controle de recolhimento permanente porque a referência não o oferece.
- Título de página, contexto do cliente e menu de usuário no cabeçalho. A referência não traz breadcrumb global, então o 7Support também não o adiciona.
- Cards, labels, botões primários/secundários e de ícone, tooltip nativo pelo título, estados loading/empty/error/forbidden, toast e drawer responsivo seguindo a paleta e geometria da família.
- Campos de login e classes compartilhadas para inputs, selects e textareas. As tabelas e filtros serão aplicados quando existirem na SPEC 03; não há tabela ou filtro funcional na SPEC 02.

## Regras preservadas

A autenticação local, as contas fictícias, papéis CLIENT/SUPPORT/ADMIN, contexto de tenant, produtos autorizados, persistência de sessão e redirecionamentos não foram alterados. Os cards ainda mostram zero e o CTA de novo chamado ainda informa que a abertura será entregue na SPEC 03. Navegação só aponta para rota existente. Sem Ticket Core, Supabase ou integração com 7Service.

## Validação humana

1. Comparar login, shell, header, largura da sidebar, hero, cards e tipografia com o 7Commander em desktop, tablet e mobile.
2. Entrar como Cliente Alpha e Cliente Beta; confirmar produto permitido e isolamento de contexto após refresh.
3. Entrar como SUPPORT e ADMIN; confirmar os perfis; abrir menu de usuário e sair.
4. No cliente, acionar Novo chamado e confirmar toast, sem criação de ticket; abrir resumo pelo ícone, fechar por botão, Escape e backdrop.
5. No mobile, abrir e fechar navegação; confirmar largura total do drawer e ausência de scroll horizontal.

SPEC 03 permanece bloqueada até a homologação deste checkpoint.
