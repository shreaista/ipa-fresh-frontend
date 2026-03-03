export default function TenantsPage() {
  return (
    <div>
      <h1 style={styles.title}>Tenants</h1>
      <p style={styles.subtitle}>Manage all tenant organizations.</p>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Tenant Name</th>
            <th style={styles.th}>Plan</th>
            <th style={styles.th}>Users</th>
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.td}>Acme Corp</td>
            <td style={styles.td}>Enterprise</td>
            <td style={styles.td}>45</td>
            <td style={styles.td}>Active</td>
          </tr>
          <tr>
            <td style={styles.td}>Beta Inc</td>
            <td style={styles.td}>Pro</td>
            <td style={styles.td}>12</td>
            <td style={styles.td}>Active</td>
          </tr>
          <tr>
            <td style={styles.td}>Gamma LLC</td>
            <td style={styles.td}>Starter</td>
            <td style={styles.td}>5</td>
            <td style={styles.td}>Trial</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  title: { margin: "0 0 0.5rem 0", fontSize: "1.5rem", fontWeight: 600 },
  subtitle: { margin: "0 0 1.5rem 0", color: "#666" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "0.75rem", borderBottom: "2px solid #e0e0e0", fontSize: "0.875rem", color: "#666" },
  td: { padding: "0.75rem", borderBottom: "1px solid #e0e0e0" },
};
