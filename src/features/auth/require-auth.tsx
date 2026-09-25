"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-context";
import type { Role } from "@/types/identity";

export function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { ready, user, hasRole } = useAuth(); const router = useRouter();
  useEffect(() => { if (ready && !user) router.replace("/login"); else if (ready && user && roles && !hasRole(roles)) router.replace("/forbidden"); }, [hasRole, ready, roles, router, user]);
  if (!ready || !user || (roles && !hasRole(roles))) return <main className="p-6"><LoadingState /></main>;
  return <>{children}</>;
}
