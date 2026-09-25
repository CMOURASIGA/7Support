"use client";

import { Paperclip, X } from "lucide-react";
import { useRef } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { readLocalFiles } from "@/services/tickets/service";
import type { AttachmentInput } from "@/features/tickets/types";

export function AttachmentPicker({ value, onChange, onError, disabled }: { value: AttachmentInput[]; onChange: (files: AttachmentInput[]) => void; onError: (message: string) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return <div><input ref={input} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain" className="sr-only" aria-label="Selecionar anexos" onChange={async (event) => { try { const items = await readLocalFiles(event.target.files ?? []); const combined = [...value, ...items]; if (combined.length > 4 || combined.reduce((sum, file) => sum + file.sizeBytes, 0) > 2 * 1024 * 1024) throw new Error("Envie até 4 arquivos e 2 MB no total."); onChange(combined); onError(""); } catch (cause) { onError(cause instanceof Error ? cause.message : "Falha ao carregar anexos."); } finally { event.target.value = ""; } }} /><ActionButton type="button" label="Anexar arquivos" icon={<Paperclip size={18} />} onClick={() => input.current?.click()} disabled={disabled} /><p className="mt-1 text-xs text-[var(--text-secondary)]">PDF, PNG, JPG ou TXT. Até 4 arquivos, 512 KB cada, 2 MB no total.</p>{value.length > 0 && <ul className="mt-2 space-y-1 text-sm">{value.map((file, index) => <li key={`${file.originalFilename}-${index}`} className="flex items-center gap-2"><span className="truncate">{file.originalFilename}</span><button type="button" title={`Remover ${file.originalFilename}`} aria-label={`Remover ${file.originalFilename}`} onClick={() => onChange(value.filter((_, item) => item !== index))} disabled={disabled} className="text-[var(--danger)]"><X size={16} /></button></li>)}</ul>}</div>;
}
