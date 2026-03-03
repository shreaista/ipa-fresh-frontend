import { getSessionSafe } from "@/lib/session";
import { redirect } from "next/navigation";
import DashboardHome from "./DashboardHome";

export default async function DashboardPage() {
  const session = await getSessionSafe();

  if (!session.user) {
    redirect("/login");
  }

  return <DashboardHome user={session.user} />;
}
