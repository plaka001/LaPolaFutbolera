// Desarrollo. Mismos valores públicos que producción (proyecto Supabase único).
export const environment = {
  production: false,
  // Apunta a producción a propósito: un link de invitación debe funcionar para otros,
  // no a tu localhost.
  appUrl: 'https://la-pola-futbolera.vercel.app',
  supabaseUrl: 'https://seqcwsszqxmuzcordkgn.supabase.co',
  supabaseKey: 'sb_publishable_jSyW0l-AABUDQNfp6uy_8Q_FSPlgCvX',
  vapidPublicKey:
    'BA8BhWUVJUNlERipGLQ6MOHa14uyZMR0fCw4lZ1I7f4tGLXDA_H89LbJlsAqragpp_Po5PjH9pbtBO2uRYsx1G8',
};
