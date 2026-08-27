# Deploy the HomeService backend (makes the Bank Alfalah card gateway work)

The card gateway blanks on `localhost` because Bank Alfalah needs a **public HTTPS**
`returnUrl`. Deploying the backend fixes it. The app can stay local — only the
**backend** needs to be public.

## Option A — Render (free, easiest) ✅ recommended

1. Push the repo to GitHub (already done: `geeksbotdev-bit/homeservice`).
2. Go to **https://render.com** → sign up (free) → **New ▸ Blueprint**.
3. Connect the GitHub repo `geeksbotdev-bit/homeservice`. Render reads `render.yaml`.
4. It creates a web service **homeservice-api**. Before/after first deploy, set the
   one secret in **Environment**:
   - `BAFL_API_PASSWORD` = `e2f00df4b27721716b6d92b5e3a6d42d`
5. Click **Apply / Deploy**. Wait ~2–3 min. You'll get a URL like:
   `https://homeservice-api.onrender.com`
6. Verify it's live: open `https://homeservice-api.onrender.com/health` → `{ "ok": true }`.
   Admin portal: `https://homeservice-api.onrender.com/admin` (passcode `homeservice-admin`).

`SELF_URL` auto-detects the Render URL, so the gateway returnUrl is already public. ✅

### Point the app at the deployed backend (to test card)
In **`client/.env`** set:
```
EXPO_PUBLIC_API_URL=https://homeservice-api.onrender.com
```
Restart the client: `npx expo start --web -c`. Now:
- Book Now → **Pay with Card** → Bank Alfalah page **renders properly** → pay with the
  test card → it returns to the app and searching begins.
- Test card: `5123 4500 0000 0008`, exp `05/39`, CVV `100`.

> Tip: keep two lines in `client/.env` and comment/uncomment —
> `EXPO_PUBLIC_API_URL=http://localhost:4000` for local, the Render URL for card testing.

## Option B — Railway (alternative)
1. https://railway.app → New Project → Deploy from GitHub → pick the repo.
2. Set **Root Directory** = `server`.
3. Build: `npm install && npx prisma generate && npx prisma db push --accept-data-loss && npx tsx prisma/seed.ts`
   Start: `npm run start`
4. Add the same env vars as Render (`BAFL_API_PASSWORD`, `ADMIN_KEY`, `DATABASE_URL=file:./dev.db`,
   `BAFL_*`, `CLIENT_URL`, `FIREBASE_PROJECT_ID`). Set `SELF_URL` to the Railway public URL.

## Persistent data (production) — PostgreSQL
SQLite on free hosts resets on redeploy. For real production:
1. Add a Postgres DB (Render/Railway/Supabase give a `DATABASE_URL`).
2. In `server/prisma/schema.prisma` set `provider = "postgresql"`.
3. Set `DATABASE_URL` to the Postgres connection string.
4. `npx prisma db push && npx tsx prisma/seed.ts`. Everything else is unchanged.

## Going fully live (real payments)
- Replace the Bank Alfalah **sandbox** creds with **production** merchant creds and
  set `BAFL_BASE_URL` to the production gateway URL (from Bank Alfalah).
- Change `JWT_SECRET` and `ADMIN_KEY` to strong secrets.
- Complete Bank Alfalah KYC (the form Khurram Jameel sent).
