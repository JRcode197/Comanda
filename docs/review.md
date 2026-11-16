# Note per la revisione — Step 1

## Ambito consegnato

MVP transazionale per back-office: Auth a invito, RLS multi-tenant, catalogo/sedi/risorse, staff e disponibilità, richieste, servizi, booking shared/privati, partecipanti/diete, registrazioni manuali di incasso e audit. Le rotte amministrative sono in `/{orgSlug}/admin/*`.

Le decisioni SQL, l’uso controllato di `SECURITY DEFINER`, la valutazione Vercel/Workers e le prove di compatibilità sono in [architecture-decisions.md](architecture-decisions.md).

## Punti da leggere nel diff

- `supabase/migrations/20261115154157_p1_transactional_mvp.sql`: schema, RLS, vincoli, RPC e seed di sicurezza.
- `src/features/workspace/`: UI e Server Actions, con autorizzazione ripetuta lato server e nel database.
- `tests/integration/database.mjs`: prove reali su Postgres locale.
- `tests/e2e/booking.spec.ts`: percorso utente su build di produzione.
- `tests/workers/auth.mjs`: Supabase SSR nel runtime workerd.

## Funzioni volutamente differite

Outbox/Resend, inbound email, AI, Realtime, portali staff/partner/cliente, lista spesa, report avanzati, connessioni OTA, pagamenti e fatturazione. Le UI dichiarano chiaramente la comunicazione manuale.
