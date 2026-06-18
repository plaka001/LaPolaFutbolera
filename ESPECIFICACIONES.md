# 🏆 La Pola Futbolera — Especificaciones del proyecto

> PWA para crear y jugar pollas (pronósticos de fútbol) entre amigos. El objetivo: hacer lo que Golpredictor hace feo, pero hermoso, rápido, móvil y con pique.

**Estado:** Fase 0 cerrada — 2026-06-16. Próxima: Fase 1 (crear/unirse a pollas).
**Stack:** Angular 21 (standalone + signals, zoneless) + Tailwind + Supabase + PWA
**Repo local:** `D:\Git\pollas`
**Supabase:** cuenta nueva (creada por límite de proyectos free en la cuenta vieja). Proyecto `project_ref = seqcwsszqxmuzcordkgn`, conectado por MCP (hosted, OAuth) en `.mcp.json`.
**Público:** Colombia (mayoría Android).

---

## 1. Visión y alcance

Una persona crea una **polla** para una competición (Mundial, Liga BetPlay, Champions…), **invita** amigos por link, todos **pronostican** los marcadores, y al **terminar cada partido se asignan los puntos automáticamente**. Tabla de posiciones con pique.

### MVP (lo que sí entra)
- Pollas **privadas, solo por invitación** (link / WhatsApp).
- El **admin** (creador) controla todo.
- **Pozo de premios:** el admin marca quién pagó y sube un **QR** (Nequi/Daviplata). Quien no paga **no juega** y se le notifica.
- Pronósticos de marcador con **cierre 10 min antes** del partido.
- **Puntaje automático** al cerrar cada partido.
- **Tabla de posiciones** con movimientos (subió/bajó).
- **Notificaciones push** (PWA).

### Fuera del MVP (futuro)
- Pollas públicas / ligas abiertas.
- Varias competiciones en una misma polla.
- Preguntas bonus (campeón, goleador).
- Monetización (premium, branding).

---

## 2. Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | Angular (standalone + signals), Tailwind CSS |
| PWA | @angular/pwa (service worker), Web Push (VAPID) |
| Backend | Supabase: Postgres, Auth, Storage, Realtime, Edge Functions |
| Auth | Supabase Auth (Google + email) |
| Datos de fútbol | API-Football (api-sports.io) |
| Cliente Supabase | `@supabase/supabase-js` |
| Hosting front | A definir (Vercel / Netlify / Cloudflare Pages) |

---

## 3. Identidad visual y mockups

- Estilo: limpio, **móvil-first**, futbolero. Tarjetas, mucho aire, **verde cancha** como acento, soporta claro/oscuro.
- Acentos por estado: **verde** (abierto / acierto), **ámbar** (cierra pronto / oro / pozo), **rojo** (en vivo), **gris** (bloqueado / neutral).
- Banderas/escudos **reales desde la API** (en los mockups se usan códigos tipo `COL`/`BRA` porque no cargan imágenes externas).
- **Mockups de referencia** en `mockups/` → `partidos.html`, `tabla-posiciones.html`, `crear-polla.html`. Construir los componentes Angular replicando esos diseños (son la fuente visual de verdad).
- La identidad puede volverse más agresiva (dark + neón tipo app de FIFA) en el pulido (Fase 7).

---

## 4. Pantallas y navegación

**Nav inferior (4):** Partidos · Tabla · Pozo · Perfil.

| Pantalla | Fase | Mockup |
|----------|------|--------|
| Login / Onboarding (Google + email) | 0 | — |
| Home / Mis pollas (listado) | 1 | — |
| Crear polla (admin) | 1 | ✅ crear-polla.html |
| Unirse por link (preview + join) | 1 | — |
| Partidos por fecha (pronosticar) | 2 | ✅ partidos.html |
| Tabla de posiciones | 3 | ✅ tabla-posiciones.html |
| Pozo / pagos (admin marca pagos, QR, estado) | 4 | — |
| Perfil (apodo, foto, mis stats, push) | 0/6 | — |
| Salón de la fama / duelos | 6 | — |

---

## 5. Flujos clave

- **Crear polla:** login → "Crear polla" → elegir competición → tipo de premio/pozo → subir QR → genera `invite_code` → compartir link (WhatsApp).
- **Unirse:** abrir link → login/registro → `join_polla(code)` → si hay pozo, ver QR y pagar → el admin marca `paid` → habilitado para pronosticar.
- **Pronosticar:** Partidos → editar marcador (autosave) → se bloquea a los `locks_at` (10 min antes).
- **Liquidación:** partido pasa a `finished` → `sync-results` actualiza marcador → `settle_match` calcula puntos → tabla se mueve (Realtime) → notificaciones.
- **Pagos:** el admin entra a Pozo, marca quién pagó; los no pagadores quedan bloqueados y reciben notificación.

