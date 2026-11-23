-- Son Sefer: Supabase Postgres schema, indexes, RLS policies, and cleanup RPCs
-- Run via Supabase SQL Editor or `supabase db push`

create extension if not exists pgcrypto;

-- 1. Rooms (shared authoritative game state snapshot)
create table if not exists public.game_rooms (
  code text primary key,
  phase text not null default 'LOBBY',
  settings jsonb not null default '{"maxPlayers": 8, "turnSeconds": 60, "voiceEnabled": false}'::jsonb,
  state_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '4 hours')
);

create index if not exists idx_game_rooms_expires_at on public.game_rooms (expires_at);
create index if not exists idx_game_rooms_phase on public.game_rooms (phase);

-- 2. Ephemeral Match Players (no email, no account, match-scoped only)
create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.game_rooms(code) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 24),
  avatar text not null,
  color_index int not null default 0,
  seat_index int not null,
  is_host boolean not null default false,
  is_ready boolean not null default false,
  session_token_hash text not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_room_players_room_code on public.room_players (room_code);

-- 3. Server-Only Secret Roles (strictly blocked from anon client reads)
create table if not exists public.secret_roles (
  room_code text not null references public.game_rooms(code) on delete cascade,
  player_id uuid not null references public.room_players(id) on delete cascade,
  role text not null check (role in ('MURETTEBAT', 'KACAK')),
  primary key (room_code, player_id)
);

-- 4. Server-Only Secret Votes & Mission Card Plays
create table if not exists public.secret_actions (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.game_rooms(code) on delete cascade,
  round_num int not null,
  attempt_num int not null default 1,
  action_type text not null check (action_type in ('TEAM_VOTE', 'MISSION_CARD')),
  player_id uuid not null references public.room_players(id) on delete cascade,
  action_value text not null,
  created_at timestamptz not null default now(),
  unique (room_code, round_num, attempt_num, action_type, player_id)
);

create index if not exists idx_secret_actions_lookup
  on public.secret_actions (room_code, round_num, action_type);

-- 5. Ephemeral Match Chat (auto-purged on game end / TTL)
create table if not exists public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.game_rooms(code) on delete cascade,
  channel text not null check (channel in ('PUBLIC', 'KACAK')),
  sender_id uuid not null references public.room_players(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 240),
  created_at timestamptz not null default now()
);

create index if not exists idx_room_messages_room_created
  on public.room_messages (room_code, created_at desc);

-- 6. Ephemeral Match Abuse Reports (match-scoped IDs only, no PII)
create table if not exists public.room_reports (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references public.game_rooms(code) on delete cascade,
  target_player_id uuid not null,
  reporter_player_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 200),
  created_at timestamptz not null default now()
);

-- Enable Row-Level Security on all tables
alter table public.game_rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.secret_roles enable row level security;
alter table public.secret_actions enable row level security;
alter table public.room_messages enable row level security;
alter table public.room_reports enable row level security;

-- Deny direct anon access to all secret tables; mutations & reads go through server API with Service Role
drop policy if exists "deny_anon_game_rooms" on public.game_rooms;
create policy "deny_anon_game_rooms" on public.game_rooms for all to anon using (false);

drop policy if exists "deny_anon_room_players" on public.room_players;
create policy "deny_anon_room_players" on public.room_players for all to anon using (false);

drop policy if exists "deny_anon_secret_roles" on public.secret_roles;
create policy "deny_anon_secret_roles" on public.secret_roles for all to anon using (false);

drop policy if exists "deny_anon_secret_actions" on public.secret_actions;
create policy "deny_anon_secret_actions" on public.secret_actions for all to anon using (false);

drop policy if exists "deny_anon_room_messages" on public.room_messages;
create policy "deny_anon_room_messages" on public.room_messages for all to anon using (false);

drop policy if exists "deny_anon_room_reports" on public.room_reports;
create policy "deny_anon_room_reports" on public.room_reports for all to anon using (false);

-- Cleanup RPC for expired rooms & post-match chat minimization
create or replace function public.cleanup_expired_rooms()
returns integer
language plpgsql
security definer
as $$
declare
  deleted_count integer;
begin
  delete from public.game_rooms
  where expires_at < now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
