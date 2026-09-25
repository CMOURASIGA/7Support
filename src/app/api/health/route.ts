import { NextResponse } from "next/server";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

export function GET(request: Request) {
  const correlationId = request.headers.get("x-correlation-id") ?? crypto.randomUUID();
  logger.info("healthcheck", { correlationId, environment: env.environment, supabaseConfigured: env.isSupabaseConfigured });
  return NextResponse.json({ status: "ok", service: "7support", environment: env.environment, correlationId, timestamp: new Date().toISOString() }, { status: 200, headers: { "cache-control": "no-store", "x-correlation-id": correlationId } });
}
