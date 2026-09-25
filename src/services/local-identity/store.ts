import type { LocalClient, LocalProduct, LocalSession, LocalUser, Role } from "@/types/identity";

const STORAGE_KEY = "7support.spec02.local-identity.v1";

type SeedUser = LocalUser & { demoPassword: string };
type LocalIdentityDatabase = {
  clients: LocalClient[];
  products: LocalProduct[];
  users: SeedUser[];
  userProductAccess: Array<{ userId: string; productId: string; clientId: string }>;
  session: LocalSession | null;
};

const database: Omit<LocalIdentityDatabase, "session"> = {
  clients: [
    { id: "client-alpha", displayName: "Cliente Alpha", identitySource: "LOCAL", externalClientId: null, syncStatus: "LOCAL_ONLY" },
    { id: "client-beta", displayName: "Cliente Beta", identitySource: "LOCAL", externalClientId: null, syncStatus: "LOCAL_ONLY" },
  ],
  products: [
    { id: "product-commander", displayName: "7Commander", code: "7COMMANDER", identitySource: "LOCAL", externalProductId: null, syncStatus: "LOCAL_ONLY" },
    { id: "product-finance", displayName: "7Finance", code: "7FINANCE", identitySource: "LOCAL", externalProductId: null, syncStatus: "LOCAL_ONLY" },
  ],
  users: [
    { id: "user-alpha", email: "cliente.alpha@demo.7support.local", displayName: "Cliente Alpha", role: "CLIENT", clientId: "client-alpha", identitySource: "LOCAL", externalUserId: null, syncStatus: "LOCAL_ONLY", demoPassword: "demo-alpha" },
    { id: "user-beta", email: "cliente.beta@demo.7support.local", displayName: "Cliente Beta", role: "CLIENT", clientId: "client-beta", identitySource: "LOCAL", externalUserId: null, syncStatus: "LOCAL_ONLY", demoPassword: "demo-beta" },
    { id: "user-support", email: "suporte@demo.7support.local", displayName: "Equipe de Suporte", role: "SUPPORT", clientId: null, identitySource: "LOCAL", externalUserId: null, syncStatus: "LOCAL_ONLY", demoPassword: "demo-suporte" },
    { id: "user-admin", email: "admin@demo.7support.local", displayName: "Administração 7Support", role: "ADMIN", clientId: null, identitySource: "LOCAL", externalUserId: null, syncStatus: "LOCAL_ONLY", demoPassword: "demo-admin" },
  ],
  userProductAccess: [
    { userId: "user-alpha", clientId: "client-alpha", productId: "product-commander" },
    { userId: "user-beta", clientId: "client-beta", productId: "product-finance" },
  ],
};

function load(): LocalIdentityDatabase {
  if (typeof window === "undefined") return { ...database, session: null };
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return { ...database, session: null };
  try { return JSON.parse(stored) as LocalIdentityDatabase; } catch { return { ...database, session: null }; }
}

function save(value: LocalIdentityDatabase) { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); }
function publicUser(user: SeedUser): LocalUser {
  return {
    id: user.id, email: user.email, displayName: user.displayName, role: user.role, clientId: user.clientId,
    identitySource: user.identitySource, externalUserId: user.externalUserId, syncStatus: user.syncStatus,
  };
}

export const localIdentityStore = {
  session() { return load().session; },
  currentUser() { const state = load(); const session = state.session; const user = session ? state.users.find((candidate) => candidate.id === session.userId) : undefined; return user ? publicUser(user) : undefined; },
  login(email: string, password: string) {
    const state = load();
    const user = state.users.find((candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase() && candidate.demoPassword === password);
    if (!user) return null;
    state.session = { userId: user.id, createdAt: new Date().toISOString() };
    save(state);
    return publicUser(user);
  },
  logout() { const state = load(); state.session = null; save(state); },
  clientFor(user: LocalUser) { return user.clientId ? load().clients.find((client) => client.id === user.clientId) : undefined; },
  productsFor(user: LocalUser) {
    const state = load();
    if (user.role !== "CLIENT") return state.products;
    const allowed = state.userProductAccess.filter((access) => access.userId === user.id && access.clientId === user.clientId).map((access) => access.productId);
    return state.products.filter((product) => allowed.includes(product.id));
  },
  canAccessTenant(user: LocalUser, clientId: string) { return user.role !== "CLIENT" || user.clientId === clientId; },
  hasRole(user: LocalUser, allowed: Role[]) { return allowed.includes(user.role); },
  resetDemo() { if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY); },
};
