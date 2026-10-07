import type { AtenaErrorCode } from "@/features/atena/types";
const messages: Record<AtenaErrorCode, string> = {
  UNAUTHENTICATED: "Faça login para acessar a Atena.",
  FORBIDDEN: "Acesso não permitido.",
  NOT_FOUND: "Conversa ou conteúdo não encontrado.",
  VALIDATION: "Verifique os dados informados.",
  POLICY_DISABLED: "Esta política não está disponível nesta etapa.",
  STORAGE_UNAVAILABLE: "Não foi possível acessar a persistência local com segurança.",
};
export class AtenaError extends Error {
  constructor(public readonly code: AtenaErrorCode) { super(messages[code]); }
}
