"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { localIdentityStore } from "@/services/local-identity/store";
import type { LocalClient, LocalProduct, LocalUser, Role } from "@/types/identity";

type AuthContextValue = {
  ready: boolean; user: LocalUser | null; client: LocalClient | null; products: LocalProduct[];
  login: (email: string, password: string) => boolean; logout: () => void;
  canAccessTenant: (clientId: string) => boolean; hasRole: (roles: Role[]) => boolean;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { const current = localIdentityStore.currentUser(); setUser(current ?? null); setReady(true); }, []);
  const value = useMemo<AuthContextValue>(() => ({
    ready, user, client: user ? localIdentityStore.clientFor(user) ?? null : null, products: user ? localIdentityStore.productsFor(user) : [],
    login: (email, password) => { const authenticated = localIdentityStore.login(email, password); setUser(authenticated); return Boolean(authenticated); },
    logout: () => { localIdentityStore.logout(); setUser(null); },
    canAccessTenant: (clientId) => Boolean(user && localIdentityStore.canAccessTenant(user, clientId)),
    hasRole: (roles) => Boolean(user && localIdentityStore.hasRole(user, roles)),
  }), [ready, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be used inside AuthProvider"); return value; }
