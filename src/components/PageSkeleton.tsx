// Instant placeholder shown via route loading.tsx boundaries while the server
// component fetches. Makes navigation feel immediate instead of "stuck".
export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <main className="container">
      <div className="skeleton" style={{ height: 96, marginTop: 24 }} />
      <div className="skeleton sk-line" style={{ width: "40%", marginTop: 22 }} />
      <div style={{ marginTop: 16 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton sk-row" />
        ))}
      </div>
    </main>
  );
}