---

## 6. Modelo de datos

Esquema completo y listo en `supabase/migrations/0001_initial_schema.sql`.

**Enums**
- `prize_type`: `pozo` · `fijo` · `sin`
- `prize_distribution`: `winner` · `top3`
- `polla_status`: `draft` · `active` · `finished`
- `member_role`: `admin` · `player`
- `match_status`: `scheduled` · `live` · `finished` · `postponed`

**profiles** (extiende `auth.users`, se crea con trigger al registrarse)
`id` uuid PK → auth.users · `display_name` · `nickname` (apodo) · `avatar_url` · `created_at`

**competitions** (caché de la API)
`id` uuid PK · `api_league_id` int · `name` · `country` · `logo_url` · `season`

**matches** (caché de partidos; se comparten entre pollas de la misma competición)
`id` uuid PK · `api_fixture_id` int unique · `competition_id` → competitions · `round` · `is_knockout` bool · `home_team` · `away_team` · `home_logo` · `away_logo` · `kickoff_at` · `status` · `home_score` · `away_score` (90'+reposición) · `home_score_live` · `away_score_live` · `elapsed` · `locks_at` (generada: kickoff − 10 min) · `updated_at`

**pollas**
`id` uuid PK · `name` · `created_by` → profiles · `competition_id` → competitions · `prize_type` · `entry_fee` numeric · `prize_distribution` · `fixed_prize` · `payment_qr_url` · `payment_deadline` · `scoring_rules` jsonb · `joker_enabled` bool · `invite_code` unique · `status` · `created_at`

**polla_members** (participantes)
`id` uuid PK · `polla_id` → pollas · `user_id` → profiles · `role` · `paid` bool · `paid_at` · `paid_amount` · `nickname` · `joined_at` · unique(polla_id, user_id)

**predictions** (pronósticos)
`id` uuid PK · `polla_id` · `match_id` · `user_id` · `home_pred` int · `away_pred` int · `is_joker` bool · `points` int (se calcula al cerrar) · unique(polla_id, match_id, user_id)

**round_standings** (snapshot por fecha → movimientos subió/bajó)
`id` · `polla_id` · `round` · `user_id` · `position` int · `points` int · `captured_at`

**push_subscriptions** · `id` · `user_id` · `endpoint` · `p256dh` · `auth`
**notifications** · `id` · `user_id` · `type` · `title` · `body` · `data` jsonb · `read`

---

## 7. Seguridad (RLS)

RLS activado en todas las tablas. Helpers `is_polla_member(polla_id)` y `is_polla_admin(polla_id)` (SECURITY DEFINER) para evitar recursión.

- **profiles:** lectura a autenticados; update solo el dueño.
- **competitions / matches:** lectura a autenticados; escritura solo service role (Edge Functions).
- **pollas:** leen miembros + creador; crea cualquier autenticado; actualiza/borra solo el admin. Unirse por link vía RPC `join_polla(code)`.
- **polla_members:** leen miembros de la misma polla; el usuario se inserta a sí mismo al unirse; el admin actualiza (marca pagos).
- **predictions:** el usuario gestiona los suyos (solo si pagó y el partido no cerró); ve los ajenos **solo tras el cierre** del partido (anti-copia).
- **push_subscriptions / notifications:** solo el dueño.

Funciones de BD listas: `join_polla(code)`, `score_prediction(...)`, `settle_match(match_id)`.

---

## 8. Reglas de negocio

- **Cierre:** no se crea ni edita pronóstico después de `locks_at` (kickoff − 10 min).
- **Pagó para jugar:** si `prize_type ≠ 'sin'`, solo miembros con `paid = true` pueden pronosticar.
- **Anti-copia:** los pronósticos ajenos se ven recién cuando el partido cierra.
- **Comodín:** máximo **1 partido** con `is_joker = true` por jugador, por fecha (`round`), por polla (se valida en la app/RPC).
- **Eliminatorias:** `is_knockout = true` → puntaje doble (rama `knockout`).
- **Solo 90' + reposición** (de la API: tiempo reglamentario, sin alargues ni penales).
- **Desempate en la tabla** (default, configurable): 1) más puntos, 2) más marcadores exactos, 3) más aciertos de resultado, 4) head-to-head.
- **Admin:** solo `created_by` gestiona la polla y los pagos.

