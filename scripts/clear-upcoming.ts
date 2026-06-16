import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  // Remove only Ticketmaster-sourced upcoming (future, no setlist id); keep the 3 future setlist.fm.
  const perfs = await p.performance.deleteMany({ where: { setlistfmId: null, performanceDate: { gte: today } } });
  const events = await p.event.deleteMany({ where: { performances: { none: {} } } });
  console.log(`Cleared ${perfs.count} upcoming perfs, ${events.count} orphan events.`);
  await p.$disconnect();
})();
