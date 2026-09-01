-- Sideline — Supabase schema (multi-team, with coach accounts)
-- Paste this whole file into the Supabase SQL editor (Project → SQL Editor →
-- New query) and hit Run. Safe to run more than once.
--
-- Trust model:
--   * Coaches sign in with a free email+password account (Supabase Auth).
--   * A crew code is the coach invite: any signed-in coach who types it in
--     becomes a member of that crew. Codes are 6 chars from a 29-character
--     alphabet (~590M combinations), so they are not guessable in practice.
--   * Only members can read or write a crew's plays, roster, and games —
--     other teams on the same app can never see them.
--   * Fans watch through a separate read-only watch code, served by the
--     sideline_watch() function below. It never grants write access.
--
-- Before or after running this, make sure Email auth is enabled under
-- Authentication → Providers. Under Authentication → Settings you can turn
-- "Confirm email" off if you want coaches to get in without a confirmation
-- email (recommended for game-day onboarding).

-- ---------- data tables (unchanged shape, now access-controlled) ----------

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

-- ---------- crews and membership ----------

create table if not exists public.sideline_crews (
  game_code  text primary key,
  watch_code text unique not null,
  owner      uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sideline_members (
  game_code  text not null references public.sideline_crews (game_code) on delete cascade,
  user_id    uuid not null,
  coach_name text,
  joined_at  timestamptz not null default now(),
  primary key (game_code, user_id)
);

-- Membership check used by every policy. SECURITY DEFINER so the policies
-- can consult the members table without recursing through its own RLS.
create or replace function public.sideline_is_member(code text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from sideline_members m
    where m.game_code = code and m.user_id = auth.uid()
  );
$$;

-- Join (or claim) a crew. Knowing the code is the invite; the first joiner
-- of a code that has no crew row yet becomes its owner (this is also how a
-- crew from before accounts existed gets claimed by its own coach).
create or replace function public.sideline_join(code text, name text default null)
returns json
language plpgsql security definer set search_path = public as $$
declare
  c text := upper(code);
  w text;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  if length(c) < 4 or length(c) > 6 or c !~ '^[A-Z0-9]+$' then
    raise exception 'That code does not look right.';
  end if;
  insert into sideline_crews (game_code, watch_code, owner)
    values (c, upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)), auth.uid())
    on conflict (game_code) do nothing;
  insert into sideline_members (game_code, user_id, coach_name)
    values (c, auth.uid(), name)
    on conflict (game_code, user_id)
    do update set coach_name = coalesce(excluded.coach_name, sideline_members.coach_name);
  select watch_code into w from sideline_crews where game_code = c;
  return json_build_object('game_code', c, 'watch_code', w);
end;
$$;
revoke execute on function public.sideline_join(text, text) from public, anon;
grant execute on function public.sideline_join(text, text) to authenticated;

-- Read-only gamecast feed for fans. Accepts the watch code, and also the
-- crew code so links shared before watch codes existed keep working (a fan
-- who knows the crew code could join as a coach anyway, so nothing new
-- leaks). Never returns anything writable.
create or replace function public.sideline_watch(code text)
returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'ops', coalesce((
      select json_agg(json_build_object('coach_name', o.coach_name, 'ops', o.ops))
      from sideline_ops o
      join sideline_crews c on c.game_code = o.game_code
      where c.watch_code = upper(code) or c.game_code = upper(code)
    ), '[]'::json),
    'squad', (
      select s.squad
      from sideline_squads s
      join sideline_crews c on c.game_code = s.game_code
      where c.watch_code = upper(code) or c.game_code = upper(code)
      limit 1
    )
  );
$$;
grant execute on function public.sideline_watch(text) to anon, authenticated;

-- ---------- row level security ----------

alter table public.sideline_ops     enable row level security;
alter table public.sideline_squads  enable row level security;
alter table public.sideline_games   enable row level security;
alter table public.sideline_crews   enable row level security;
alter table public.sideline_members enable row level security;

-- Drop the old open-to-anyone policies from the pre-accounts era.
drop policy if exists "sideline ops open"    on public.sideline_ops;
drop policy if exists "sideline squads open" on public.sideline_squads;
drop policy if exists "sideline games open"  on public.sideline_games;

drop policy if exists "sideline ops members"    on public.sideline_ops;
drop policy if exists "sideline squads members" on public.sideline_squads;
drop policy if exists "sideline games members"  on public.sideline_games;
drop policy if exists "sideline crews members"  on public.sideline_crews;
drop policy if exists "sideline crews owner"    on public.sideline_crews;
drop policy if exists "sideline members read"   on public.sideline_members;
drop policy if exists "sideline members leave"  on public.sideline_members;

-- Game data: members only, read and write.
create policy "sideline ops members" on public.sideline_ops
  for all to authenticated
  using (public.sideline_is_member(game_code))
  with check (public.sideline_is_member(game_code));

create policy "sideline squads members" on public.sideline_squads
  for all to authenticated
  using (public.sideline_is_member(game_code))
  with check (public.sideline_is_member(game_code));

create policy "sideline games members" on public.sideline_games
  for all to authenticated
  using (public.sideline_is_member(game_code))
  with check (public.sideline_is_member(game_code));

-- Crews: members can read their crew row (for the watch code); only the
-- owner can change it. Creation happens only through sideline_join().
create policy "sideline crews members" on public.sideline_crews
  for select to authenticated
  using (public.sideline_is_member(game_code) or owner = auth.uid());

create policy "sideline crews owner" on public.sideline_crews
  for update to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());

-- Members: visible to fellow members; you can remove yourself, and the
-- crew owner can remove anyone. Joining happens only through sideline_join().
create policy "sideline members read" on public.sideline_members
  for select to authenticated
  using (public.sideline_is_member(game_code));

create policy "sideline members leave" on public.sideline_members
  for delete to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from public.sideline_crews c
    where c.game_code = sideline_members.game_code and c.owner = auth.uid()
  ));

-- ---------- realtime ----------
-- Realtime respects RLS: signed-in members get change pings; fans rely on
-- the gamecast's polling.

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
