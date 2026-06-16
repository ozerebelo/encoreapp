import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";
import { toNumber, yearOf } from "@/lib/format";

export const alt = "Year in live music";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const user = await prisma.user.findUnique({
    where: { handle },
    include: {
      logs: { include: { performance: { include: { artist: { select: { name: true } } } } } },
    },
  });

  const name = user?.displayName ?? handle;
  const logs = user?.logs ?? [];
  const years = [...new Set(logs.map((l) => yearOf(l.loggedDate)))].sort((a, b) => b - a);
  const topYear = years[0] ?? new Date().getFullYear();
  const yearLogs = logs.filter((l) => yearOf(l.loggedDate) === topYear);
  const counts = new Map<string, number>();
  for (const l of yearLogs) counts.set(l.performance.artist.name, (counts.get(l.performance.artist.name) ?? 0) + 1);
  const topArtist = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const ratings = yearLogs.map((l) => toNumber(l.rating)).filter((r): r is number => r != null);
  const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—";

  const Stat = ({ num, label }: { num: string; label: string }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 56, fontWeight: 800 }}>{num}</div>
      <div style={{ fontSize: 24, color: "#a8a1c6" }}>{label}</div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #1a1230 0%, #0c0a12 55%, #2a1530 100%)",
          color: "#f4f1fb",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 30, fontWeight: 800, letterSpacing: 2, color: "#c8a2ff" }}>
          ENCORE
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 34, color: "#a8a1c6" }}>{`${name}'s ${topYear} in live music`}</div>
          <div style={{ display: "flex", gap: 80, marginTop: 26 }}>
            <Stat num={String(yearLogs.length)} label="shows" />
            <Stat num={topArtist} label="most seen" />
            <Stat num={avg} label="avg rating" />
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#6f6992" }}>Track every gig at encore.app</div>
      </div>
    ),
    { ...size }
  );
}
