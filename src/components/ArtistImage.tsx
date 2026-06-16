// Renders artist photography with a graceful initials fallback.
const GRADIENTS = [
  "linear-gradient(135deg,#7b3fa0,#3a2566)",
  "linear-gradient(135deg,#b0476a,#3a2540)",
  "linear-gradient(135deg,#3f6fa0,#26385a)",
  "linear-gradient(135deg,#a06b3f,#3a2e25)",
  "linear-gradient(135deg,#3fa089,#244a40)",
  "linear-gradient(135deg,#6a3fa0,#2a2566)",
];

export function gradientFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

export function ArtistImage({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} loading="lazy" className={className} />;
  }
  return (
    <div className="poster-fallback" style={{ background: gradientFor(name) }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
