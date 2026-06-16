import { prisma } from "./db";
import { toNumber } from "./format";

type FeedUser = { handle: string; displayName: string; avatarUrl: string | null };

export type Activity =
  | {
      kind: "log";
      at: Date;
      user: FeedUser;
      perfId: string;
      artist: string;
      artistImage: string | null;
      venue: string | null;
      city: string | null;
      date: Date;
      rating: number | null;
      review: string | null;
      standing: string | null;
      attendedWith: string | null;
      isFavorite: boolean;
      photos: string[];
    }
  | {
      kind: "plan";
      at: Date;
      user: FeedUser;
      perfId: string;
      artist: string;
      artistImage: string | null;
      venue: string | null;
      city: string | null;
      date: Date;
    }
  | {
      kind: "list";
      at: Date;
      user: FeedUser;
      listId: string;
      title: string;
      itemCount: number;
      thumbs: string[];
    };

/** A merged, time-sorted activity stream from a set of users. */
export async function getActivity(userIds: string[], limit = 30): Promise<Activity[]> {
  const [logs, plans, lists] = await Promise.all([
    prisma.log.findMany({
      where: { userId: { in: userIds } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { handle: true, displayName: true, avatarUrl: true } },
        photos: { orderBy: { position: "asc" }, take: 3 },
        performance: {
          include: {
            artist: { select: { name: true, imageUrl: true } },
            event: { select: { name: true, venue: { select: { name: true, city: true } } } },
          },
        },
      },
    }),
    prisma.plan.findMany({
      where: { userId: { in: userIds }, status: "going" },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { handle: true, displayName: true, avatarUrl: true } },
        performance: {
          include: {
            artist: { select: { name: true, imageUrl: true } },
            event: { select: { name: true, venue: { select: { name: true, city: true } } } },
          },
        },
      },
    }),
    prisma.list.findMany({
      where: { userId: { in: userIds } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { handle: true, displayName: true, avatarUrl: true } },
        _count: { select: { items: true } },
        items: {
          orderBy: { position: "asc" },
          take: 4,
          include: { performance: { include: { artist: { select: { imageUrl: true } } } } },
        },
      },
    }),
  ]);

  const acts: Activity[] = [];

  for (const l of logs) {
    acts.push({
      kind: "log",
      at: l.createdAt,
      user: l.user,
      perfId: l.performanceId,
      artist: l.performance.artist.name,
      artistImage: l.performance.artist.imageUrl,
      venue: l.performance.event.venue?.name ?? l.performance.event.name ?? null,
      city: l.performance.event.venue?.city ?? null,
      date: l.loggedDate,
      rating: toNumber(l.rating),
      review: l.review,
      standing: l.standing,
      attendedWith: l.attendedWith,
      isFavorite: l.isFavorite,
      photos: l.photos.map((p) => p.url),
    });
  }
  for (const pl of plans) {
    acts.push({
      kind: "plan",
      at: pl.createdAt,
      user: pl.user,
      perfId: pl.performanceId,
      artist: pl.performance.artist.name,
      artistImage: pl.performance.artist.imageUrl,
      venue: pl.performance.event.venue?.name ?? pl.performance.event.name ?? null,
      city: pl.performance.event.venue?.city ?? null,
      date: pl.performance.performanceDate,
    });
  }
  for (const list of lists) {
    if (list._count.items === 0) continue;
    acts.push({
      kind: "list",
      at: list.createdAt,
      user: list.user,
      listId: list.id,
      title: list.title,
      itemCount: list._count.items,
      thumbs: list.items.map((it) => it.performance.artist.imageUrl).filter((x): x is string => !!x),
    });
  }

  acts.sort((a, b) => b.at.getTime() - a.at.getTime());
  return acts.slice(0, limit);
}
