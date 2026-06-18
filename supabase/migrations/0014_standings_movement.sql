-- La Pola Futbolera — flechas de movimiento en la tabla.
-- round_standings guarda prev_position PERSISTENTE: si la posición cambió, prev = la
-- vieja; si no cambió, se conserva el prev anterior (la flecha no se resetea en cada
-- poll del cron, solo cuando hay un cambio real). polla_standings devuelve `movement`
-- (prev − actual; positivo = subió).
alter table round_standings add column if not exists prev_position int;

create or replace function refresh_standings_snapshot(p_polla uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  drop table if exists _new;
  create temp table _new as
  select s.user_id, s.points,
         row_number() over (order by s.points desc, s.exacts desc, s.results desc) as pos
  from (
    select m.user_id,
           coalesce(sum(p.points), 0)::int as points,
           count(*) filter (where p.points is not null and p.home_pred = mt.home_score and p.away_pred = mt.away_score)::int as exacts,
           count(*) filter (where p.points is not null and sign(p.home_pred - p.away_pred) = sign(mt.home_score - mt.away_score))::int as results
    from polla_members m
    left join predictions p on p.polla_id = m.polla_id and p.user_id = m.user_id
    left join matches mt on mt.id = p.match_id
    where m.polla_id = p_polla
    group by m.user_id
  ) s;

  insert into notifications (user_id, type, title, body, data)
  select n.user_id, 'overtaken', '⚠️ Te pasaron',
         'Bajaste al ' || n.pos || '° en la tabla', jsonb_build_object('polla_id', p_polla, 'position', n.pos)
  from _new n
  join round_standings o on o.polla_id = p_polla and o.round = '__overall__' and o.user_id = n.user_id
  where n.pos > o.position;

  drop table if exists _merged;
  create temp table _merged as
  select n.user_id, n.pos as position, n.points,
         case when o.position is null then n.pos
              when n.pos <> o.position then o.position
              else coalesce(o.prev_position, o.position) end as prev_position
  from _new n
  left join round_standings o on o.polla_id = p_polla and o.round = '__overall__' and o.user_id = n.user_id;

  delete from round_standings where polla_id = p_polla and round = '__overall__';
  insert into round_standings (polla_id, round, user_id, position, points, prev_position)
  select p_polla, '__overall__', user_id, position, points, prev_position from _merged;

  drop table _new;
  drop table _merged;
end;
$$;

drop function if exists public.polla_standings(uuid);
create function polla_standings(p_polla uuid)
returns table (
  user_id uuid, display_name text, nickname text, avatar_url text,
  points bigint, exacts bigint, results bigint, played bigint, movement int
) language sql security definer stable set search_path = public as $$
  with s as (
    select m.user_id, pr.display_name, m.nickname, pr.avatar_url,
           coalesce(sum(p.points), 0) as points,
           count(*) filter (where p.points is not null and p.home_pred = mt.home_score and p.away_pred = mt.away_score) as exacts,
           count(*) filter (where p.points is not null and sign(p.home_pred - p.away_pred) = sign(mt.home_score - mt.away_score)) as results,
           count(p.id) filter (where p.points is not null) as played
    from polla_members m
    join profiles pr on pr.id = m.user_id
    left join predictions p on p.polla_id = m.polla_id and p.user_id = m.user_id
    left join matches mt on mt.id = p.match_id
    where m.polla_id = p_polla and is_polla_member(p_polla)
    group by m.user_id, pr.display_name, m.nickname, pr.avatar_url
  ), ranked as (
    select s.*, row_number() over (order by points desc, exacts desc, results desc) as pos from s
  )
  select r.user_id, r.display_name, r.nickname, r.avatar_url, r.points, r.exacts, r.results, r.played,
         coalesce(rs.prev_position - r.pos::int, 0) as movement
  from ranked r
  left join round_standings rs on rs.polla_id = p_polla and rs.round = '__overall__' and rs.user_id = r.user_id
  order by r.pos;
$$;

revoke execute on function public.polla_standings(uuid) from public, anon;
grant  execute on function public.polla_standings(uuid) to authenticated;
