// Fractional star rating rendered with a clipped overlay so halves are exact
// and we never depend on a half-star glyph the OS font may lack.
export function Stars({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="faint">no rating</span>;
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
  return (
    <span
      className="stars-wrap"
      title={`${rating} / 5`}
      aria-label={`${rating} out of 5 stars`}
    >
      <span className="stars-empty">★★★★★</span>
      <span className="stars-fill" style={{ width: `${pct}%` }}>
        ★★★★★
      </span>
    </span>
  );
}
