-- =====================================================================
-- La Pola Futbolera — Esquema inicial (Postgres / Supabase)
-- Aplicar con: supabase db push  (o apply_migration por MCP)
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type prize_type as enum ('pozo','fijo','sin');
create type prize_distribution as enum ('winner','top3');
create type polla_status as enum ('draft','active','finished');
create type member_role as enum ('admin','player');
create type match_status as enum ('scheduled','live','finished','postponed');

-- ---------- profiles (extiende auth.users) ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  nickname text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',
                           new.raw_user_meta_data->>'name',
                           split_part(new.email,'@',1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- competitions (caché API-Football) ----------
create table competitions (
  id uuid primary key default gen_random_uuid(),
  api_league_id int not null,
  name text not null,
  country text,
  logo_url text,
  season int not null,
  created_at timestamptz not null default now(),
  unique (api_league_id, season)
);

-- ---------- matches (caché de partidos) ----------
create table matches (
  id uuid primary key default gen_random_uuid(),
  api_fixture_id int unique,
  competition_id uuid references competitions(id) on delete cascade,
  round text,
  is_knockout boolean not null default false,
  home_team text not null,
  away_team text not null,
  home_logo text,
  away_logo text,
  kickoff_at timestamptz not null,
  locks_at timestamptz,
  status match_status not null default 'scheduled',
  home_score int,
  away_score int,
  home_score_live int,
  away_score_live int,
  elapsed int,
  updated_at timestamptz not null default now()
);
create index on matches (competition_id, kickoff_at);

-- locks_at = kickoff − 10 min. Se setea por trigger porque `timestamptz - interval`
-- no es IMMUTABLE (depende del timezone de sesión) y no sirve para columna generada.
create or replace function set_match_locks_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.locks_at := new.kickoff_at - interval '10 minutes';
  return new;
end;
$$;

create trigger matches_set_locks_at
  before insert or update of kickoff_at on matches
  for each row execute function set_match_locks_at();

-- ---------- pollas ----------
create table pollas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references profiles(id) on delete cascade,
  competition_id uuid references competitions(id),
  prize_type prize_type not null default 'pozo',
  entry_fee numeric(12,2) default 0,
  prize_distribution prize_distribution not null default 'winner',
  fixed_prize text,
  payment_qr_url text,
  payment_deadline timestamptz,
  scoring_rules jsonb not null default '{"result":{"group":5,"knockout":10},"home_goals":{"group":2,"knockout":4},"away_goals":{"group":2,"knockout":4},"goal_diff":{"group":1,"knockout":2},"joker_multiplier":2}'::jsonb,
  joker_enabled boolean not null default true,
  invite_code text not null unique default encode(gen_random_bytes(5),'hex'),
  status polla_status not null default 'active',
  created_at timestamptz not null default now()
);

