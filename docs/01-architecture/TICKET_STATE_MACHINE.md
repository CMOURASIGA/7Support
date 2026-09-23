# 7Support - Ticket State Machine

## Estados

- OPEN
- IN_PROGRESS
- WAITING_CUSTOMER
- UNDER_ANALYSIS
- RESOLVED
- CLOSED
- REOPENED

## Transições permitidas

| Origem | Destino | Perfis |
|---|---|---|
| OPEN | IN_PROGRESS | SUPPORT, ADMIN |
| IN_PROGRESS | WAITING_CUSTOMER | SUPPORT, ADMIN |
| WAITING_CUSTOMER | IN_PROGRESS | SUPPORT, ADMIN |
| IN_PROGRESS | UNDER_ANALYSIS | SUPPORT, ADMIN |
| UNDER_ANALYSIS | IN_PROGRESS | SUPPORT, ADMIN |
| IN_PROGRESS | RESOLVED | SUPPORT, ADMIN |
| UNDER_ANALYSIS | RESOLVED | SUPPORT, ADMIN |
| RESOLVED | CLOSED | SUPPORT, ADMIN, sistema conforme regra futura |
| RESOLVED | REOPENED | CLIENT, SUPPORT, ADMIN conforme janela aprovada |
| CLOSED | REOPENED | SUPPORT, ADMIN; CLIENT somente se regra futura permitir |
| REOPENED | IN_PROGRESS | SUPPORT, ADMIN |

Não permitir transições arbitrárias.

## Regras

- OPEN representa chamado recebido e ainda não tratado.
- IN_PROGRESS representa atendimento ativo.
- WAITING_CUSTOMER indica dependência de resposta do cliente.
- UNDER_ANALYSIS indica investigação interna.
- RESOLVED indica solução informada.
- CLOSED indica encerramento final.
- REOPENED registra reabertura sem apagar histórico.

## SLA

A política definitiva de pausa será configurável.

Direção inicial:
- OPEN: SLA ativo;
- IN_PROGRESS: SLA ativo;
- UNDER_ANALYSIS: SLA ativo;
- WAITING_CUSTOMER: preparado para pausa configurável;
- RESOLVED: resolução atingida;
- CLOSED: SLA encerrado;
- REOPENED: recalcular conforme política futura.

## Auditoria

Toda transição deve registrar:
- estado anterior;
- estado novo;
- ator;
- data/hora;
- motivo quando obrigatório;
- correlation id.

## Reabertura

O prazo definitivo de reabertura é pendente.

O desenvolvedor não deve hardcodar um prazo comercial permanente antes da decisão formal.
