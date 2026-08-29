# Sideline

A game-day tracker for little league football. Roster, lineups, substitutions, play counts, and stats — built to be used with one thumb while standing on a sideline.

Static site. No build step required to deploy, no server required to run.

---

## Put it on GitHub Pages

1. Create a repo (`sideline`) and push these files to `main`.
2. Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Wait a minute, then open `https://<you>.github.io/sideline/`.

That's it. Everything works immediately in single-coach mode — roster, lineups, plays, subs, stats, CSV export — all saved in the browser on that phone.

### Or put it on Vercel

Import the repo at [vercel.com/new](https://vercel.com/new) and deploy — the included `vercel.json` skips the
build step and serves the repo as-is, so no settings are needed. Framework preset **Other** if it asks.

### Install it as an app

Open the page on your phone and use **Add to Home Screen** (Safari share menu, or Chrome's ⋮ menu). It gets an icon, opens without browser chrome, and works with no signal — the service worker caches the whole app on first visit. Handy at fields with bad reception.

---

## Turn on multiple coaches

Sharing a live game across phones needs a database. Supabase's free tier is plenty.

**1. Create the tables.** In your Supabase project, open the SQL editor and run:

```sql
create table public.sideline_ops (
  game_code   text        not null,
  coach_id    text        not null,
  coach_name  text,
  ops         jsonb       not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (game_code, coach_id)
);

create table public.sideline_squads (
  game_code  text primary key,
  squad      jsonb  not null,
  rev        bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.sideline_ops    enable row level security;
alter table public.sideline_squads enable row level security;

-- Anyone who knows a game code can read and write that game.
-- The four-letter code is the only thing protecting it, so keep games
-- to jersey numbers and first names.
create table public.sideline_games (
  id         text primary key,
  game_code  text not null,
  game       jsonb not null,
  ended_at   timestamptz not null default now()
);
create index sideline_games_code on public.sideline_games (game_code);

alter table public.sideline_games enable row level security;

create policy "open ops"    on public.sideline_ops    for all using (true) with check (true);
create policy "open squads" on public.sideline_squads for all using (true) with check (true);
create policy "open games"  on public.sideline_games  for all using (true) with check (true);

-- Let the app receive live updates.
alter publication supabase_realtime add table public.sideline_ops;
alter publication supabase_realtime add table public.sideline_squads;
```

**2. Point the app at it.** Edit `config.js`:

```js
window.SIDELINE_CONFIG = {
  supabaseUrl: "https://abcdefgh.supabase.co",
  supabaseAnonKey: "eyJhbGci..."
};
```

The anon key is meant to be public — it only grants what your policies above allow. Commit it.

**3. Use it.** Tap the strip at the top of the app → **Create a code**. Send the other coaches the page link and the four letters. Everyone who types it in shares one roster, one score, one play log, updating live.

### If you want it locked down properly

The policies above are deliberately wide open, which is fine for a rec league season and not fine for anything else. To tighten it, add a `games` table with a secret you check against, or move the write path behind an edge function. The client code only ever touches those two tables, so swapping the policy is the whole change.

---

## Season and career stats

Tapping **Start a new game** on the Stats tab doesn't throw the game away — it archives the final score,
opponent, and every player's stat line to the **Season** tab first, then clears the board. The Season tab
shows the record, per-player totals (with games played), and the game list; if archives span multiple years,
year chips appear so you can view one season or a whole career.

This works with no database at all — archives live in the browser alongside everything else. Two things to know:

- **Back it up.** Browser storage dies with the phone (or a cleared browser). The Season tab's **Back up**
  button downloads every game as one JSON file; **Restore** merges a backup in without overwriting, which
  also moves a season to a new phone or combines years.
- **With a crew + Supabase**, archives are shared: whoever ends the game writes it to the `sideline_games`
  table, every coach on the code sees the same season, and the history survives phone changes. A game
  archived while offline uploads on reconnect.

## Housekeeping

A `cron` job or a scheduled function to clear old games keeps the tables small:

```sql
delete from public.sideline_ops    where updated_at < now() - interval '90 days';
delete from public.sideline_squads where updated_at < now() - interval '90 days';
```

Leave `sideline_games` out of the purge — that table *is* the season history, and it stays tiny
(a whole season is well under a megabyte).

---

## Working on the code

`app.js` is generated from `src/app.jsx`. It's committed so the repo deploys with no build step, but if you edit the source you need to rebuild:

```bash
npm install
npm run build     # or: npm run watch
```

Then run the tests:

```bash
node test/smoke.js   # boots the real app in jsdom and plays through a series
node test/merge.js   # checks two coaches' event streams merge correctly
```

Bump `CACHE` in `sw.js` when you ship a change, or phones with the app installed will keep serving the old version from cache.

---

## How the state works

Nothing stores "the current game." Every action — a play, a sub, a score correction, a down change — is an immutable event with a timestamp and the id of the coach who made it. The current field, score, and stat lines are computed by replaying all events in time order.

This is what makes multiple coaches work without a server refereeing them. Each coach writes only their own event list, and every phone merges all lists and replays. Two coaches acting at the same moment can't overwrite each other, and a phone that was offline uploads its events later and they slot into the right place in the timeline. Undo is an event too — it revokes an earlier one by id, so undoing syncs like everything else.

Two consequences worth knowing:

- **Roster and lineup edits are not events.** They're a single shared document with last-write-wins. If two coaches edit the roster within a few seconds of each other, one edit loses. Build the roster before kickoff and this never comes up.
- **Clocks matter.** Ordering uses each phone's system clock. Phones set to the network time are fine; a phone that's badly wrong will sequence its plays oddly.

## Files

```
index.html      shell and all styling
config.js       Supabase credentials (optional)
app.js          built application — do not edit by hand
src/app.jsx     the source
vendor/         React and Supabase, served locally so it works offline
sw.js           service worker, caches the app shell
manifest.json   makes it installable
icons/          app icons
test/           jsdom smoke test and merge test
```
