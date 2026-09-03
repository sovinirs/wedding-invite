# Cinematic Wedding Invitations

A platform for creating shareable wedding invitations, each one a short film the
guest scrolls through with their thumb before arriving at the invitation card.

Couples sign up, pick a cinematic, fill in their details, and get a link:
`/i/their-names`.

## How the cinematic works

The film **never plays**. It is a `muted playsInline` `<video>` used purely as a
frame source:

1. An empty `620vh` spacer inside a scroll container creates scroll distance.
2. On scroll, `progress = scrollTop / (scrollHeight - clientHeight)`, clamped 0–1.
3. A `requestAnimationFrame` loop eases a smoothed value toward that target
   (0.1 desktop, 0.14 mobile), then sets `video.currentTime = duration × smoothed`.

So the scroll gesture *is* the playhead. Overlay copy is keyframed off the same
progress value, and over the last stretch the film dissolves to reveal the
invitation card, which fires a staggered entrance and a confetti burst.

Seeking is the fragile part, so it is guarded: in-flight seeks are dropped via a
`seeking`/`seeked` flag, targets are clamped to `video.seekable`, and on mobile a
seek past `buffered.end + 0.5s` is refused rather than stalling on black.

## Getting started

```bash
npm install
cp .env.example .env  # then fill in DATABASE_URL, DIRECT_URL, SESSION_SECRET
npm run templates     # render the cinematics (needs ffmpeg)
npm run db:migrate
npm run seed          # demo@example.com / demo12345
npm run dev
```

Then open <http://localhost:3000>. The seeded invitation is at `/i/demo-wedding`.

## Layout

```
src/
  app/
    page.tsx              landing
    login/  signup/       auth
    dashboard/            list, new, [id] edit
    i/[slug]/             the public invitation
    actions.ts            all mutations (server actions)
  components/
    invite/
      CinematicInvite.tsx the scrub engine
      ScrollOverlays.tsx  progress-keyframed copy
      InvitationCard.tsx  the card
      Confetti.tsx        canvas particle burst
      EntryGate.tsx       "Tap to Begin" / audio unlock
    InviteForm.tsx        the builder
  lib/
    auth.ts               scrypt hashing + signed cookie sessions
    templates.ts          the cinematic registry
    slug.ts               link names
public/templates/<id>/    video.mp4, video-mobile.mp4, music.mp3
```

## The cinematics

The three films are **generated procedurally**, not stock footage — they are
original and yours outright. Each is an *entrance*: the camera dollies forward
through receding openings toward a warm light and emerges into brightness,
which is exactly where the invitation page dissolves the film and reveals the
card.

```bash
npm run templates        # renders all three, ~2 min
```

`scripts/scene.mjs` holds the drawing code (canvas 2D), and
`scripts/render-cinematic.mjs` steps a headless browser through 360 frames,
encodes them, and generates the score. Templates differ by motif and palette:

| id | motif | feel |
|---|---|---|
| `temple` | arched doorways | lamplit stone, warm gold |
| `garden` | leafy canopy | green dusk, strung light |
| `coast` | cave mouth | pale blue morning |

Tune the look by editing the `TEMPLATES` config in `render-cinematic.mjs`
(`openW`, `openH`, `travel`, palette) or the drawing itself in `scene.mjs`.

### Using real footage instead

These are stylised — good, but they are rendered shapes and light, not
photography. Real footage of your own venue will always be better. Drop in
`video.mp4`, `video-mobile.mp4` and `music.mp3` under
`public/templates/<id>/`, add an entry to `TEMPLATES` in
`src/lib/templates.ts` with its palette, and you are done.

**Encode for seeking, not for streaming.** A short keyframe interval is what
lets the browser land on any frame; a long GOP makes the scrub visibly snap:

```bash
ffmpeg -i source.mov \
  -c:v libx264 -preset slow -crf 26 \
  -g 10 -keyint_min 10 -sc_threshold 0 \
  -movflags +faststart -an out.mp4
```

Keep the desktop cut under ~10 MB and ship a smaller `video-mobile.mp4`
(Android is served this one — it stalls badly seeking large files). Portrait
suits a link opened on a phone; the player uses `object-fit: cover`, so any
aspect ratio works.

## Auth

Email and password, hashed with `scrypt` (16-byte salt, 64-byte key). Sessions
live in the database; the cookie carries `<sessionId>.<hmac>` signed with
`SESSION_SECRET`, so a forged id is rejected before any query runs. Cookies are
`httpOnly`, `sameSite=lax`, and `secure` in production.

Every invitation query is scoped by `userId`, so one account cannot read or edit
another's. Unpublished invitations 404 publicly.

## Testing

```bash
npm run dev
BASE=http://localhost:3000 npm run e2e
```

Drives a real browser through signup → build → share → scrub → card, and checks
ownership isolation.

## Deploying to Vercel

The app runs on Postgres. Vercel's filesystem is ephemeral, so a SQLite file
would be wiped on every deploy — the server refuses to boot if `DATABASE_URL`
still points at one.

**1. Create a Postgres database.** In the Vercel dashboard: Storage -> Create
Database -> Neon (Postgres). Any Postgres works — Supabase, Railway, RDS.

**2. Set environment variables** (Project -> Settings -> Environment Variables),
for Production *and* Preview. See `.env.example`.

| Variable | Value |
|---|---|
| `DATABASE_URL` | **Pooled** connection string (Neon: the `-pooler` host) |
| `DIRECT_URL` | **Unpooled** connection string, same database |
| `SESSION_SECRET` | 32+ random characters, stable across deploys |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Serverless functions open many short-lived connections, which exhausts a direct
Postgres server — hence the pooled URL for the app. `prisma migrate` needs a
session a pooler cannot give it, hence the direct URL for migrations.

`SESSION_SECRET` must not change between deploys, or every existing cookie
fails to verify and all users are signed out.

**3. Deploy.** `npm run build` runs `prisma generate && prisma migrate deploy`
before `next build`, so the schema is applied automatically on every deploy.

Config mistakes fail the boot with a readable message (`src/instrumentation.ts`)
rather than surfacing later as an opaque error digest inside a Server Action.

### Local development

Local dev now needs Postgres too. Simplest is to point `.env` at the same Neon
database (or a Neon dev branch); otherwise run one in Docker:

```bash
docker run -d --name wi-pg -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=wedding \
  -p 55432:5432 postgres:16-alpine
# DATABASE_URL=DIRECT_URL="postgresql://postgres:pw@localhost:55432/wedding?schema=public"
npm run db:migrate
```

### On scaling the video

Templates are committed to `public/` (~20 MB for all three), so they are served
from Vercel's CDN with range requests and cost nothing per invitation — the
storage is fixed no matter how many couples sign up. That is the main reason the
platform uses a shared template library rather than per-couple uploads.

If you later add per-couple footage, move it to blob storage rather than the
repo, and transcode on upload: an untranscoded phone video will have a long GOP
and scrub badly.
