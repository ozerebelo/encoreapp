import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { FollowButton } from "@/components/FollowButton";
import { Avatar } from "@/components/Avatar";

export default async function DiscoverPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const following = await prisma.follow.findMany({
    where: { followerId: me.id },
    select: { followeeId: true },
  });
  const followingSet = new Set(following.map((f) => f.followeeId));

  const users = await prisma.user.findMany({
    where: { id: { not: me.id } },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { logs: true, followers: true } } },
    take: 50,
  });

  return (
    <main className="container" style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: 28, marginTop: 24 }}>Discover people</h1>
      <p className="muted" style={{ marginTop: -4 }}>Follow others to fill your feed.</p>

      <div className="card" style={{ padding: 0, marginTop: 16 }}>
        {users.map((u) => (
          <div key={u.id} className="feed-item" style={{ padding: 16, alignItems: "center" }}>
            <Link href={`/u/${u.handle}`}>
              <Avatar name={u.displayName} src={u.avatarUrl} />
            </Link>
            <div style={{ flex: 1 }}>
              <Link href={`/u/${u.handle}`}><strong>{u.displayName}</strong></Link>
              <div className="faint" style={{ fontSize: 13 }}>
                @{u.handle} · {u._count.logs} shows · {u._count.followers} followers
              </div>
              {u.bio && <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>{u.bio}</p>}
            </div>
            <FollowButton handle={u.handle} initialFollowing={followingSet.has(u.id)} />
          </div>
        ))}
      </div>
    </main>
  );
}
