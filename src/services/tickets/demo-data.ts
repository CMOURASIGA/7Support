import type { Ticket, TicketDatabase, TicketStatus, TicketType } from "@/features/tickets/types";

const examples: Array<{ clientId: string; clientName: string; userId: string; productId: string; productName: string; status: TicketStatus; type: TicketType; subject: string; description: string; daysAgo: number }> = [
  { clientId: "client-alpha", clientName: "Cliente Alpha", userId: "user-alpha", productId: "product-commander", productName: "7Commander", status: "OPEN", type: "QUESTION", subject: "Como acompanhar as atividades do projeto?", description: "Gostaria de localizar as atividades em andamento do projeto Aurora.", daysAgo: 5 },
  { clientId: "client-alpha", clientName: "Cliente Alpha", userId: "user-alpha", productId: "product-commander", productName: "7Commander", status: "IN_PROGRESS", type: "INCIDENT", subject: "Erro ao abrir o painel de projetos", description: "O painel não termina de carregar depois que seleciono o projeto.", daysAgo: 4 },
  { clientId: "client-alpha", clientName: "Cliente Alpha", userId: "user-alpha", productId: "product-commander", productName: "7Commander", status: "WAITING_CUSTOMER", type: "ACCESS", subject: "Acesso de um novo integrante", description: "Preciso saber quais dados são necessários para solicitar acesso.", daysAgo: 3 },
  { clientId: "client-alpha", clientName: "Cliente Alpha", userId: "user-alpha", productId: "product-commander", productName: "7Commander", status: "RESOLVED", type: "SERVICE_REQUEST", subject: "Orientação sobre relatório semanal", description: "Como exportar o relatório semanal do projeto?", daysAgo: 2 },
  { clientId: "client-beta", clientName: "Cliente Beta", userId: "user-beta", productId: "product-finance", productName: "7Finance", status: "OPEN", type: "QUESTION", subject: "Como consultar lançamentos?", description: "Quero localizar os lançamentos do mês atual.", daysAgo: 4 },
  { clientId: "client-beta", clientName: "Cliente Beta", userId: "user-beta", productId: "product-finance", productName: "7Finance", status: "WAITING_CUSTOMER", type: "INCIDENT", subject: "Falha na visualização do resumo financeiro", description: "O resumo mostra uma tela vazia após selecionar o período.", daysAgo: 3 },
  { clientId: "client-beta", clientName: "Cliente Beta", userId: "user-beta", productId: "product-finance", productName: "7Finance", status: "RESOLVED", type: "IMPROVEMENT", subject: "Sugestão de filtro para despesas", description: "Seria útil filtrar despesas por categoria.", daysAgo: 2 },
];

export function createDemoDatabase(now = new Date()): TicketDatabase {
  const tickets: Ticket[] = examples.map((example, index) => {
    const createdAt = new Date(now.getTime() - example.daysAgo * 86400000).toISOString();
    const id = crypto.randomUUID();
    const requesterName = example.clientName;
    const messages: Ticket["messages"] = [{ id: crypto.randomUUID(), ticketId: id, authorUserId: example.userId, authorName: requesterName, authorType: "CLIENT", visibility: "PUBLIC_REPLY", body: example.description, createdAt, attachments: [] }];
    if (example.status === "WAITING_CUSTOMER" || example.status === "RESOLVED") messages.push({ id: crypto.randomUUID(), ticketId: id, authorUserId: "user-support", authorName: "Equipe de Suporte", authorType: "SUPPORT", visibility: "PUBLIC_REPLY", body: example.status === "RESOLVED" ? "Enviamos as orientações para esta solicitação. Caso precise de mais informações, entre em contato." : "Pode nos informar mais detalhes sobre o cenário para continuarmos?", createdAt: new Date(new Date(createdAt).getTime() + 3600000).toISOString(), attachments: [] });
    const updatedAt = messages.at(-1)!.createdAt;
    const events: Ticket["events"] = [{ id: crypto.randomUUID(), ticketId: id, eventType: "CREATED", actorUserId: example.userId, createdAt, newStatus: "OPEN", description: "Chamado aberto" }];
    if (example.status !== "OPEN") events.push({ id: crypto.randomUUID(), ticketId: id, eventType: "STATUS_CHANGED", actorUserId: "user-support", createdAt: new Date(new Date(createdAt).getTime() + 1800000).toISOString(), oldStatus: "OPEN", newStatus: "IN_PROGRESS", description: "Atendimento iniciado" });
    if (example.status === "WAITING_CUSTOMER" || example.status === "RESOLVED") events.push({ id: crypto.randomUUID(), ticketId: id, eventType: "STATUS_CHANGED", actorUserId: "user-support", createdAt: updatedAt, oldStatus: "IN_PROGRESS", newStatus: example.status, description: example.status === "RESOLVED" ? "Chamado resolvido" : "Aguardando resposta do cliente" });
    return { id, publicNumber: index + 1, publicCode: `CS-${String(index + 1).padStart(6, "0")}`, clientId: example.clientId, clientNameSnapshot: example.clientName, requesterUserId: example.userId, requesterNameSnapshot: requesterName, requesterEmailSnapshot: `${example.clientId === "client-alpha" ? "cliente.alpha" : "cliente.beta"}@demo.7support.local`, productId: example.productId, productNameSnapshot: example.productName, type: example.type, impact: "PARTIAL_IMPACT", status: example.status, subject: example.subject, createdAt, updatedAt, messages, events };
  });
  return { version: 1, nextPublicNumber: tickets.length + 1, tickets };
}