---

## 9. Sistema de puntaje

Configurable por polla (`scoring_rules` jsonb). Preset **clásico** (estilo Golpredictor):

| Acierto | Primera ronda | Eliminatorias |
|--------|---------------|---------------|
| Resultado (1X2) | 5 | 10 |
| Goles del local | 2 | 4 |
| Goles del visitante | 2 | 4 |
| Diferencia de goles | 1 | 2 |
| **Máximo** | **10** | **20** |

Los puntos **se acumulan**. Comodín x2 multiplica el total del partido por `joker_multiplier`. El cálculo corre en `settle_match` al pasar el partido a `finished`.

```json
{
  "result": {"group": 5, "knockout": 10},
  "home_goals": {"group": 2, "knockout": 4},
  "away_goals": {"group": 2, "knockout": 4},
  "goal_diff": {"group": 1, "knockout": 2},
  "joker_multiplier": 2
}
```

---

## 10. Backend: API-Football, Edge Functions, Storage y Realtime

**API-Football**
- Plan free (100 req/día) para empezar; pago barato (~USD 15-20/mes) para live minuto a minuto.
- **El backend consulta, nunca el cliente.** Los usuarios leen de la BD → el costo de API no depende de cuántos jueguen.

**Edge Functions (+ cron con pg_cron / scheduled functions)**
- `import-fixtures(competition)` — trae partidos de la competición → `matches`.
- `sync-results` (cron) — resultados de partidos finalizados → actualiza `matches` y dispara `settle_match`.
- `sync-live` (cron solo en ventanas de partido) — `fixtures?live=all` (1 request = todos los vivos) → marcadores en vivo + puntos provisionales.
- `send-push` — envía Web Push a `push_subscriptions` según `notifications`.

**Storage**
- Bucket `qr` para las imágenes de QR de pago. Sube el admin; leen los miembros. La URL queda en `pollas.payment_qr_url`. (Avatares: bucket `avatars`.)

**Realtime**
- Habilitar en `predictions` (puntos en vivo), `matches` (marcadores live) y la tabla de posiciones, para que el pique se vea moverse en tiempo real.

---

## 11. PWA y notificaciones

- Installable. Android: ícono en pantalla, push con app cerrada (vía FCM, sin Play Store). iOS: desde 16.4 con "agregar a inicio".
- Web Push (VAPID) con `push_subscriptions`.
- Tipos: recordatorio de cierre, "te pasaron / te alcanzaron", resultado y puntos ganados, "pagá para jugar", ganaste la fecha.

---

## 12. Gamificación (el pique 🌶️)

- **Comodín x2** por fecha.
- **Salón de la fama:** campeón de cada fecha y de la polla.
- **Duelos head-to-head:** "le vas ganando a Andrés por 2 pts".
- **Notificaciones pura sal:** "⚠️ Yeison te pasó, vas 3°".
- **Rachas e insignias:** profeta (marcadores exactos), racha de fechas, etc.
- **Apodos y foto de perfil.**

---

## 13. Estructura del proyecto Angular

```
src/
  app/
    core/         supabase.service · auth.service · guards · models · interceptors
    features/
      auth/       login · callback
      pollas/     mis-pollas · crear-polla · unirse
      partidos/   lista-fecha · prediccion
      tabla/      posiciones
      pozo/       pagos (admin)
      perfil/
    shared/       match-card · team-badge · score-stepper · pill · bottom-nav · avatar
  environments/   environment.ts · environment.development.ts
  styles.css      (Tailwind)
```
- Componentes standalone + signals. Acceso a datos por `supabase.service` (auth, db, realtime, storage).

---

## 14. Variables de entorno

| Variable | Dónde | Notas |
|----------|-------|-------|
| `SUPABASE_URL` | front (environment) | pública |
| `SUPABASE_ANON_KEY` (publishable) | front (environment) | pública |
| `API_FOOTBALL_KEY` | **Supabase secrets** | NUNCA en el front |
| `VAPID_PUBLIC_KEY` | front | pública |
| `VAPID_PRIVATE_KEY` | **Supabase secrets** | privada |
| `SERVICE_ROLE_KEY` | **Supabase secrets** | solo Edge Functions |

⚠️ Claves sensibles → Supabase secrets / `.env` gitignoreado, nunca commiteadas.

---

## 15. Roadmap por fases

