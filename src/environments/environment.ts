// Producción. Solo valores públicos (ver ESPECIFICACIONES §14).
// Claves sensibles (API-Football, VAPID private, service role) van en Supabase secrets.
export const environment = {
  production: true,
  supabaseUrl: 'https://seqcwsszqxmuzcordkgn.supabase.co',
  supabaseKey: 'sb_publishable_jSyW0l-AABUDQNfp6uy_8Q_FSPlgCvX',
  // VAPID public key (pública; la privada va en secret de Supabase).
  vapidPublicKey:
    'BA8BhWUVJUNlERipGLQ6MOHa14uyZMR0fCw4lZ1I7f4tGLXDA_H89LbJlsAqragpp_Po5PjH9pbtBO2uRYsx1G8',
};
