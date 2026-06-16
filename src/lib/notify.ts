import { prisma } from "./db";

// Centralized notification creation. All are best-effort and never self-notify.

export async function notifyNewFollower(actorId: string, recipientId: string) {
  if (actorId === recipientId) return;
  await prisma.notification.create({
    data: { userId: recipientId, actorId, type: "new_follower" },
  });
}

export async function notifyLogInteraction(
  type: "log_liked" | "log_commented",
  actorId: string,
  logId: string
) {
  const log = await prisma.log.findUnique({ where: { id: logId }, select: { userId: true, performanceId: true } });
  if (!log || log.userId === actorId) return;
  await prisma.notification.create({
    data: { userId: log.userId, actorId, type, logId, performanceId: log.performanceId },
  });
}

/** When a user commits to an upcoming show, let their followers know. */
export async function notifyFriendGoing(actorId: string, performanceId: string) {
  const followers = await prisma.follow.findMany({
    where: { followeeId: actorId },
    select: { followerId: true },
  });
  if (followers.length === 0) return;
  await prisma.notification.createMany({
    data: followers.map((f) => ({
      userId: f.followerId,
      actorId,
      type: "friend_going" as const,
      performanceId,
    })),
  });
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } });
}
