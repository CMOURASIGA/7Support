"use client";
import { useEffect } from "react";
import { ErrorState } from "@/components/ui/states";
import { logger } from "@/lib/logger";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { useEffect(() => logger.error("app.render_error", { digest: error.digest }), [error]); return <main className="grid min-h-screen place-items-center bg-[var(--bg-page)] p-5"><div className="w-full max-w-xl"><ErrorState /><button className="workspace-button-primary mt-4" onClick={reset}>Tentar novamente</button></div></main>; }
