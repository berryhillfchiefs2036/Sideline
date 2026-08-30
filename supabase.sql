-- Sideline — Supabase schema
-- Paste this whole file into the Supabase SQL editor (Project → SQL Editor →
-- New query) and hit Run. Safe to run more than once.
--
-- The app talks to three tables with the public anon key:
--   sideline_ops    — each coach's play-by-play, one row per coach per crew code
--   sideline_squads — roster / lineups / play minimum / schedule, one row per crew code
--   sideline_games  — archived season games
-- Trust model: anyone with the site link and a 4-letter crew code can read and
-- write that crew's game, so the policies below are open to the anon key on
-- purpose. Keep rosters to jersey numbers and first names.

create table if not exists public.sideline_ops (
  game_code  text not null,
  coach_id   text not null,
  coach_name text,
  ops        jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (game_code, coach_id)
);

create table if not exists public.sideline_squads (
  game_code text primary key,
  squad     jsonb not null,
  rev       bigint not null default 0
);

create table if not exists public.sideline_games (
  id        text primary key,
  game_code text not null,
  game      jsonb not null,
  ended_at  timestamptz
);
create index if not exists sideline_games_code on public.sideline_games (game_code);

-- Row level security: enabled, with open policies for the anon key (see note above).
alter table public.sideline_ops    enable row level security;
alter table public.sideline_squads enable row level security;
alter table public.sideline_games  enable row level security;

drop policy if exists "sideline ops open"    on public.sideline_ops;
drop policy if exists "sideline squads open" on public.sideline_squads;
drop policy if exists "sideline games open"  on public.sideline_games;

create policy "sideline ops open"    on public.sideline_ops
  for all to anon, authenticated using (true) with check (true);
create policy "sideline squads open" on public.sideline_squads
  for all to anon, authenticated using (true) with check (true);
create policy "sideline games open"  on public.sideline_games
  for all to anon, authenticated using (true) with check (true);

-- Realtime: the app subscribes to changes on ops and squads so every phone
-- updates within a second or two (a 12s poll covers the gaps either way).
do $$
begin
  alter publication supabase_realtime add table public.sideline_ops;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.sideline_squads;
exception when duplicate_object then null;
end $$;
