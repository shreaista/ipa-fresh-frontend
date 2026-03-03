export default function UsersPage() {
  return (
    <div>
      <h1 style={styles.title}>Users</h1>
      <p style={styles.subtitle}>Manage team members and permissions.</p>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Role</th>
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.td}>Alice Johnson</td>
            <td style={styles.td}>alice@tenant.com</td>
            <td style={styles.td}>Admin</td>
            <td style={styles.td}>Active</td>
          </tr>
          <tr>
            <td style={styles.td}>Bob Smith</td>
            <td style={styles.td}>bob@tenant.com</td>
            <td style={styles.td}>Assessor</td>
            <td style={styles.td}>Active</td>
          </tr>
          <tr>
            <td style={styles.td}>Carol Davis</td>
            <td style={styles.td}>carol@tenant.com</td>
            <td style={styles.td}>Assessor</td>
            <td style={styles.td}>Invited</td>
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
