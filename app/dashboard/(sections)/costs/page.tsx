export default function CostsPage() {
  return (
    <div>
      <h1 style={styles.title}>Costs</h1>
      <p style={styles.subtitle}>Platform cost analytics and billing.</p>

      <div style={styles.cards}>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Infrastructure</div>
          <div style={styles.cardValue}>$12,340</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardLabel}>API Usage</div>
          <div style={styles.cardValue}>$4,520</div>
        </div>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Storage</div>
          <div style={styles.cardValue}>$2,180</div>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  title: { margin: "0 0 0.5rem 0", fontSize: "1.5rem", fontWeight: 600 },
  subtitle: { margin: "0 0 1.5rem 0", color: "#666" },
  cards: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" },
  card: { padding: "1.25rem", backgroundColor: "#f9f9f9", borderRadius: "8px", border: "1px solid #e0e0e0" },
  cardLabel: { fontSize: "0.875rem", color: "#666", marginBottom: "0.5rem" },
  cardValue: { fontSize: "1.5rem", fontWeight: 600 },
};
