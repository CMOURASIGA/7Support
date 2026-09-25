import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/config/env";

export function createSupabaseBrowserClient() {
  if (!env.isSupabaseConfigured || !env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("Supabase não está configurado para este ambiente.");
  }

  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
