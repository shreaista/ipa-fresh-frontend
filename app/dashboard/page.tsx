import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/currentUser";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div>
      <h1 style={styles.title}>{getTitleByRole(user.role)}</h1>
      <div style={styles.cards}>{renderCardsByRole(user.role)}</div>
    </div>
  );
}

function getTitleByRole(role: string): string {
  switch (role) {
    case "saas_admin":
      return "Global Overview";
    case "tenant_admin":
      return "Tenant Overview";
    case "assessor":
      return "My Queue";
    default:
      return "Dashboard";
  }
}

function renderCardsByRole(role: string) {
  switch (role) {
    case "saas_admin":
      return (
        <>
          <Card title="Total Tenants" value="24" />
          <Card title="Active Subscriptions" value="18" />
          <Card title="Monthly Revenue" value="$42,500" />
          <Card title="Total Users" value="312" />
        </>
      );
    case "tenant_admin":
      return (
        <>
          <Card title="Active Funds" value="8" />
          <Card title="Open Proposals" value="34" />
          <Card title="Team Members" value="12" />
          <Card title="Pending Approvals" value="7" />
        </>
      );
    case "assessor":
      return (
        <>
          <Card title="Assigned to Me" value="12" />
          <Card title="Completed Today" value="5" />
          <Card title="Pending Review" value="3" />
          <Card title="Avg. Review Time" value="2.4 hrs" />
        </>
      );
    default:
      return null;
  }
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardValue}>{value}</div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  title: {
    margin: "0 0 1.5rem 0",
    fontSize: "1.5rem",
    fontWeight: 600,
    color: "#333",
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "1rem",
  },
  card: {
    padding: "1.5rem",
    backgroundColor: "#f9f9f9",
    borderRadius: "8px",
    border: "1px solid #e0e0e0",
  },
  cardTitle: {
    fontSize: "0.875rem",
    color: "#666",
    marginBottom: "0.5rem",
  },
  cardValue: {
    fontSize: "1.75rem",
    fontWeight: 600,
    color: "#333",
  },
};
