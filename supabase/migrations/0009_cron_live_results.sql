-- La Pola Futbolera — cron de resultados "casi en vivo".
-- Reemplaza el cron fijo de 15 min (0008) por uno cada 1 min que SOLO llama a la API
-- mientras hay un partido en curso (desde el kickoff y hasta ~4h después, sin finalizar).
-- Así la tabla se actualiza ~1 min después de que FD tenga el resultado, sin quemar quota
-- el resto del tiempo. Más un baseline cada 6h por si se escapa algo / cambios de calendario.
-- (FD free trae datos con retraso propio: "instantáneo al pitazo" requiere plan pago.)
select cron.unschedule(jobid) from cron.job where jobname = 'refresh-fixtures';

select cron.schedule('refresh-live', '* * * * *', $job$
  select net.http_post(
    url := 'https://seqcwsszqxmuzcordkgn.supabase.co/functions/v1/import-fixtures',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcWN3c3N6cXhtdXpjb3Jka2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1ODY0NzYsImV4cCI6MjA5NzE2MjQ3Nn0.UoF8ELewryaUrpIHlxXAchoffirEhTi0zHTVzWi49WE'),
    body := '{}'::jsonb
  )
  where exists (
    select 1 from public.matches m
    where m.status <> 'finished'
      and m.kickoff_at <= now()
      and m.kickoff_at > now() - interval '240 minutes'
  );
$job$);

select cron.schedule('refresh-daily', '0 */6 * * *', $job$
  select net.http_post(
    url := 'https://seqcwsszqxmuzcordkgn.supabase.co/functions/v1/import-fixtures',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcWN3c3N6cXhtdXpjb3Jka2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1ODY0NzYsImV4cCI6MjA5NzE2MjQ3Nn0.UoF8ELewryaUrpIHlxXAchoffirEhTi0zHTVzWi49WE'),
    body := '{}'::jsonb
  );
$job$);
