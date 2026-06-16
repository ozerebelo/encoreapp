import Link from "next/link";
import { ArtistImage } from "./ArtistImage";

export type PosterProps = {
  href: string;
  name: string;
  image?: string | null;
  caption?: string | null;
  subcaption?: string | null;
  rating?: number | null;
  favorite?: boolean;
  badge?: string | null;
};

export function Poster({
  href,
  name,
  image,
  caption,
  subcaption,
  rating,
  favorite,
  badge,
}: PosterProps) {
  return (
    <Link href={href} className="poster" title={name}>
      <ArtistImage name={name} src={image} />
      {favorite && <span className="poster-fav">♥</span>}
      {badge && <span className="poster-badge" style={{ color: "var(--text)" }}>{badge}</span>}
      {rating != null && <span className="poster-badge">★ {rating}</span>}
      {(caption || subcaption) && (
        <div className="poster-cap">
          {caption && <div className="t">{caption}</div>}
          {subcaption && <div className="s">{subcaption}</div>}
        </div>
      )}
    </Link>
  );
}