-- ---------- polla_members (participantes) ----------
create table polla_members (
  id uuid primary key default gen_random_uuid(),
  polla_id uuid not null references pollas(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role member_role not null default 'player',
  paid boolean not null default false,
  paid_at timestamptz,
  paid_amount numeric(12,2),
  nickname text,
  joined_at timestamptz not null default now(),
  unique (polla_id, user_id)
);
create index on polla_members (user_id);

-- ---------- predictions (pronósticos) ----------
create table predictions (
  id uuid primary key default gen_random_uuid(),
  polla_id uuid not null references pollas(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  home_pred int not null check (home_pred between 0 and 30),
  away_pred int not null check (away_pred between 0 and 30),
  is_joker boolean not null default false,
  points int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (polla_id, match_id, user_id)
);
create index on predictions (match_id);
create index on predictions (polla_id, user_id);

-- ---------- round_standings (snapshot por fecha -> movimientos) ----------
create table round_standings (
  id uuid primary key default gen_random_uuid(),
  polla_id uuid not null references pollas(id) on delete cascade,
  round text not null,
  user_id uuid not null references profiles(id) on delete cascade,
  position int not null,
  points int not null,
  captured_at timestamptz not null default now()
);

-- ---------- push_subscriptions ----------
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- ---------- notifications ----------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, read);

-- ---------- Helpers (SECURITY DEFINER, evitan recursión en RLS) ----------
create or replace function is_polla_member(p_polla uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from polla_members m where m.polla_id = p_polla and m.user_id = auth.uid());
$$;

create or replace function is_polla_admin(p_polla uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from pollas p where p.id = p_polla and p.created_by = auth.uid());
$$;

-- ---------- RPC: unirse a una polla por código de invitación ----------
create or replace function join_polla(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_polla uuid;
begin
  select id into v_polla from pollas where invite_code = p_code;
  if v_polla is null then raise exception 'Código de invitación inválido'; end if;
  insert into polla_members (polla_id, user_id, role)
  values (v_polla, auth.uid(), 'player')
  on conflict (polla_id, user_id) do nothing;
  return v_polla;
end;
$$;

-- ---------- Puntaje de un pronóstico ----------
create or replace function score_prediction(
  p_home_pred int, p_away_pred int,
  p_home int, p_away int,
  p_rules jsonb, p_knockout boolean, p_is_joker boolean
) returns int language plpgsql immutable as $$
declare
  k text := case when p_knockout then 'knockout' else 'group' end;
  pts int := 0;
begin
  if p_home is null or p_away is null then return null; end if;
  -- resultado (ganador o empate)
  if sign(p_home_pred - p_away_pred) = sign(p_home - p_away) then
    pts := pts + (p_rules->'result'->>k)::int;
  end if;
  -- goles del local
  if p_home_pred = p_home then pts := pts + (p_rules->'home_goals'->>k)::int; end if;
  -- goles del visitante
  if p_away_pred = p_away then pts := pts + (p_rules->'away_goals'->>k)::int; end if;
  -- diferencia de goles
  if (p_home_pred - p_away_pred) = (p_home - p_away) then
    pts := pts + (p_rules->'goal_diff'->>k)::int;
  end if;
  -- comodín
  if p_is_joker then pts := pts * coalesce((p_rules->>'joker_multiplier')::int, 1); end if;
  return pts;
end;
$$;

-- ---------- Liquidar un partido (recalcular puntos de todos los pronósticos) ----------
create or replace function settle_match(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m record;
begin
  select * into m from matches where id = p_match;
  if m.status <> 'finished' or m.home_score is null then return; end if;
  update predictions pr
  set points = score_prediction(pr.home_pred, pr.away_pred, m.home_score, m.away_score,
        po.scoring_rules, m.is_knockout, pr.is_joker),
      updated_at = now()
  from pollas po
  where pr.match_id = p_match and pr.polla_id = po.id;
end;
$$;

-- =====================================================================
-- RLS
-- =====================================================================
alter table profiles enable row level security;
alter table competitions enable row level security;
alter table matches enable row level security;
alter table pollas enable row level security;
alter table polla_members enable row level security;
alter table predictions enable row level security;
alter table round_standings enable row level security;
alter table push_subscriptions enable row level security;
alter table notifications enable row level security;

-- profiles
create policy "profiles read" on profiles for select to authenticated using (true);
create policy "profiles update own" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- competitions / matches (lectura; escritura solo service role)
create policy "competitions read" on competitions for select to authenticated using (true);
create policy "matches read" on matches for select to authenticated using (true);

-- pollas
create policy "pollas read" on pollas for select to authenticated
  using (created_by = auth.uid() or is_polla_member(id));
create policy "pollas insert" on pollas for insert to authenticated
  with check (created_by = auth.uid());
create policy "pollas update admin" on pollas for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "pollas delete admin" on pollas for delete to authenticated
  using (created_by = auth.uid());

-- polla_members
create policy "members read" on polla_members for select to authenticated
  using (is_polla_member(polla_id));
create policy "members self join" on polla_members for insert to authenticated
  with check (user_id = auth.uid());
create policy "members admin update" on polla_members for update to authenticated
  using (is_polla_admin(polla_id)) with check (is_polla_admin(polla_id));
create policy "members self or admin delete" on polla_members for delete to authenticated
  using (user_id = auth.uid() or is_polla_admin(polla_id));

-- predictions (anti-copia: los ajenos solo se ven tras el cierre)
create policy "predictions read" on predictions for select to authenticated
  using (
    user_id = auth.uid()
    or (is_polla_member(polla_id) and exists (
          select 1 from matches mt where mt.id = match_id and mt.locks_at <= now()))
  );
create policy "predictions insert own" on predictions for insert to authenticated
  with check (
    user_id = auth.uid()
    and is_polla_member(polla_id)
    and exists (select 1 from matches mt where mt.id = match_id and mt.locks_at > now())
    and exists (select 1 from polla_members m
                where m.polla_id = predictions.polla_id and m.user_id = auth.uid()
                  and (m.paid or (select prize_type from pollas where id = predictions.polla_id) = 'sin'))
  );
create policy "predictions update own before lock" on predictions for update to authenticated
  using (user_id = auth.uid()
         and exists (select 1 from matches mt where mt.id = match_id and mt.locks_at > now()))
  with check (user_id = auth.uid());

-- round_standings
create policy "standings read" on round_standings for select to authenticated
  using (is_polla_member(polla_id));

-- push_subscriptions
create policy "push own" on push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notifications
create policy "notifications read own" on notifications for select to authenticated
  using (user_id = auth.uid());
create policy "notifications update own" on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
