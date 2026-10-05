import type { TicketOperator } from "@/features/tickets/types";

export const demoOperators: TicketOperator[] = [
  { id: "user-support", displayName: "Equipe de Suporte" },
  { id: "operator-marina", displayName: "Marina Costa" },
  { id: "operator-rafael", displayName: "Rafael Lima" },
  { id: "user-admin", displayName: "Administração 7Support" },
];

export function operatorName(id: string | null) {
  return demoOperators.find((operator) => operator.id === id)?.displayName ?? "Sem responsável";
}
