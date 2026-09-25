import { AlertTriangle, Ban, FileWarning, Inbox, LoaderCircle } from "lucide-react";

function State({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) { return <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-muted)] p-8 text-center"><div className="mb-3 text-[var(--accent)]">{icon}</div><h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2><p className="mt-1 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">{description}</p></div>; }
export const LoadingState = () => <State title="Carregando" description="Aguarde enquanto preparamos as informações." icon={<LoaderCircle className="animate-spin" />} />;
export const EmptyState = () => <State title="Nada para exibir" description="Quando houver informações disponíveis, elas aparecerão aqui." icon={<Inbox />} />;
export const ErrorState = () => <State title="Não foi possível carregar" description="Tente novamente. Se o problema persistir, entre em contato com o suporte." icon={<FileWarning />} />;
export const ForbiddenState = () => <State title="Acesso não autorizado" description="Você não possui permissão para acessar este conteúdo." icon={<Ban />} />;
export const OfflineState = () => <State title="Você está sem conexão" description="Verifique sua internet e tente novamente." icon={<AlertTriangle />} />;
