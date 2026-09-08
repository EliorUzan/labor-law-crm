import { requireAuthenticatedUserId } from "@/lib/auth";
import { Dashboard } from "@/modules/dashboard/dashboard";
import { getDashboardData } from "@/modules/dashboard/queries";

export default async function DashboardPage() {
  const userId = await requireAuthenticatedUserId();
  const dashboardData = await getDashboardData(userId);

  return <Dashboard data={dashboardData} />;
}
