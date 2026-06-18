-- La Pola Futbolera — cron de resultados por FASE del partido.
-- No se puede pre-calcular: los puntos se liquidan cuando el partido pasa a 'finished'
-- (trigger matches_settle_on_finish). Lo que afinamos es CADA CUÁNTO consultamos la API:
--  - 0–85 min post-kickoff (juego temprano): cada ~5 min (marcador en vivo, sin urgencia).
--  - 85–240 min (recta final + reposición + alargues): cada 1 min (cazar el final apenas pasa).
-- Un partido normal termina ~105-115 min post-kickoff, así que la recta final lo cubre.
select cron.unschedule(jobid) from cron.job where jobname = 'refresh-live';

select cron.schedule('refresh-live', '* * * * *', $job$
  select net.http_post(
    url := 'https://seqcwsszqxmuzcordkgn.supabase.co/functions/v1/import-fixtures',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcWN3c3N6cXhtdXpjb3Jka2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1ODY0NzYsImV4cCI6MjA5NzE2MjQ3Nn0.UoF8ELewryaUrpIHlxXAchoffirEhTi0zHTVzWi49WE'),
    body := '{}'::jsonb
  )
  where exists (
    select 1 from public.matches m
    where m.status <> 'finished' and m.kickoff_at <= now()
      and (
        (m.kickoff_at <= now() - interval '85 minutes' and m.kickoff_at > now() - interval '240 minutes')
        or (m.kickoff_at > now() - interval '85 minutes' and (extract(minute from now())::int % 5) = 0)
      )
  );
$job$);
