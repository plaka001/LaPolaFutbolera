-- La Pola Futbolera — recordatorio de pronósticos pendientes.
-- Una noti `reminder` por (usuario, polla, jornada) cuando esa jornada cierra pronto
-- (<3h) y al jugador le falta pronosticar al menos un partido. El trigger
-- notifications_push (0012) dispara el push. Dedupe: máx 1 aviso por jornada/24h.
create or replace function notify_pending_predictions()
returns void language plpgsql security definer set search_path = public as $$
begin
  with pending as (
    select distinct pm.user_id, p.id as polla_id, p.name as polla_name, mt.round
    from matches mt
    join pollas p on p.competition_id = mt.competition_id and p.status = 'active'
    join polla_members pm on pm.polla_id = p.id and (pm.paid or p.prize_type = 'sin')
    where mt.status = 'scheduled'
      and mt.locks_at between now() and now() + interval '3 hours'
      and not exists (
        select 1 from predictions pr
        where pr.polla_id = p.id and pr.user_id = pm.user_id and pr.match_id = mt.id
      )
  )
  insert into notifications (user_id, type, title, body, data)
  select pd.user_id, 'reminder',
         '⏰ ¡Te faltan pronósticos!',
         'La ' || pd.round || ' de "' || pd.polla_name || '" cierra pronto y no jugaste todos.',
         jsonb_build_object('polla_id', pd.polla_id, 'round', pd.round)
  from pending pd
  where not exists (
    select 1 from notifications n
    where n.user_id = pd.user_id and n.type = 'reminder'
      and n.data->>'polla_id' = pd.polla_id::text
      and n.data->>'round' = pd.round
      and n.created_at > now() - interval '24 hours'
  );
end;
$$;

revoke execute on function public.notify_pending_predictions() from public, anon, authenticated;

-- Cron: cada hora. Ventana 3h + dedupe 24h ⇒ un aviso ~3h antes del cierre.
do $$ begin perform cron.unschedule('remind-pending-predictions'); exception when others then null; end $$;
select cron.schedule('remind-pending-predictions', '0 * * * *', $job$ select notify_pending_predictions(); $job$);
