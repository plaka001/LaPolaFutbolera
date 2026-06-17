// La Pola Futbolera — Edge Function: send-push
// Envía Web Push (VAPID) a las subscriptions de un usuario. Secrets:
// VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (y opcional VAPID_SUBJECT mailto:).
// Body: { user_id, title, body?, url? }. Borra subscriptions expiradas (404/410).
// ponytail: la llaman cron/triggers (recordatorios, resultados) en una fase próxima.
import webpush from 'npm:web-push';
import { createClient } from 'npm:@supabase/supabase-js@2';

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  try {
    const pub = Deno.env.get('VAPID_PUBLIC_KEY');
    const priv = Deno.env.get('VAPID_PRIVATE_KEY');
    const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:lapola@example.com';
    if (!pub || !priv) return json({ error: 'Faltan secrets VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY' }, 500);
    webpush.setVapidDetails(subject, pub, priv);

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { user_id, title, body, url } = await req.json().catch(() => ({}));
    if (!user_id || !title) return json({ error: 'Faltan user_id y title' }, 400);

    const { data: subs, error } = await supabase.from('push_subscriptions').select('*').eq('user_id', user_id);
    if (error) throw error;

    const payload = JSON.stringify({ notification: { title, body: body ?? '', data: { url: url ?? '/' } } });
    let sent = 0;
    let removed = 0;
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', s.id);
          removed++;
        }
      }
    }
    return json({ ok: true, sent, removed });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
