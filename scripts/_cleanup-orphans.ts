import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const events = await p.event.deleteMany({ where: { performances: { none: {} } } });
  const artists = await p.artist.deleteMany({ where: { performances: { none: {} } } });
  const venues = await p.venue.deleteMany({ where: { events: { none: {} } } });
  console.log(`Removed ${events.count} orphan events, ${artists.count} orphan artists, ${venues.count} orphan venues.`);
  const [a, v, e, pf, f] = await Promise.all([
    p.artist.count(), p.venue.count(), p.event.count(), p.performance.count(), p.event.count({ where: { type: "festival" } }),
  ]);
  console.log(`Catalogue: ${a} artists, ${v} venues, ${e} events (${f} festivals), ${pf} performances.`);
  await p.$disconnect();
})();