### Fase 0 — Cimientos ✅ (cerrada)
- [x] Esquema de BD escrito (`supabase/migrations/0001_initial_schema.sql`)
- [x] Supabase nuevo conectado por MCP (`seqcwsszqxmuzcordkgn`)
- [x] Aplicar el esquema a la nube (9 tablas + RLS + funciones; advisors de seguridad endurecidos en `0002_security_hardening.sql`)
- [x] Carpeta + Angular 21 (standalone + signals + zoneless) + Tailwind v3 + PWA (@angular/pwa)
- [x] Auth (Google + magic link por email) + carga de perfil (lo crea el trigger `handle_new_user`)
- [x] Layout base + nav inferior (Partidos/Tabla/Pozo/Perfil) + tema futbolero (tokens de los mockups, claro/oscuro)

**Fase 0 cerrada (2026-06-16).** Build de producción OK, dev server verificado y **login con Google funcionando**.

### Fase 1 — Crear y unirse a pollas ✅ (implementada; a falta de prueba funcional + OK)
- [x] Home "Mis pollas" (listado con escudo/jugadores/pozo/admin, estados vacío/carga, unirse por código)
- [x] Pantalla Crear polla → BD (competición desde `competitions`, premio pozo/fijo/sin + reparto, comodín) + link de invitación + WhatsApp
- [x] `invite_code` + unirse por link (RPC `join_polla` + preview `polla_preview`)
- [x] Estructura nueva: home top-level + shell **por-polla** `/polla/:id` (Partidos/Tabla/Pozo)
- Backend: `0003_fase1_seed_and_preview.sql` (4 competiciones con IDs reales de API-Football + `polla_preview`).
- Diseño: identidad **"estadio de noche"** (dark protagonista), tipografía Space Grotesk, motion/a11y según skills de diseño.

### Fase 2 — Partidos y pronósticos ✅
- [x] `import-fixtures` (Edge Function) — **football-data.org v4** (token en secret, prueba varios nombres). Probada: **104 partidos reales del Mundial 2026** (84 abiertos). ⚠️ FD free cubre Mundial + Champions + ligas top europeas; **no** Liga BetPlay ni Libertadores (para eso, API-Football Pro). Mapea escudos, 90'+reposición y eliminatorias.
- [x] Pantalla Partidos con **filtro por día de calendario** (carga todos, muestra los del día elegido) + polla activa (`PollaContextService`)
- [x] Guardar pronósticos (autosave con debounce) + cierre 10 min antes (RLS) + comodín 1 por fecha
- [x] Ocultar pronósticos ajenos hasta el cierre (lo hace la RLS; falta la vista para *ver* los ajenos)
- Componentes shared nuevos: `team-badge`, `score-stepper`, `match-card`. Estados: abierto / cierra-pronto / en vivo / finalizado / bloqueado.
- Estructura: el nav es global, así que la polla que abrís queda "activa" y Partidos/Tabla operan sobre ella.

### Fase 3 — Resultados y puntaje ✅ (tabla lista; movimiento diferido)
- [x] Puntaje automático: trigger `matches_settle_on_finish` → `settle_match` al finalizar (sin cron). `0006`.
- [x] Tabla de posiciones: RPC `polla_standings` (desempate puntos > exactos > aciertos) + pantalla con medallas top-3 y resalte "Vos".
- [x] `sync-results` por **cron** (`0008`): pg_cron + pg_net, cada 15 min llama a `import-fixtures` → actualiza `matches` → el trigger liquida puntos. Probado: HTTP 200, importó 104 (Mundial) + 189 (Champions).
- [ ] Flechas de movimiento (snapshots `round_standings`) — diferido a cuando haya rondas cerrando.

### Fase 4 — Pozo y pagos ✅
- [x] Subir QR — Storage bucket `qr` público (`0007`); admin sube/reemplaza, URL en `pollas.payment_qr_url` (cache-bust `?v=`).
- [x] Admin marca pagos (RLS `members admin update`) + estado del pozo (recaudado vs total, barra, pagaron/pendientes).
- [x] Bloqueo a no pagadores: ya lo hace la RLS de `predictions` (paid o `prize_type='sin'`). Notificación push → Fase 5.
- [x] **Cierre + reparto del pozo** (`0018` `close_polla`): el admin cierra la polla (`status='finished'`) y se notifica a los ganadores con push (winner=100% al 1°; top3=60/30/10; fijo=premio al 1°). El Pozo muestra el reparto (proyección mientras está activa, "Ganadores/Final" al cerrar). Monto **informativo** (no mueve plata real).
- Pantalla Pozo (`/pozo`): ramas pozo / fijo / sin; QR; tu estado; reparto del pozo; lista de jugadores con toggle de pago.

