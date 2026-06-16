/**
 * Seed the canonical catalogue (stands in for setlist.fm) plus demo users with
 * logs, follows and lists so the product is explorable immediately.
 *
 * Artist photography is pulled live from the Deezer public API (no key needed)
 * so the UI looks real out of the box. Falls back to a gradient when offline.
 *
 * Demo login: any seeded user, password "password".
 */
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { slugify } from "../src/lib/slug";
import { fetchArtistImages } from "../src/lib/deezer";

const prisma = new PrismaClient();

type SetlistEntry = {
  song: string;
  set_label?: string | null;
  is_encore?: boolean;
  note?: string | null;
};

function setlist(main: string[], encore: string[] = []): SetlistEntry[] {
  return [
    ...main.map((song) => ({ song, set_label: "Main", is_encore: false })),
    ...encore.map((song) => ({ song, set_label: "Encore", is_encore: true })),
  ];
}

async function main() {
  console.log("Resetting catalogue + demo data...");
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.logPhoto.deleteMany();
  await prisma.log.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.festivalAttendance.deleteMany();
  await prisma.listItem.deleteMany();
  await prisma.list.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.performance.deleteMany();
  await prisma.event.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.user.deleteMany();

  // --- Artists (image fetched from Deezer) ---------------------------------
  const artistNames = [
    "Phoebe Bridgers",
    "The 1975",
    "Tame Impala",
    "Mitski",
    "Fontaines D.C.",
    "Japanese Breakfast",
    "Arctic Monkeys",
    "Caroline Polachek",
    "King Gizzard & the Lizard Wizard",
    "Wet Leg",
    "boygenius",
    "Beach House",
    "Lana Del Rey",
    "The Strokes",
    "Big Thief",
    "Florence + the Machine",
    "Charli XCX",
    "Slowdive",
  ];

  console.log(`Fetching artist photography from Deezer (${artistNames.length})...`);
  const artists: Record<string, { id: string; name: string; imageUrl: string | null }> = {};
  for (const name of artistNames) {
    const img = await fetchArtistImages(name);
    const created = await prisma.artist.create({
      data: { name, slug: slugify(name), imageUrl: img?.imageUrl ?? null },
    });
    artists[name] = created;
    process.stdout.write(img?.imageUrl ? "●" : "○");
  }
  process.stdout.write("\n");

  // --- Venues --------------------------------------------------------------
  const venueData = [
    { name: "Brixton Academy", city: "London", country: "GB" },
    { name: "Roundhouse", city: "London", country: "GB" },
    { name: "Alexandra Palace", city: "London", country: "GB" },
    { name: "Coliseu dos Recreios", city: "Lisbon", country: "PT" },
    { name: "Razzmatazz", city: "Barcelona", country: "ES" },
    { name: "Brooklyn Steel", city: "New York", country: "US" },
    { name: "The Fillmore", city: "San Francisco", country: "US" },
    { name: "Paradiso", city: "Amsterdam", country: "NL" },
    { name: "Olympia", city: "Paris", country: "FR" },
    { name: "Parc del Fòrum", city: "Barcelona", country: "ES" },
  ];
  const venues: Record<string, { id: string; name: string; city: string }> = {};
  for (const v of venueData) {
    venues[v.name] = await prisma.venue.create({
      data: { name: v.name, slug: slugify(v.name), city: v.city, countryCode: v.country },
    });
  }

  // --- Concert helper ------------------------------------------------------
  const p: Record<string, { id: string }> = {};
  async function concert(key: string, opts: {
    artist: string;
    venue: string;
    date: string;
    setlist: SetlistEntry[];
  }) {
    const v = venues[opts.venue];
    const a = artists[opts.artist];
    const ev = await prisma.event.create({
      data: {
        type: "concert",
        name: `${a.name} at ${v.name}`,
        slug: slugify(`${a.name}-${v.name}-${opts.date}`),
        venueId: v.id,
        startDate: new Date(opts.date),
      },
    });
    p[key] = await prisma.performance.create({
      data: {
        eventId: ev.id,
        artistId: a.id,
        performanceDate: new Date(opts.date),
        isHeadliner: true,
        setlist: opts.setlist as unknown as Prisma.InputJsonValue,
      },
    });
  }

  await concert("phoebe", { artist: "Phoebe Bridgers", venue: "Brixton Academy", date: "2024-03-14",
    setlist: setlist(["Motion Sickness", "Garden Song", "Kyoto", "Punisher", "Chinese Satellite", "Savior Complex", "Graceland Too"], ["I Know the End"]) });
  await concert("phoebe2", { artist: "Phoebe Bridgers", venue: "Olympia", date: "2023-06-09",
    setlist: setlist(["DVD Menu", "Motion Sickness", "Garden Song", "Kyoto", "Moon Song", "Punisher"], ["I Know the End"]) });
  await concert("the1975", { artist: "The 1975", venue: "Roundhouse", date: "2024-01-20",
    setlist: setlist(["The 1975", "Looking for Somebody (To Love)", "Happiness", "It's Not Living", "Chocolate", "Robbers"], ["Sex", "Give Yourself a Try"]) });
  await concert("the1975b", { artist: "The 1975", venue: "Alexandra Palace", date: "2023-12-12",
    setlist: setlist(["Part of the Band", "Happiness", "TOOTIMETOOTIMETOOTIME", "If You're Too Shy", "Somebody Else"], ["About You"]) });
  await concert("tame", { artist: "Tame Impala", venue: "Coliseu dos Recreios", date: "2023-11-02",
    setlist: setlist(["One More Year", "Borderline", "Let It Happen", "The Less I Know the Better", "Elephant", "Feels Like We Only Go Backwards"], ["New Person, Same Old Mistakes"]) });
  await concert("mitski", { artist: "Mitski", venue: "Brooklyn Steel", date: "2024-02-29",
    setlist: setlist(["Bug Like an Angel", "Working for the Knife", "Washing Machine Heart", "Nobody", "Your Best American Girl", "First Love / Late Spring"], ["A Pearl"]) });
  await concert("mitski2", { artist: "Mitski", venue: "Paradiso", date: "2023-07-21",
    setlist: setlist(["Love Me More", "Working for the Knife", "Should've Been Me", "Nobody", "Stay Soft"], ["Two Slow Dancers"]) });
  await concert("fontaines", { artist: "Fontaines D.C.", venue: "Razzmatazz", date: "2024-04-05",
    setlist: setlist(["A Hero's Death", "Televised Mind", "Jackie Down the Line", "I Love You", "Boys in the Better Land"], ["Big"]) });
  await concert("jbrekkie", { artist: "Japanese Breakfast", venue: "The Fillmore", date: "2023-09-18",
    setlist: setlist(["Paprika", "Be Sweet", "Kokomo, IN", "Slide Tackle", "Posing in Bondage", "Diving Woman"], ["Everybody Wants to Love You"]) });
  await concert("arctic", { artist: "Arctic Monkeys", venue: "Brixton Academy", date: "2023-10-22",
    setlist: setlist(["Sculptures of Anything Goes", "Brianstorm", "Snap Out of It", "Crying Lightning", "Do I Wanna Know?", "505"], ["I Bet You Look Good on the Dancefloor", "R U Mine?"]) });
  await concert("caroline", { artist: "Caroline Polachek", venue: "Roundhouse", date: "2024-05-11",
    setlist: setlist(["Welcome to My Island", "Pretty in Possible", "Bunny Is a Rider", "Sunset", "So Hot You're Hurting My Feelings"], ["Door"]) });
  await concert("lana", { artist: "Lana Del Rey", venue: "Alexandra Palace", date: "2023-07-10",
    setlist: setlist(["A&W", "Young and Beautiful", "Pretty When You Cry", "Norman Fucking Rockwell", "Video Games", "Summertime Sadness"], ["Venice Bitch"]) });
  await concert("strokes", { artist: "The Strokes", venue: "Alexandra Palace", date: "2024-02-18",
    setlist: setlist(["Bad Decisions", "The Modern Age", "Reptilia", "You Only Live Once", "Someday", "Last Nite"], ["Hard to Explain"]) });
  await concert("bigthief", { artist: "Big Thief", venue: "Paradiso", date: "2024-03-30",
    setlist: setlist(["Vampire Empire", "Shark Smile", "Simulation Swarm", "Not", "Cattails"], ["Change"]) });
  await concert("florence", { artist: "Florence + the Machine", venue: "Olympia", date: "2023-11-19",
    setlist: setlist(["King", "Ship to Wreck", "Dog Days Are Over", "Shake It Out", "Free"], ["Rabbit Heart"]) });
  await concert("slowdive", { artist: "Slowdive", venue: "Roundhouse", date: "2024-04-27",
    setlist: setlist(["Shanty", "Star Roving", "Catch the Breeze", "Souvlaki Space Station", "Alison"], ["40 Days"]) });

  // --- Festival edition (parent event with many performances) --------------
  const forum = venues["Parc del Fòrum"];
  const primavera = await prisma.event.create({
    data: {
      type: "festival",
      name: "Primavera Sound 2024",
      slug: "primavera-sound-2024",
      venueId: forum.id,
      startDate: new Date("2024-05-30"),
      endDate: new Date("2024-06-01"),
    },
  });
  async function festSet(key: string, artist: string, date: string, stage: string, sl: SetlistEntry[], headliner = false) {
    p[key] = await prisma.performance.create({
      data: {
        eventId: primavera.id,
        artistId: artists[artist].id,
        performanceDate: new Date(date),
        stage,
        isHeadliner: headliner,
        setlist: sl as unknown as Prisma.InputJsonValue,
      },
    });
  }
  await festSet("fest_king", "King Gizzard & the Lizard Wizard", "2024-05-30", "Estrella Damm", setlist(["Rattlesnake", "Robot Stop", "The River", "Crumbling Castle"]), true);
  await festSet("fest_lana", "Lana Del Rey", "2024-05-30", "Pull&Bear", setlist(["Without You", "Born to Die", "Ride", "Video Games"]), true);
  await festSet("fest_wetleg", "Wet Leg", "2024-05-31", "Pull&Bear", setlist(["Being in Love", "Wet Dream", "Ur Mum", "Chaise Longue"]));
  await festSet("fest_boygenius", "boygenius", "2024-05-31", "Estrella Damm", setlist(["$20", "Emily I'm Sorry", "True Blue", "Not Strong Enough"], ["Ketchum, ID"]), true);
  await festSet("fest_charli", "Charli XCX", "2024-05-31", "Cupra", setlist(["Von dutch", "360", "Speed Drive", "Boom Clap"]));
  await festSet("fest_beach", "Beach House", "2024-06-01", "Cupra", setlist(["Levitation", "Space Song", "Myth", "Silver Soul"]));
  await festSet("fest_bigthief", "Big Thief", "2024-06-01", "Estrella Damm", setlist(["Vampire Empire", "Shark Smile", "Simulation Swarm"]));

  // --- Upcoming shows (future-dated, no setlist yet) ------------------------
  // Stands in for a live events feed (Bandsintown/Songkick). Drives the
  // location homepage and the wishlist. "Today" in this build is 2026-06-16.
  async function upcoming(key: string, opts: { artist: string; venue: string; date: string }) {
    const v = venues[opts.venue];
    const a = artists[opts.artist];
    const ev = await prisma.event.create({
      data: {
        type: "concert",
        name: `${a.name} at ${v.name}`,
        slug: slugify(`${a.name}-${v.name}-${opts.date}`),
        venueId: v.id,
        startDate: new Date(opts.date),
      },
    });
    p[key] = await prisma.performance.create({
      data: { eventId: ev.id, artistId: a.id, performanceDate: new Date(opts.date), isHeadliner: true },
    });
  }
  await upcoming("up_mitski_lon", { artist: "Mitski", venue: "Brixton Academy", date: "2026-07-09" });
  await upcoming("up_caroline_lon", { artist: "Caroline Polachek", venue: "Alexandra Palace", date: "2026-09-21" });
  await upcoming("up_the1975_lon", { artist: "The 1975", venue: "Roundhouse", date: "2026-10-02" });
  await upcoming("up_slowdive_lon", { artist: "Slowdive", venue: "Roundhouse", date: "2026-11-14" });
  await upcoming("up_fontaines_bcn", { artist: "Fontaines D.C.", venue: "Razzmatazz", date: "2026-07-18" });
  await upcoming("up_charli_bcn", { artist: "Charli XCX", venue: "Razzmatazz", date: "2026-08-30" });
  await upcoming("up_phoebe_nyc", { artist: "Phoebe Bridgers", venue: "Brooklyn Steel", date: "2026-08-12" });
  await upcoming("up_bigthief_nyc", { artist: "Big Thief", venue: "Brooklyn Steel", date: "2026-10-19" });
  await upcoming("up_tame_lis", { artist: "Tame Impala", venue: "Coliseu dos Recreios", date: "2026-09-05" });
  await upcoming("up_lana_lis", { artist: "Lana Del Rey", venue: "Coliseu dos Recreios", date: "2026-11-01" });
  await upcoming("up_strokes_ams", { artist: "The Strokes", venue: "Paradiso", date: "2026-07-25" });
  await upcoming("up_florence_par", { artist: "Florence + the Machine", venue: "Olympia", date: "2026-10-10" });

  // --- Demo users ----------------------------------------------------------
  const passwordHash = await bcrypt.hash("password", 10);
  const userData = [
    { handle: "ava", displayName: "Ava Mendes", email: "ava@example.com", homeCity: "London", bio: "Front-rail or nothing. 200+ shows and counting." },
    { handle: "leo", displayName: "Leo Park", email: "leo@example.com", homeCity: "Barcelona", bio: "Collecting stubs since 2015. Shoegaze apologist." },
    { handle: "noor", displayName: "Noor Haddad", email: "noor@example.com", homeCity: "New York", bio: "Sad songs, loud rooms." },
    { handle: "kit", displayName: "Kit Almeida", email: "kit@example.com", homeCity: "Lisbon", bio: "Festival lifer. Will queue for the barrier." },
  ];
  const users: Record<string, { id: string }> = {};
  for (const u of userData) {
    users[u.handle] = await prisma.user.create({ data: { ...u, passwordHash } });
  }

  // --- Follows -------------------------------------------------------------
  await prisma.follow.createMany({
    data: [
      { followerId: users.ava.id, followeeId: users.leo.id },
      { followerId: users.ava.id, followeeId: users.noor.id },
      { followerId: users.ava.id, followeeId: users.kit.id },
      { followerId: users.leo.id, followeeId: users.ava.id },
      { followerId: users.leo.id, followeeId: users.kit.id },
      { followerId: users.noor.id, followeeId: users.ava.id },
      { followerId: users.kit.id, followeeId: users.ava.id },
      { followerId: users.kit.id, followeeId: users.leo.id },
    ],
  });

  // --- Logs (the memories) -------------------------------------------------
  type LogSeed = {
    user: string; perf: string; rating?: number; review?: string;
    standing?: "pit" | "ga_floor" | "seated" | "balcony" | "other";
    attendedWith?: string; favorite?: boolean; date: string;
  };
  const logs: LogSeed[] = [
    { user: "ava", perf: "phoebe", rating: 5, review: "Cried through the whole encore. The horns on I Know the End undid me.", standing: "ga_floor", attendedWith: "Sam", favorite: true, date: "2024-03-14" },
    { user: "ava", perf: "arctic", rating: 4.5, review: "Alex Turner crooner era, fully committed. 505 still levels the room.", standing: "pit", date: "2023-10-22" },
    { user: "ava", perf: "caroline", rating: 4, review: "Those vocal runs live are genuinely unreal.", standing: "ga_floor", attendedWith: "Mei", date: "2024-05-11" },
    { user: "ava", perf: "fest_boygenius", rating: 5, review: "Festival highlight, no contest. Three-part harmonies in the open air.", standing: "ga_floor", favorite: true, date: "2024-05-31" },
    { user: "ava", perf: "slowdive", rating: 4.5, review: "Pure wall of sound. Felt it in my chest.", standing: "ga_floor", date: "2024-04-27" },
    { user: "ava", perf: "strokes", rating: 4, review: "Reptilia opener, crowd lost it.", standing: "pit", date: "2024-02-18" },
    { user: "leo", perf: "fontaines", rating: 4.5, review: "Razzmatazz was sweating. Big sounded enormous.", standing: "pit", date: "2024-04-05" },
    { user: "leo", perf: "tame", rating: 4, review: "Lasers + Let It Happen = transcendence.", standing: "seated", attendedWith: "Ana", date: "2023-11-02" },
    { user: "leo", perf: "fest_king", rating: 5, review: "Microtonal chaos at sunset. Best 90 minutes of the weekend.", standing: "pit", favorite: true, date: "2024-05-30" },
    { user: "leo", perf: "slowdive", rating: 5, review: "Souvlaki Space Station live is a religious experience.", standing: "ga_floor", favorite: true, date: "2024-04-27" },
    { user: "leo", perf: "bigthief", rating: 4.5, review: "Adrianne Lenker could hush a stadium.", standing: "seated", date: "2024-03-30" },
    { user: "noor", perf: "mitski", rating: 5, review: "Theatrical, devastating, perfect. The choreography!", standing: "seated", attendedWith: "Dad", favorite: true, date: "2024-02-29" },
    { user: "noor", perf: "jbrekkie", rating: 4, review: "Paprika opener got me. Michelle on the gong.", standing: "ga_floor", date: "2023-09-18" },
    { user: "noor", perf: "the1975", rating: 3.5, review: "Set design > setlist but still a great night.", standing: "balcony", date: "2024-01-20" },
    { user: "noor", perf: "lana", rating: 4.5, review: "Ethereal. Video Games under the dome.", standing: "seated", attendedWith: "Ren", favorite: true, date: "2023-07-10" },
    { user: "kit", perf: "fest_king", rating: 4.5, review: "Mosh of my life.", standing: "pit", date: "2024-05-30" },
    { user: "kit", perf: "fest_charli", rating: 5, review: "BRAT summer started here. Von dutch into 360.", standing: "ga_floor", favorite: true, date: "2024-05-31" },
    { user: "kit", perf: "fest_beach", rating: 4, review: "Dreamy close to the festival.", standing: "ga_floor", date: "2024-06-01" },
    { user: "kit", perf: "florence", rating: 4.5, review: "Florence ran through the crowd barefoot. Dog Days went off.", standing: "pit", attendedWith: "Jo", date: "2023-11-19" },
    { user: "kit", perf: "phoebe2", rating: 4, review: "Paris was quieter but Moon Song hit different.", standing: "seated", date: "2023-06-09" },
  ];
  // Backdate createdAt so the activity feed shows varied "time ago" labels.
  const HOUR = 3600 * 1000;
  const logByKey: Record<string, { id: string; userId: string }> = {};
  for (let i = 0; i < logs.length; i++) {
    const l = logs[i];
    const created = await prisma.log.create({
      data: {
        userId: users[l.user].id,
        performanceId: p[l.perf].id,
        rating: l.rating != null ? new Prisma.Decimal(l.rating) : null,
        review: l.review ?? null,
        standing: l.standing ?? null,
        attendedWith: l.attendedWith ?? null,
        isFavorite: l.favorite ?? false,
        loggedDate: new Date(l.date),
        createdAt: new Date(Date.now() - i * 30 * HOUR),
      },
    });
    logByKey[`${l.user}:${l.perf}`] = { id: created.id, userId: users[l.user].id };
  }

  // --- Likes, comments, notifications --------------------------------------
  const likeSeed: [string, string][] = [ // [liker, logKey]
    ["noor", "ava:phoebe"], ["leo", "ava:phoebe"], ["kit", "ava:phoebe"],
    ["ava", "leo:fest_king"], ["kit", "leo:fest_king"],
    ["ava", "noor:mitski"], ["leo", "noor:mitski"],
    ["ava", "kit:fest_charli"],
  ];
  for (const [liker, key] of likeSeed) {
    const log = logByKey[key];
    if (log) await prisma.like.create({ data: { userId: users[liker].id, logId: log.id } });
  }

  const commentSeed: [string, string, string][] = [ // [commenter, logKey, body]
    ["leo", "ava:phoebe", "Gutted I missed this one. The encore sounds unreal."],
    ["noor", "ava:phoebe", "Saw the tour in NYC — Graceland Too wrecked me too."],
    ["ava", "noor:mitski", "The choreography! Still thinking about it."],
    ["kit", "leo:fest_king", "Best pit of the weekend, hands down."],
  ];
  for (const [who, key, body] of commentSeed) {
    const log = logByKey[key];
    if (log) await prisma.comment.create({ data: { userId: users[who].id, logId: log.id, body } });
  }

  // A few unread notifications for Ava so the bell + page have content.
  const avaPhoebe = logByKey["ava:phoebe"];
  await prisma.notification.createMany({
    data: [
      { userId: users.ava.id, actorId: users.kit.id, type: "new_follower", createdAt: new Date(Date.now() - 2 * HOUR) },
      { userId: users.ava.id, actorId: users.noor.id, type: "log_liked", logId: avaPhoebe.id, performanceId: p.phoebe.id, createdAt: new Date(Date.now() - 5 * HOUR) },
      { userId: users.ava.id, actorId: users.leo.id, type: "log_commented", logId: avaPhoebe.id, performanceId: p.phoebe.id, createdAt: new Date(Date.now() - 8 * HOUR) },
      { userId: users.ava.id, actorId: users.leo.id, type: "friend_going", performanceId: p.up_fontaines_bcn.id, createdAt: new Date(Date.now() - 26 * HOUR) },
    ],
  });

  // --- Plans (wishlist / going to upcoming shows) --------------------------
  type PlanSeed = { user: string; perf: string; status: "interested" | "going" };
  const plans: PlanSeed[] = [
    { user: "ava", perf: "up_mitski_lon", status: "going" },
    { user: "ava", perf: "up_the1975_lon", status: "going" },
    { user: "ava", perf: "up_caroline_lon", status: "interested" },
    { user: "ava", perf: "up_slowdive_lon", status: "interested" },
    { user: "leo", perf: "up_fontaines_bcn", status: "going" },
    { user: "leo", perf: "up_charli_bcn", status: "interested" },
    { user: "leo", perf: "up_slowdive_lon", status: "going" },
    { user: "noor", perf: "up_phoebe_nyc", status: "going" },
    { user: "noor", perf: "up_bigthief_nyc", status: "interested" },
    { user: "kit", perf: "up_tame_lis", status: "going" },
    { user: "kit", perf: "up_lana_lis", status: "interested" },
  ];
  await prisma.plan.createMany({
    data: plans.map((pl, i) => ({
      userId: users[pl.user].id,
      performanceId: p[pl.perf].id,
      status: pl.status,
      createdAt: new Date(Date.now() - i * 26 * HOUR),
    })),
  });

  // Festival attendance (the overall trip take), distinct from per-set logs.
  await prisma.festivalAttendance.createMany({
    data: [
      { userId: users.ava.id, eventId: primavera.id, rating: new Prisma.Decimal(4.5), review: "Three days, sunburnt, would do it again immediately." },
      { userId: users.kit.id, eventId: primavera.id, rating: new Prisma.Decimal(5), review: "Best lineup top to bottom in years." },
    ],
  });

  // --- A curated list ------------------------------------------------------
  const list = await prisma.list.create({
    data: {
      userId: users.ava.id,
      title: "Shows that wrecked me (in a good way)",
      description: "Performances I think about constantly. Ranked, loosely.",
      isRanked: true,
      createdAt: new Date(Date.now() - 2 * 24 * HOUR),
    },
  });
  await prisma.listItem.createMany({
    data: [
      { listId: list.id, performanceId: p.phoebe.id, position: 1, note: "The encore. That's it. That's the show." },
      { listId: list.id, performanceId: p.fest_boygenius.id, position: 2, note: null },
      { listId: list.id, performanceId: p.slowdive.id, position: 3, note: "Felt it in my ribcage." },
      { listId: list.id, performanceId: p.strokes.id, position: 4, note: null },
    ],
  });

  console.log("\nSeed complete.");
  console.log(`  ${artistNames.length} artists, ${venueData.length} venues, ${logs.length} logs, ${plans.length} plans`);
  console.log("  Demo login -> ava@example.com / password");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
