-- La Pola Futbolera — recordatorio preciso + noti de nuevo líder.
-- 1) notify_pending_predictions: ventana estrecha (avisa cuando el cierre es en ≤15 min,
--    o sea ~15-25 min antes del pitazo, mientras todavía se puede pronosticar) + cron cada 5 min.
-- 2) refresh_standings_snapshot: además de "te pasaron", notifica a TODOS cuando hay
--    NUEVO líder (el 1° cambió de persona).

create or replace function notify_pending_predictions()
returns void language plpgsql security definer set search_path = public as $$
begin
  with pending as (
    select distinct pm.user_id, p.id as polla_id, p.name as polla_name, mt.round
    from matches mt
    join pollas p on p.competition_id = mt.competition_id and p.status = 'active'
    join polla_members pm on pm.polla_id = p.id and (pm.paid or p.prize_type = 'sin')
    where mt.status = 'scheduled'
      and mt.locks_at between now() and now() + interval '15 minutes'
      and not exists (
        select 1 from predictions pr
        where pr.polla_id = p.id and pr.user_id = pm.user_id and pr.match_id = mt.id
      )
  )
  insert into notifications (user_id, type, title, body, data)
  select pd.user_id, 'reminder',
         '⏰ ¡Última llamada!',
         'La ' || pd.round || ' de "' || pd.polla_name || '" está por cerrar y te faltan pronósticos.',
         jsonb_build_object('polla_id', pd.polla_id, 'round', pd.round)
  from pending pd
  where not exists (
    select 1 from notifications n
    where n.user_id = pd.user_id and n.type = 'reminder'
      and n.data->>'polla_id' = pd.polla_id::text
      and n.data->>'round' = pd.round
      and n.created_at > now() - interval '12 hours'
  );
end;
$$;
revoke execute on function public.notify_pending_predictions() from public, anon, authenticated;

-- Cron cada 5 min (la ventana de 15 min garantiza que lo agarre antes del cierre).
do $$ begin perform cron.unschedule('remind-pending-predictions'); exception when others then null; end $$;
select cron.schedule('remind-pending-predictions', '*/5 * * * *', $job$ select notify_pending_predictions(); $job$);

-- ---- nuevo líder ----
create or replace function refresh_standings_snapshot(p_polla uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select name into v_name from pollas where id = p_polla;

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

  -- te pasaron (bajaste de posición)
  insert into notifications (user_id, type, title, body, data)
  select n.user_id, 'overtaken', '⚠️ Te pasaron',
         'Bajaste al ' || n.pos || '° en la tabla', jsonb_build_object('polla_id', p_polla, 'position', n.pos)
  from _new n
  join round_standings o on o.polla_id = p_polla and o.round = '__overall__' and o.user_id = n.user_id
  where n.pos > o.position;

  -- nuevo líder: el 1° cambió de persona (y antes ya había un líder) → avisar a todos
  insert into notifications (user_id, type, title, body, data)
  select m.user_id, 'leader',
         case when m.user_id = nl.user_id then '👑 ¡Sos el nuevo líder!' else '👑 Nuevo líder' end,
         case when m.user_id = nl.user_id then 'Tomaste la punta de "' || v_name || '". ¡A aguantarla!'
              else coalesce(pr.nickname, pr.display_name, 'Alguien') || ' tomó la punta de "' || v_name || '"' end,
         jsonb_build_object('polla_id', p_polla, 'leader_id', nl.user_id)
  from polla_members m
  cross join (select user_id from _new where pos = 1) nl
  join profiles pr on pr.id = nl.user_id
  where m.polla_id = p_polla
    and exists (select 1 from round_standings o where o.polla_id = p_polla and o.round = '__overall__' and o.position = 1)
    and nl.user_id is distinct from (
      select o.user_id from round_standings o where o.polla_id = p_polla and o.round = '__overall__' and o.position = 1
    );

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