### Fase 5 — PWA y push ✅ (infra lista; se activa al desplegar)
- [x] Service worker + installable — ya desde Fase 0 (manifest + ngsw + íconos).
- [x] Web Push: claves **VAPID** generadas (pública en `environment`, privada → secret), suscripción vía `SwPush` + toggle en Perfil, tabla `push_subscriptions`, Edge Function **`send-push`** (web-push; probada que importa/corre en Deno).
- [x] Disparar las notis: **resultado** (`0012`), **te pasaron** (`0013`) y **recordatorio de pronósticos pendientes** (`0017`: cron horario `notify_pending_predictions` → noti `reminder` por jornada que cierra en <3h, dedupe 24h, reusa el trigger `notifications_push`). Las tres disparan push.
- ⚠️ El SW está **desactivado en `ng serve`** → push solo funciona en build/deploy **HTTPS**. Falta: setear secrets `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` y **desplegar** (hosting §17).

### Fase 6 — Gamificación ✅
- [x] **Apodos** editables en Perfil → se reflejan en tabla/pozo (`profiles.nickname`).
- [x] **Notis de resultado**: al cerrar partido `settle_match` crea noti in-app + dispara push (`0012`). Campana con badge en el home + pantalla `/notificaciones`.
- [x] **"Te pasaron"**: al recalcular tras un resultado, quien baja de posición recibe noti (snapshot en `round_standings` + `refresh_standings_snapshot`). `0013`. Probado.
- [x] **Salón de la fama, rachas y duelos** (`/stats`, link 🏆 desde Tabla): records (líder, francotirador, racha, comodín), ranking de rachas (aciertos consecutivos) y duelo 1-a-1 head-to-head. Todo client-side desde el historial puntuado (`predictions` con `points not null`; la RLS solo revela ajenos tras el cierre).
- [x] **Foto de perfil** (`0015`): `handle_new_user` copia la foto de Google (+ backfill) y bucket `avatars` (cada uno escribe su `{uid}.ext`) para subir la propia desde Perfil. Componente `<app-avatar>` (foto → fallback iniciales) en tabla/pozo/stats/pronósticos/perfil.

### Fase 7 — Live y pulido (parcial)
- [x] **Realtime**: tabla y partidos se actualizan en vivo (publication en `matches`/`predictions` + subscriptions con debounce). `0011`.
- [x] Rediseño "neón de estadio" (degradé, glow, redondeado, nav flotante, tipografía Archivo + Plus Jakarta Sans).
- [x] **Puntos provisionales en vivo**: durante el partido el MatchCard muestra cuántos pts llevarías con el marcador actual.
- [x] **Flechas de movimiento** en la tabla (`0014`). + **Banderas/escudos reales** (`<app-team-badge>` con el `crest` de football-data.org, sin fondo, fallback a código). + **Pantalla "ver pronósticos"** de un partido (`/partido/:id`) y **modal de puntajes** en Partidos.
- [ ] Más pulido/animaciones; subsetting de íconos Tabler.

---

## 16. Decisiones cerradas

- **Nombre de la app: La Pola Futbolera** (definido 2026-06-16; cada pool de pronósticos se sigue llamando "una polla").
- Angular sobre React (fluidez + consistencia; lo visual lo da Tailwind/diseño).
- Privado, solo por invitación (por ahora).
- Admin controla todo; marca pagos; sube QR.
- No pagador no juega (bloqueo antes del 1er partido) + notificación.
- Premio: pozo entre todos / fijo / sin; reparto default todo al 1° (configurable a top 3).
- No se mueve plata real en la app (solo se registra).
- Puntaje clásico configurable + comodín x2.
- Mockups validados y guardados en `mockups/` (referencia visual fiel para el front).

---

## 17. Pendientes / por decidir

**Auth — hecho en el panel de Supabase:**
- ✅ Google OAuth configurado y **login probado/andando**. Site URL + Redirect URLs (`…/auth/callback`) cargadas. Magic link por email activo.

**Pendientes técnicos / por decidir:**
- Subsetting de íconos Tabler para bajar el CSS inicial (~217 kB) — optimización de Fase 7.
- Hosting del front (Vercel / Netlify / Cloudflare Pages).
- Plan de API-Football (free vs pago) según necesidad de live.
- Generar par de claves VAPID para push.
- Mapear `is_knockout` desde las rondas que devuelve la API.
- Competiciones iniciales a soportar (Mundial / Liga BetPlay / …).
- Confirmar reglas de desempate de la tabla.
