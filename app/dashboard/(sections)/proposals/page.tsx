export default function ProposalsPage() {
  return (
    <div>
      <h1 style={styles.title}>Proposals</h1>
      <p style={styles.subtitle}>View and manage funding proposals.</p>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Proposal</th>
            <th style={styles.th}>Applicant</th>
            <th style={styles.th}>Amount</th>
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.td}>Community Garden Project</td>
            <td style={styles.td}>Green Initiative</td>
            <td style={styles.td}>$25,000</td>
            <td style={styles.td}><span style={styles.statusPending}>Pending</span></td>
          </tr>
          <tr>
            <td style={styles.td}>Youth STEM Program</td>
            <td style={styles.td}>Education First</td>
            <td style={styles.td}>$50,000</td>
            <td style={styles.td}><span style={styles.statusReview}>In Review</span></td>
          </tr>
          <tr>
            <td style={styles.td}>Senior Care Outreach</td>
            <td style={styles.td}>Care Partners</td>
            <td style={styles.td}>$18,000</td>
            <td style={styles.td}><span style={styles.statusApproved}>Approved</span></td>
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
  statusPending: { padding: "0.25rem 0.5rem", backgroundColor: "#fff3cd", color: "#856404", borderRadius: "4px", fontSize: "0.75rem" },
  statusReview: { padding: "0.25rem 0.5rem", backgroundColor: "#cce5ff", color: "#004085", borderRadius: "4px", fontSize: "0.75rem" },
  statusApproved: { padding: "0.25rem 0.5rem", backgroundColor: "#d4edda", color: "#155724", borderRadius: "4px", fontSize: "0.75rem" },
};
