import { ReportingDashboard } from "@/components/reporting/reporting-dashboard";
import { RequireAuth } from "@/features/auth/require-auth";

export default function ReportsPage() { return <RequireAuth roles={["SUPPORT", "ADMIN"]}><ReportingDashboard /></RequireAuth>; }
