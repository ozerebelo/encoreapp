# Deploying Encore (Vercel + Neon)

This app is a standard Next.js + Postgres app. Recommended hosting:

- **App:** Vercel (native Next.js, free Hobby tier).
- **Database:** Neon serverless Postgres (free tier) — or Vercel Postgres / Supabase.
- **Image uploads:** Vercel Blob (the app auto-switches to it when `BLOB_READ_WRITE_TOKEN`
  is set; falls back to local disk in dev). Vercel's filesystem is ephemeral, so Blob (or
  S3/R2) is required in production.

## 1. Push to GitHub

The repo is already initialized with a clean first commit. Create an empty GitHub repo, then:

```bash
git remote add origin git@github.com:<you>/encore.git
git push -u origin main
```

## 2. Create the database (Neon)

1. Create a project at https://neon.tech → copy the **pooled** connection string.
2. You'll set it as `DATABASE_URL` in Vercel (step 4). It looks like:
   `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`

## 3. Import the project into Vercel

1. https://vercel.com → New Project → import the GitHub repo.
2. Framework preset auto-detects **Next.js**. No build settings to change
   (`npm run build` runs `prisma generate` first).
3. Add a **Vercel Blob** store (Storage tab) — it sets `BLOB_READ_WRITE_TOKEN` automatically.

## 4. Environment variables (Vercel → Settings → Environment Variables)

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `AUTH_SECRET` | a long random string (`openssl rand -hex 32`) |
| `BLOB_READ_WRITE_TOKEN` | auto-set when you add a Blob store |
| `SETLISTFM_API_KEY` | optional — real past catalogue |
| `BANDSINTOWN_APP_ID` | optional — real upcoming concerts |

## 5. Run migrations + seed against the hosted DB

From your machine, pointing at Neon:

```bash
DATABASE_URL="<neon-url>" npx prisma migrate deploy
DATABASE_URL="<neon-url>" npm run db:seed          # optional demo data
# or import real data:
DATABASE_URL="<neon-url>" SETLISTFM_API_KEY=xxx npm run import:past
DATABASE_URL="<neon-url>" BANDSINTOWN_APP_ID=xxx npm run import:upcoming
```

> Use `prisma migrate deploy` (not `dev`) against production — it applies existing
> migrations without trying to create new ones.

## 6. Deploy

Every push to `main` auto-deploys. That's it.

## Notes

- Add a real domain in Vercel and update the share-card copy (`opengraph-image.tsx`
  references `encore.app`).
- The session cookie is `secure` in production — needs HTTPS, which Vercel provides.
