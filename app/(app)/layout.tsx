import { redirect } from "next/navigation";
import { getSessionSafe } from "@/lib/session";
import { getNavItems } from "@/lib/nav";
import { DashboardShell } from "@/components/dashboard";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getSessionSafe();

  if (!user) {
    redirect("/login");
  }

  const navItems = getNavItems(user.role);

  return (
    <DashboardShell user={user} navItems={navItems}>
      {children}
    </DashboardShell>
  );
}
