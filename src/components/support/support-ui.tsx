"use client";

import Link from "next/link";
import { ArrowRight, Eye, Hand, ExternalLink } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { SlaPanel } from "@/components/sla/sla-panel";
import { Drawer } from "@/components/ui/drawer";
import { formatDate, StatusBadge } from "@/components/tickets/ticket-ui";
import { categoryLabels, priorityLabels, type Ticket, type TicketPriority } from "@/features/tickets/types";
import { operatorName } from "@/services/tickets/operators";

const priorityTone: Record<TicketPriority, "neutral" | "info" | "warning" | "danger"> = { LOW: "neutral", MEDIUM: "info", HIGH: "warning", CRITICAL: "danger" };
export function PriorityBadge({ priority }: { priority: TicketPriority }) { return <Badge tone={priorityTone[priority]}>{priorityLabels[priority]}</Badge>; }
export function ageOf(ticket: Ticket) { const days = Math.max(0, Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 86400000)); return `${days} dia${days === 1 ? "" : "s"}`; }
export function InternalQuickView({ ticket, onClose }: { ticket: Ticket | null; onClose: () => void }) {
  return <Drawer open={Boolean(ticket)} onClose={onClose} title={ticket?.publicCode ?? "Chamado"}>{ticket && <div className="space-y-5 text-sm">
    <div><p className="workspace-section-label">Assunto</p><h3 className="mt-1 text-lg font-semibold">{ticket.subject}</h3></div>
    <div className="flex flex-wrap gap-2"><StatusBadge status={ticket.status} /><PriorityBadge priority={ticket.priority} /></div>
    <dl className="grid grid-cols-2 gap-4">{[
      ["Cliente", ticket.clientNameSnapshot], ["Solicitante", ticket.requesterNameSnapshot], ["E-mail", ticket.requesterEmailSnapshot],
      ["Produto", ticket.productNameSnapshot], ["Categoria", categoryLabels[ticket.category]], ["Responsável", operatorName(ticket.assignedToUserId)],
      ["Criado em", formatDate(ticket.createdAt)], ["Última atualização", formatDate(ticket.updatedAt)],
      ["Última interação", formatDate([...ticket.messages.map((item) => item.createdAt), ...ticket.events.map((item) => item.createdAt)].sort().at(-1) ?? ticket.createdAt)],
    ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="workspace-section-label">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}</dl>
    <SlaPanel ticketId={ticket.id} />
    <p className="whitespace-pre-wrap rounded-xl bg-[var(--bg-muted)] p-3 leading-6">{ticket.messages[0]?.body}</p>
    <Link href={`/support/tickets/${ticket.id}`} onClick={onClose} className="workspace-button-primary">Abrir chamado completo <ArrowRight size={16} /></Link>
  </div>}</Drawer>;
}
export function InternalTicketActions({ ticket, onQuickView, onAssume, busy }: { ticket: Ticket; onQuickView: (ticket: Ticket) => void; onAssume: (ticket: Ticket) => void; busy?: boolean }) {
  return <div className="flex items-center gap-2">
    <ActionButton compact label={`Visualizar resumo ${ticket.publicCode}`} title="Visualizar resumo" icon={<Eye size={20} />} onClick={() => onQuickView(ticket)} />
    {!ticket.assignedToUserId && <ActionButton compact label={`Assumir ${ticket.publicCode}`} title="Assumir chamado" icon={<Hand size={20} />} disabled={busy} onClick={() => onAssume(ticket)} />}
    <Link href={`/support/tickets/${ticket.id}`} title="Abrir chamado completo" aria-label={`Abrir ${ticket.publicCode}`} className="workspace-button-secondary workspace-button-icon"><ExternalLink size={20} /></Link>
  </div>;
}
