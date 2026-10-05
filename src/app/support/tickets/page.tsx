import { InternalList } from "@/components/support/internal-list";
import { RequireAuth } from "@/features/auth/require-auth";
export default function AllTicketsPage() { return <RequireAuth roles={["SUPPORT", "ADMIN"]}><InternalList all /></RequireAuth>; }
