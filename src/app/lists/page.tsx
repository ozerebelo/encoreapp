import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NewListForm } from "@/components/NewListForm";
import { ArtistImage } from "@/components/ArtistImage";

export default async function ListsPage() {
  const me = await getCurrentUser();
  const lists = await prisma.list.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { handle: true, displayName: true } },
      items: {
        orderBy: { position: "asc" },
        take: 4,
        include: { performance: { include: { artist: { select: { name: true, imageUrl: true } } } } },
      },
      _count: { select: { items: true } },
    },
  });

  return (
    <main className="container container-narrow">
      <div className="spread" style={{ marginTop: 24 }}>
        <h1 style={{ fontSize: 28 }}>Lists</h1>
        {me && <NewListForm />}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
        {lists.map((list) => (
          <Link key={list.id} href={`/list/${list.id}`} className="card">
            <div className="spread">
              <div>
                <strong style={{ fontSize: 17 }}>{list.title}</strong>
                {list.isRanked && <span className="pill" style={{ marginLeft: 8 }}>ranked</span>}
              </div>
              <span className="faint" style={{ fontSize: 13 }}>{list._count.items} shows</span>
            </div>
            <div className="faint" style={{ fontSize: 13, marginTop: 2 }}>by {list.user.displayName}</div>
            {list.description && <p className="muted" style={{ margin: "8px 0 0", fontSize: 14 }}>{list.description}</p>}
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              {list.items.map((it) => (
                <div key={it.performanceId} style={{ width: 56, height: 56, borderRadius: 9, overflow: "hidden", border: "1px solid var(--border)" }}>
                  <ArtistImage name={it.performance.artist.name} src={it.performance.artist.imageUrl} />
                </div>
              ))}
            </div>
          </Link>
        ))}
        {lists.length === 0 && <p className="muted">No lists yet.</p>}
      </div>
    </main>
  );
}
