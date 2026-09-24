const publicEnvironment = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

export const env = {
  ...publicEnvironment,
  isSupabaseConfigured: Boolean(publicEnvironment.supabaseUrl && publicEnvironment.supabaseAnonKey),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
} as const;
