export default function ReportsPage() {
  return (
    <div>
      <h1 style={styles.title}>Reports</h1>
      <p style={styles.subtitle}>View assessment reports and analytics.</p>

      <div style={styles.cards}>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Completed This Week</div>
          <div style={styles.cardValue}>18</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Avg. Score</div>
          <div style={styles.cardValue}>7.4</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Approval Rate</div>
          <div style={styles.cardValue}>62%</div>
        </div>
      </div>

      <h2 style={styles.sectionTitle}>Recent Reports</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Proposal</th>
            <th style={styles.th}>Score</th>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Outcome</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.td}>Youth STEM Program</td>
            <td style={styles.td}>8.5</td>
            <td style={styles.td}>Mar 1, 2026</td>
            <td style={styles.td}>Recommended</td>
          </tr>
          <tr>
            <td style={styles.td}>Community Garden</td>
            <td style={styles.td}>6.2</td>
            <td style={styles.td}>Feb 28, 2026</td>
            <td style={styles.td}>Needs Revision</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  title: { margin: "0 0 0.5rem 0", fontSize: "1.5rem", fontWeight: 600 },
  subtitle: { margin: "0 0 1.5rem 0", color: "#666" },
  cards: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" },
  card: { padding: "1.25rem", backgroundColor: "#f9f9f9", borderRadius: "8px", border: "1px solid #e0e0e0" },
  cardLabel: { fontSize: "0.875rem", color: "#666", marginBottom: "0.5rem" },
  cardValue: { fontSize: "1.5rem", fontWeight: 600 },
  sectionTitle: { fontSize: "1.1rem", fontWeight: 600, margin: "0 0 1rem 0" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "0.75rem", borderBottom: "2px solid #e0e0e0", fontSize: "0.875rem", color: "#666" },
  td: { padding: "0.75rem", borderBottom: "1px solid #e0e0e0" },
};
