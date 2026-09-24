import { AlertTriangle, Ban, FileWarning, Inbox, LoaderCircle } from "lucide-react";

function State({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) { return <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center"><div className="mb-3 text-slate-500">{icon}</div><h2 className="font-semibold text-slate-900">{title}</h2><p className="mt-1 max-w-sm text-sm text-slate-600">{description}</p></div>; }
export const LoadingState = () => <State title="Carregando" description="Aguarde enquanto preparamos as informações." icon={<LoaderCircle className="animate-spin" />} />;
export const EmptyState = () => <State title="Nada para exibir" description="Quando houver informações disponíveis, elas aparecerão aqui." icon={<Inbox />} />;
export const ErrorState = () => <State title="Não foi possível carregar" description="Tente novamente. Se o problema persistir, entre em contato com o suporte." icon={<FileWarning />} />;
export const ForbiddenState = () => <State title="Acesso não autorizado" description="Você não possui permissão para acessar este conteúdo." icon={<Ban />} />;
export const OfflineState = () => <State title="Você está sem conexão" description="Verifique sua internet e tente novamente." icon={<AlertTriangle />} />;
