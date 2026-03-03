export default function FundsPage() {
  return (
    <div>
      <h1 style={styles.title}>Funds</h1>
      <p style={styles.subtitle}>Manage funding sources and allocations.</p>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Fund Name</th>
            <th style={styles.th}>Total Budget</th>
            <th style={styles.th}>Allocated</th>
            <th style={styles.th}>Remaining</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.td}>General Fund 2026</td>
            <td style={styles.td}>$500,000</td>
            <td style={styles.td}>$320,000</td>
            <td style={styles.td}>$180,000</td>
          </tr>
          <tr>
            <td style={styles.td}>Innovation Grant</td>
            <td style={styles.td}>$150,000</td>
            <td style={styles.td}>$85,000</td>
            <td style={styles.td}>$65,000</td>
          </tr>
          <tr>
            <td style={styles.td}>Emergency Reserve</td>
            <td style={styles.td}>$100,000</td>
            <td style={styles.td}>$12,000</td>
            <td style={styles.td}>$88,000</td>
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
