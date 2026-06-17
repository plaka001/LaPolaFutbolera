-- La Pola Futbolera — Fase 3: liquidación automática + tabla de posiciones.

-- 1) Al pasar un partido a 'finished', recalcular puntos (settle_match ya existe).
--    A nivel DB → no hace falta cron para liquidar. ponytail: cron de SYNC (traer
--    resultados) queda para ops; acá solo el disparo de puntos.
create or replace function on_match_finished()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'finished' and new.home_score is not null then
    perform settle_match(new.id);
  end if;
  return new;
end;
$$;

create trigger matches_settle_on_finish
  after insert or update of status, home_score, away_score on matches
  for each row when (new.status = 'finished')
  execute function on_match_finished();

-- liquidar los que ya están finalizados (one-shot)
do $$ declare r record; begin
  for r in select id from matches where status = 'finished' and home_score is not null loop
    perform settle_match(r.id);
  end loop;
end $$;

-- 2) Tabla de posiciones de una polla (incluye miembros con 0 pts).
--    Desempate: puntos > exactos > aciertos de resultado. ponytail: head-to-head
--    y flechas de movimiento (round_standings) quedan para cuando haya rondas
--    cerrando en producción.
create or replace function polla_standings(p_polla uuid)
returns table (
  user_id uuid, display_name text, nickname text, avatar_url text,
  points bigint, exacts bigint, results bigint, played bigint
) language sql security definer stable set search_path = public as $$
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
  order by points desc, exacts desc, results desc;
$$;

revoke execute on function polla_standings(uuid) from public, anon;
grant  execute on function polla_standings(uuid) to authenticated;
