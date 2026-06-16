import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { Avatar } from "@/components/Avatar";

export default async function NotificationsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const notifs = await prisma.notification.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { actor: { select: { handle: true, displayName: true, avatarUrl: true } } },
  });

  // Resolve artist names for performance-linked notifications.
  const perfIds = [...new Set(notifs.map((n) => n.performanceId).filter((x): x is string => !!x))];
  const perfs = perfIds.length
    ? await prisma.performance.findMany({
        where: { id: { in: perfIds } },
        select: { id: true, artist: { select: { name: true } } },
      })
    : [];
  const artistByPerf = new Map(perfs.map((p) => [p.id, p.artist.name]));

  // Mark everything read now that they're being viewed.
  await prisma.notification.updateMany({
    where: { userId: me.id, read: false },
    data: { read: true },
  });

  function render(n: (typeof notifs)[number]) {
    const actor = n.actor.displayName;
    const artist = n.performanceId ? artistByPerf.get(n.performanceId) : null;
    switch (n.type) {
      case "new_follower":
        return { text: <><strong>{actor}</strong> followed you</>, href: `/u/${n.actor.handle}` };
      case "friend_going":
        return { text: <><strong>{actor}</strong> is going to <strong>{artist}</strong></>, href: `/show/${n.performanceId}` };
      case "log_liked":
        return { text: <><strong>{actor}</strong> liked your review of <strong>{artist}</strong></>, href: `/show/${n.performanceId}` };
      case "log_commented":
        return { text: <><strong>{actor}</strong> commented on your review of <strong>{artist}</strong></>, href: `/show/${n.performanceId}` };
    }
  }

  return (
    <main className="container container-narrow">
      <h1 style={{ fontSize: 28, marginTop: 24 }}>Notifications</h1>

      {notifs.length === 0 ? (
        <div className="card" style={{ marginTop: 16 }}>
          <p className="muted" style={{ margin: 0 }}>Nothing yet. Follow people and log shows to get the ball rolling.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, marginTop: 16 }}>
          {notifs.map((n) => {
            const r = render(n);
            return (
              <Link
                key={n.id}
                href={r.href}
                className="feed-item"
                style={{ margin: 0, borderRadius: 0, border: "none", borderBottom: "1px solid var(--border-soft)", background: n.read ? "transparent" : "rgba(200,162,255,0.06)", alignItems: "center" }}
              >
                <Avatar name={n.actor.displayName} src={n.actor.avatarUrl} size={38} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 14 }}>{r.text}</span>
                  <div className="faint" style={{ fontSize: 12, marginTop: 2 }}>{timeAgo(n.createdAt)}</div>
                </div>
                {!n.read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-2)" }} />}
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
