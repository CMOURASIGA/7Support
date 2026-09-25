"use client";
import { useEffect } from "react";
import { ErrorState } from "@/components/ui/states";
import { logger } from "@/lib/logger";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { useEffect(() => logger.error("app.render_error", { digest: error.digest }), [error]); return <main className="mx-auto max-w-xl p-6"><ErrorState /><button className="mt-4 rounded-lg bg-support-500 px-4 py-2 text-sm font-semibold text-white" onClick={reset}>Tentar novamente</button></main>; }
