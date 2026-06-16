import Link from "next/link";
import { formatDate } from "@/lib/format";
import { gradientFor } from "./ArtistImage";

export type StubData = {
  performanceId?: string;
  artist: string;
  artistImage?: string | null;
  venue: string;
  city?: string | null;
  date: Date | string;
  rating: number | null;
  isFavorite: boolean;
  stubImageUrl?: string | null;
};

export function StubCard({ stub }: { stub: StubData }) {
  // Priority: user's own ticket-stub photo > artist photography > gradient.
  const bg = stub.stubImageUrl ?? stub.artistImage ?? null;
  const inner = (
    <>
      {bg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="stub-img" src={bg} alt={stub.artist} loading="lazy" />
      ) : (
        <div className="stub-img" style={{ background: gradientFor(stub.artist) }} />
      )}
      <div className="stub-grad" />
      {stub.isFavorite && <span className="stub-fav">♥</span>}
      <div className="stub-perf" />
      <div className="stub-content">
        <div className="stub-artist">{stub.artist}</div>
        <div className="stub-venue">
          {stub.venue}
          {stub.city ? ` · ${stub.city}` : ""}
        </div>
        <div className="stub-foot">
          <span>{formatDate(stub.date)}</span>
          <span>{stub.rating != null ? `★ ${stub.rating}` : "—"}</span>
        </div>
      </div>
    </>
  );

  return stub.performanceId ? (
    <Link href={`/show/${stub.performanceId}`} className="stub">
      {inner}
    </Link>
  ) : (
    <div className="stub">{inner}</div>
  );
}
