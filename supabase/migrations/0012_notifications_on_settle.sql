-- La Pola Futbolera — notis al cerrar partido (resultado) + disparo de push.
-- settle_match ahora crea una noti de resultado por usuario (deduplicada por
-- usuario+partido, porque el cron re-liquida en cada poll). Un trigger en
-- notifications dispara send-push (async, no-op si no hay subs/VAPID).
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

  insert into notifications (user_id, type, title, body, data)
  select pr.user_id, 'result',
         m.home_team || ' ' || m.home_score || '–' || m.away_score || ' ' || m.away_team,
         case when coalesce(pr.points, 0) > 0 then 'Sumaste ' || pr.points || ' pts ⚽'
              else 'No sumaste esta vez 😬' end,
         jsonb_build_object('match_id', m.id, 'polla_id', pr.polla_id, 'points', coalesce(pr.points, 0))
  from predictions pr
  where pr.match_id = p_match
    and not exists (
      select 1 from notifications n
      where n.user_id = pr.user_id and n.type = 'result' and n.data->>'match_id' = m.id::text
    );
end;
$$;

create or replace function on_notification_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://seqcwsszqxmuzcordkgn.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcWN3c3N6cXhtdXpjb3Jka2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1ODY0NzYsImV4cCI6MjA5NzE2MjQ3Nn0.UoF8ELewryaUrpIHlxXAchoffirEhTi0zHTVzWi49WE'),
    body := jsonb_build_object('user_id', new.user_id, 'title', new.title, 'body', new.body, 'url', '/')
  );
  return new;
end;
$$;

drop trigger if exists notifications_push on notifications;
create trigger notifications_push after insert on notifications
  for each row execute function on_notification_created();
