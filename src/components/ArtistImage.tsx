// Renders artist photography with a graceful initials fallback.
import Image from "next/image";

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
  sizes = "(max-width: 700px) 50vw, 220px",
}: {
  name: string;
  src?: string | null;
  className?: string;
  sizes?: string;
}) {
  if (src) {
    // fill within the (position:relative, overflow:hidden) container the
    // caller provides — .poster / .feed-thumb / .rail-thumb / .note-thumb.
    return (
      <Image src={src} alt={name} fill sizes={sizes} className={className} style={{ objectFit: "cover" }} />
    );
  }
  return (
    <div className="poster-fallback" style={{ background: gradientFor(name) }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
