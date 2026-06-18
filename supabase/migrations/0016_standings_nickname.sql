-- La Pola Futbolera — fix: el apodo no salía en la Tabla.
-- El apodo se edita en Perfil → profiles.nickname, pero polla_standings devolvía
-- polla_members.nickname (apodo por-polla, sin UI, siempre null). Ahora prioriza el
-- apodo por-polla si existe y cae al del perfil (coalesce). Mismo tipo de retorno.
create or replace function polla_standings(p_polla uuid)
returns table (
  user_id uuid, display_name text, nickname text, avatar_url text,
  points bigint, exacts bigint, results bigint, played bigint, movement int
) language sql security definer stable set search_path = public as $$
  with s as (
    select m.user_id, pr.display_name, coalesce(m.nickname, pr.nickname) as nickname, pr.avatar_url,
           coalesce(sum(p.points), 0) as points,
           count(*) filter (where p.points is not null and p.home_pred = mt.home_score and p.away_pred = mt.away_score) as exacts,
           count(*) filter (where p.points is not null and sign(p.home_pred - p.away_pred) = sign(mt.home_score - mt.away_score)) as results,
           count(p.id) filter (where p.points is not null) as played
    from polla_members m
    join profiles pr on pr.id = m.user_id
    left join predictions p on p.polla_id = m.polla_id and p.user_id = m.user_id
    left join matches mt on mt.id = p.match_id
    where m.polla_id = p_polla and is_polla_member(p_polla)
    group by m.user_id, pr.display_name, m.nickname, pr.nickname, pr.avatar_url
  ), ranked as (
    select s.*, row_number() over (order by points desc, exacts desc, results desc) as pos from s
  )
  select r.user_id, r.display_name, r.nickname, r.avatar_url, r.points, r.exacts, r.results, r.played,
         coalesce(rs.prev_position - r.pos::int, 0) as movement
  from ranked r
  left join round_standings rs on rs.polla_id = p_polla and rs.round = '__overall__' and rs.user_id = r.user_id
  order by r.pos;
$$;
