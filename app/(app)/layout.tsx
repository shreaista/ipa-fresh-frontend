import { redirect } from "next/navigation";
import { getSessionSafe } from "@/lib/session";
import { getNavItems } from "@/lib/nav";
import { AppShell } from "@/components/app";

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
    <AppShell user={user} navItems={navItems}>
      {children}
    </AppShell>
  );
}
