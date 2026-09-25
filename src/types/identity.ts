export const roles = ["CLIENT", "SUPPORT", "ADMIN"] as const;
export type Role = (typeof roles)[number];

export type IdentitySource = "LOCAL" | "7SERVICE";
export type SyncStatus = "LOCAL_ONLY" | "PENDING" | "SYNCED" | "FAILED";

export type LocalUser = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  clientId: string | null;
  identitySource: IdentitySource;
  externalUserId: string | null;
  syncStatus: SyncStatus;
};

export type LocalClient = {
  id: string;
  displayName: string;
  identitySource: IdentitySource;
  externalClientId: string | null;
  syncStatus: SyncStatus;
};

export type LocalProduct = {
  id: string;
  displayName: string;
  code: string;
  identitySource: IdentitySource;
  externalProductId: string | null;
  syncStatus: SyncStatus;
};

export type LocalSession = { userId: string; createdAt: string };
