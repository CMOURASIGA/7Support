# 7Support - UX and Navigation

## Referência visual

Seguir a linguagem estrutural do 7Commander e dos produtos Consult Services:
- shell consistente;
- sidebar;
- header;
- tipografia legível;
- cards simples;
- grid responsivo;
- estados claros;
- sem excesso de elementos decorativos;
- desktop e mobile funcionais.

## Superfície CLIENT

### Menu

- Início
- Meus chamados
- Novo chamado
- Hermes
- Ajuda

### Dashboard

Cards:
- Chamados abertos
- Aguardando Consult Services
- Aguardando você
- Resolvidos

Bloco:
- chamados recentes

Ações rápidas:
- Novo chamado
- Falar com Hermes

### Meus chamados

Tabela/lista com:
- código;
- produto;
- assunto;
- status;
- última atualização.

Filtros:
- status;
- produto;
- período.

Busca por:
- código;
- assunto.

### Novo chamado

Identidade já conhecida não deve ser perguntada novamente.

Mostrar contexto:
- cliente;
- solicitante;
- e-mail.

Campos:
- produto autorizado;
- tipo;
- assunto;
- descrição;
- impacto;
- anexos.

Não permitir cliente definir prioridade interna.

### Confirmação

Após persistência:
- label/toast de sucesso;
- código do chamado;
- link para detalhe;
- informar que e-mail será enviado.

### Detalhe do chamado

Cabeçalho:
- código;
- assunto;
- produto;
- status;
- prioridade somente se fizer sentido expor;
- criado em;
- última atualização.

Corpo em formato de thread:
- mensagens públicas;
- autor;
- data/hora;
- anexos.

Composer:
- resposta;
- anexar;
- enviar.

Eventos internos e notas internas não aparecem.

### Hermes

Tela de conversa:
- seletor/contexto de produto quando necessário;
- histórico da conversa;
- referências/documentação quando disponíveis;
- estado de processamento;
- mensagem clara quando não há evidência suficiente;
- CTA "Abrir chamado com esta conversa".

## Superfície SUPPORT

### Menu

- Dashboard
- Fila de atendimento
- Todos os chamados
- Base de conhecimento
- Hermes
- Relatórios
- Administração, somente ADMIN

### Dashboard

KPIs iniciais:
- novos;
- em atendimento;
- aguardando cliente;
- SLA próximo;
- SLA vencido;
- resolvidos hoje.

### Fila

Colunas:
- código;
- cliente;
- solicitante;
- produto;
- assunto;
- prioridade;
- status;
- responsável;
- idade do chamado.

Filtros:
- status;
- prioridade;
- produto;
- cliente;
- responsável;
- SLA.

Ordenação padrão deve privilegiar risco de SLA e prioridade sem esconder chamados antigos.

### Detalhe interno

Além da thread pública:
- contexto do cliente;
- produto;
- dados de acesso relevantes;
- categoria;
- prioridade;
- responsável;
- SLA;
- timeline;
- histórico de chamados do cliente/produto;
- notas internas.

Ações:
- assumir;
- transferir;
- responder cliente;
- nota interna;
- alterar categoria;
- alterar prioridade;
- alterar status;
- resolver.

Visual de PUBLIC_REPLY e INTERNAL_NOTE deve ser inequivocamente diferente.

## Estados obrigatórios

Toda tela relevante deve definir:
- loading;
- empty;
- error;
- forbidden;
- success;
- offline/retry quando aplicável.

## Acessibilidade

- contraste adequado;
- foco visível;
- navegação por teclado;
- labels reais;
- não depender somente de cor;
- aria quando necessário;
- mensagens de erro próximas ao campo.

## Responsividade

Cliente deve funcionar plenamente em mobile.

Operação interna deve ser utilizável em notebook padrão e responsiva, sem exigir viewport fixa.

## Padrões de feedback

Operações assíncronas devem:
- bloquear duplo envio;
- indicar progresso;
- permitir retry seguro quando idempotente;
- informar falha sem perder texto digitado.
