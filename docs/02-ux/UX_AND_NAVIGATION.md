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
- labels/badges para estados e processos;
- notificações/toasts para feedback de ação;
- drawers para consulta rápida e ações contextuais;
- botões com ícones claros de ação;
- tooltips em ações por ícone;
- sem excesso de elementos decorativos;
- desktop e mobile funcionais.

## Padrões obrigatórios de interação

### Labels / badges

Usar para representar estados, processos e classificações persistentes.

Exemplos:
- NOVO
- EM ATENDIMENTO
- AGUARDANDO CLIENTE
- EM ANÁLISE
- RESOLVIDO
- ENCERRADO
- BAIXA
- MÉDIA
- ALTA
- CRÍTICA
- DRAFT
- IN_REVIEW
- PUBLISHED
- ARCHIVED
- OPENROUTER
- OPENAI
- FALLBACK
- ERRO

Labels não substituem mensagens de confirmação.

### Notificações / toasts

Usar para feedback de ações executadas.

Exemplos:
- chamado aberto com sucesso;
- resposta enviada;
- chamado atribuído;
- alteração salva;
- conteúdo publicado;
- falha no envio de e-mail;
- fallback de IA acionado quando for relevante ao operador.

Exemplo:
`Chamado CS-00129 atribuído a você.`

Falhas não devem apagar o contexto da tela ou conteúdo digitado.

### Drawers

Preferir drawer para:
- consulta rápida de ticket;
- contexto de cliente;
- resumo do solicitante;
- status;
- SLA;
- responsável;
- ações rápidas;
- manutenção de cadastros simples;
- detalhes que não justificam navegação para página inteira.

Exemplo de drawer de ticket:
- código;
- cliente;
- solicitante;
- e-mail;
- produto;
- status;
- prioridade;
- SLA;
- responsável;
- última interação;
- botão "Abrir chamado completo".

Evitar modal quando drawer oferecer melhor continuidade de contexto.

### Botões e ícones

Ações recorrentes devem usar ícones claros.

Exemplos:
- visualizar;
- assumir;
- responder;
- anexar;
- editar;
- arquivar;
- publicar;
- reabrir;
- mais ações.

Regras:
- ícone precisa ter significado reconhecível;
- usar tooltip;
- não depender somente de cor;
- ações destrutivas ou sensíveis devem ter texto e confirmação adequada;
- ação principal da tela pode usar ícone + label textual.

## Superfície CLIENT

### Menu

- Início
- Meus chamados
- Novo chamado
- Atena
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
- Falar com Atena

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

Cada linha deve permitir ação rápida por ícone e abertura de drawer de resumo antes da navegação completa.

### Novo chamado

Identidade já conhecida não deve ser perguntada novamente.

Mostrar contexto:
- cliente;
- solicitante;
- e-mail para notificações.

O e-mail:
- vem da identidade central administrada pelo 7Service;
- deve estar visível;
- é usado para notificações;
- não é digitado novamente;
- não é editável no formulário de chamado;
- alteração deve ocorrer na origem administrativa apropriada.

Campos editáveis do chamado:
- produto autorizado;
- tipo;
- assunto;
- descrição;
- impacto;
- anexos.

Não permitir cliente definir prioridade interna.

### Confirmação

Após persistência:
- toast/notificação de sucesso;
- código do chamado;
- link para detalhe;
- informar que e-mail será enviado.

Não usar label como substituto de toast de confirmação.

### Detalhe do chamado

Cabeçalho:
- código;
- assunto;
- produto;
- status em label;
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
- anexar por botão com ícone;
- enviar.

Eventos internos e notas internas não aparecem.

### Atena

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
- Atena
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

Cada linha deve suportar ações rápidas por ícone:
- visualizar resumo;
- assumir;
- responder;
- mais ações.

Visualizar resumo abre drawer.

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

Ao selecionar INTERNAL_NOTE:
- mudar tratamento visual do composer;
- exibir aviso claro de que o cliente não verá a mensagem.

## Base de conhecimento

Lista deve usar labels de status.

Ações rápidas:
- visualizar;
- editar;
- enviar para revisão;
- publicar;
- arquivar.

Detalhes rápidos podem usar drawer.

Editor completo pode usar página dedicada quando o conteúdo exigir espaço maior.

## Administração da Atena

Status de providers e execução devem usar labels.

Exemplos:
- OPENROUTER
- OPENAI
- FALLBACK
- OPERACIONAL
- ERRO

Ações técnicas e detalhes de execução podem abrir drawer com:
- provider;
- modelo;
- duração;
- tokens;
- fallback reason;
- status.

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
- labels de formulário reais;
- badges não dependem somente de cor;
- ícones possuem tooltip/aria-label;
- mensagens de erro próximas ao campo.

## Responsividade

Cliente deve funcionar plenamente em mobile.

Operação interna deve ser utilizável em notebook padrão e responsiva, sem exigir viewport fixa.

Drawers devem adaptar largura ou virar full-screen sheet em viewports pequenos.

## Padrões de feedback

Operações assíncronas devem:
- bloquear duplo envio;
- indicar progresso;
- permitir retry seguro quando idempotente;
- informar falha sem perder texto digitado;
- usar toast/notificação após conclusão;
- atualizar labels e estado da tela sem exigir reload manual.
