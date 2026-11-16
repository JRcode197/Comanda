# Piano di test — Step 1

## Comandi riproducibili

```sh
npm run db:reset
npm run db:types
npm run typecheck
npm run lint
npm test
npm run test:db
npm run test:workers
npm run build
npm run test:e2e
node scripts/supabase.mjs db advisors --type all --level warn --fail-on error
```

## Risultati della revisione locale

| Controllo | Risultato |
|---|---|
| Unit test | 9 passati: redirect consentiti e confini DST Europe/Rome |
| PostgreSQL/RLS | 17/17 passati |
| workerd + Supabase Auth SSR | Passato: login, cookie, identità verificata, RLS, refresh, logout, no-store |
| Typecheck, lint, build | Passati |
| E2E Chromium | 4/4 passati: percorso shared, privato, mobile/offline, staff senza prezzi |
| Advisor Supabase | Nessun problema a livello warn/error |
| vinext compatibility | 19 supportati, 0 parziali, 0 problemi |

Gli scenari DB includono tenant isolation, divieto di escalation, ultimo posto concorrente, booking privato esclusivo, hold scaduto, doppia assegnazione, risorsa sovrapposta, rollback di spostamento, sospensione membership, pagamenti idempotenti, version conflict, Auth REST/RLS, diete e inviti.

## Limiti della verifica

Non sono stati testati invii reali, email inbound, OTA, Realtime, backup remoto, restore, MFA, stress test con 200 servizi né una pubblicazione Vercel/Cloudflare. Restano fuori Step 1.
