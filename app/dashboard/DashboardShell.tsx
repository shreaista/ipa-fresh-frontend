"use client";

import { useRouter, usePathname } from "next/navigation";
import { SessionPayload } from "@/lib/auth";

interface NavItem {
  href: string;
  label: string;
}

interface Props {
  user: SessionPayload;
  navItems: NavItem[];
  children: React.ReactNode;
}

export default function DashboardShell({ user, navItems, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.brand}>IPA Dashboard</div>
        <div style={styles.userInfo}>
          <span style={styles.userName}>{user.name}</span>
          <span style={styles.userRole}>{formatRole(user.role)}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </header>

      <div style={styles.body}>
        <nav style={styles.sidebar}>
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              style={{
                ...styles.navLink,
                ...(pathname === item.href ? styles.navLinkActive : {}),
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <main style={styles.main}>{children}</main>
      </div>
    </div>
  );
}

function formatRole(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 1.5rem",
    height: "60px",
    backgroundColor: "#1a1a2e",
    color: "#fff",
  },
  brand: {
    fontSize: "1.25rem",
    fontWeight: 600,
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  userName: {
    fontWeight: 500,
  },
  userRole: {
    fontSize: "0.75rem",
    padding: "0.25rem 0.5rem",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: "4px",
  },
  logoutBtn: {
    padding: "0.4rem 0.75rem",
    fontSize: "0.875rem",
    color: "#fff",
    backgroundColor: "transparent",
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: "4px",
    cursor: "pointer",
  },
  body: {
    display: "flex",
    flex: 1,
  },
  sidebar: {
    width: "220px",
    backgroundColor: "#f5f5f5",
    borderRight: "1px solid #e0e0e0",
    padding: "1rem 0",
  },
  navLink: {
    display: "block",
    padding: "0.75rem 1.5rem",
    color: "#333",
    textDecoration: "none",
    fontSize: "0.9rem",
    borderLeft: "3px solid transparent",
  },
  navLinkActive: {
    backgroundColor: "#e8e8e8",
    borderLeftColor: "#0066cc",
    fontWeight: 500,
  },
  main: {
    flex: 1,
    padding: "1.5rem",
    backgroundColor: "#fff",
  },
};
