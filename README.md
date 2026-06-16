# Encore — Live Music Cataloguing App (MVP)

A live-music diary. The atomic unit is the **performance**; the emotional unit is
the **memory** (a log). Built from [`DATA_MODEL.md`](../DATA_MODEL.md).

**Stack:** Next.js 15 (App Router) · TypeScript · Postgres · Prisma · cookie/JWT auth.

## The MVP loop (all working)

sign up → log a past show (artist autocomplete → pick the canonical performance →
setlist auto-fills → add rating / standing / who you went with / ticket stub + photos) →
see it on your profile **stub wall + year-in-review** → follow people → see their logs in a feed.

## Beyond the MVP (also built)

- **Real artist photography** pulled from the Deezer public API (no key) at seed time —
  see `src/lib/deezer.ts`. Letterboxd-style poster grids throughout.
- **Artist pages** (`/artist/[slug]`) — backdrop hero + every catalogued performance.
- **Show pages** (`/show/[id]`) — backdrop, setlist, average rating, the crowd's
  reviews + photos, "log this show", add-to-list.
- **Festivals** (`/festival/[slug]`) — lineup poster grid grouped by day, plus
  per-user **festival attendance** (the whole-trip take, distinct from per-set logs).
- **Lists** (`/lists`, `/list/[id]`) — ranked or unranked curated collections of shows.
- **Image upload** for ticket stubs and night-of photos (`/api/upload` → `public/uploads`).
- **Upcoming shows + wishlist** — future-dated shows in the catalogue; users mark
  **Going** (have a ticket) or **Want to go** (`plan` table, `/api/plan`). Shown on show
  pages ("who's going"), the profile **Upcoming** row, and `/upcoming`.
- **Location homepage** — `/` and `/upcoming` show upcoming highlights by city with a
  picker; the feed rail shows "upcoming near you" off your `home_city`.
- **setlist.fm importer** (`src/lib/setlistfm.ts`) — ready; set `SETLISTFM_API_KEY` to
  pull the real catalogue. Upcoming events are a stand-in for a live events feed
  (Bandsintown/Songkick) — same swap-in pattern when you want real listings.

## Run it

```bash
# Postgres must be running and a `livemusic` database must exist:
#   brew services start postgresql@16 && createdb livemusic

npm install
cp .env.example .env        # then set DATABASE_URL + AUTH_SECRET (a dev .env is already present)
npm run db:migrate          # apply schema
npm run db:seed             # catalogue + 3 demo users
npm run dev                 # http://localhost:3000
```

**Demo login:** `ava@example.com` / `password` (also `leo@…`, `noor@…`).

## Scripts

| script | what |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build (runs `prisma generate`) |
| `npm run db:migrate` | create/apply a migration |
| `npm run db:seed` | reset + seed catalogue and demo data |
| `npm run db:reset` | drop, re-migrate, re-seed |
| `npm run db:studio` | Prisma Studio |
| `npm run import:past` | import real shows+setlists from setlist.fm (needs `SETLISTFM_API_KEY`) |
| `npm run import:upcoming` | import upcoming concerts from Bandsintown (needs `BANDSINTOWN_APP_ID`) |

## Layout

- `prisma/schema.prisma` — full data model (all spec entities, snake_case tables).
- `prisma/seed.ts` — canonical catalogue (stands in for setlist.fm) + demo users/logs/follows.
- `src/lib/` — `db` (Prisma singleton), `auth` (bcrypt + JWT session), `format`,
  `slug`, `deezer` (artist images), `setlistfm` (importer).
- `src/components/` — `Poster`, `StubCard`, `ArtistImage`, `Avatar`, `Stars`,
  `ImageUploader`, `AddToList`, `FestivalAttendanceForm`, `NewListForm`, `FollowButton`, `NavBar`.
- `src/app/api/` — auth, artists, performances, performance/[id], logs, follow,
  upload, lists (+ items), festival-attendance.
- `src/app/` — `/` landing, `/login`, `/signup`, `/feed`, `/discover`, `/log/new`,
  `/u/[handle]`, `/artist/[slug]`, `/show/[id]`, `/festival/[slug]`, `/lists`, `/list/[id]`.

## Notes / deviations from the spec

- Added `user.password_hash` (the spec omits credentials; signup needs one).
- The full schema (events, festivals, festival_attendance, lists, verification fields,
  setlist as ordered JSON) is migrated and exercised by the UI.
- setlist.fm: the catalogue is currently seeded; `src/lib/setlistfm.ts` is a working
  client keyed by `SETLISTFM_API_KEY`. Artist/venue/setlist `setlistfm_*` columns are the
  swap-in point — no schema change needed to move from seed to live import.
- Artist photography comes from Deezer at seed time (no key). Falls back to a gradient
  initial when offline or unmatched.
- Image upload writes to `public/uploads` (gitignored). Fine for local/dev; swap for
  object storage (S3/R2) before deploying.
