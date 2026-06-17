-- La Pola Futbolera — Fase 1: competiciones iniciales + preview de polla por código.
-- Competitions las escribe solo el service role; sembramos las 4 iniciales con IDs
-- reales de API-Football para que el picker de "Crear polla" sea real y Fase 2
-- (import-fixtures) las pueda usar directo.

insert into competitions (api_league_id, name, country, logo_url, season) values
  (1,   'Copa Mundial 2026',        'Mundo',      'https://media.api-sports.io/football/leagues/1.png',   2026),
  (239, 'Liga BetPlay (Primera A)', 'Colombia',   'https://media.api-sports.io/football/leagues/239.png', 2026),
  (2,   'UEFA Champions League',    'Europa',     'https://media.api-sports.io/football/leagues/2.png',   2025),
  (13,  'Copa Libertadores',        'Sudamérica', 'https://media.api-sports.io/football/leagues/13.png',  2026)
on conflict (api_league_id, season) do nothing;

-- Preview de una polla por invite_code para la pantalla "Unirse": antes de ser
-- miembro, la RLS de `pollas` no deja verla. SECURITY DEFINER + solo authenticated.
create or replace function polla_preview(p_code text)
returns table (
  id uuid,
  name text,
  prize_type prize_type,
  entry_fee numeric,
  competition_name text,
  competition_logo text,
  members_count bigint,
  admin_name text
) language sql security definer stable set search_path = public as $$
  select p.id, p.name, p.prize_type, p.entry_fee,
         c.name, c.logo_url,
         (select count(*) from polla_members m where m.polla_id = p.id),
         pr.display_name
  from pollas p
  left join competitions c on c.id = p.competition_id
  left join profiles pr on pr.id = p.created_by
  where p.invite_code = p_code;
$$;

revoke execute on function polla_preview(text) from public, anon;
grant  execute on function polla_preview(text) to authenticated;
