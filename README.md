# Comanda

Back-office per esperienze gastronomiche. Next.js App Router, TypeScript, Tailwind, componenti Shadcn/UI e Supabase PostgreSQL/Auth. Interfaccia italiana; dati e autorizzazioni per organizzazione.

## Avvio locale

Prerequisiti: Node.js 24, npm, Docker. Il database deve essere locale e vuoto: il seed contiene esclusivamente dati sintetici.

```sh
npm ci
npm run db:start
node scripts/local-env.mjs
npm run db:reset
npm run db:types
npm run dev
```

Apri http://localhost:3000. Account sintetico back-office: `owner.a@example.test`, password `Comanda-Test-Only-2026!`. Le altre identità di test sono documentate nella guida operativa. Queste credenziali non devono essere abilitate in produzione.

Il wrapper CLI mantiene cache e stato in `work/`, usa Docker Hub per le immagini e non richiede alcun progetto remoto. Non contiene credenziali di account cloud. `.env.local` e `.env.test` sono esclusi da Git. Non occorre service role nell'applicazione.

## Verifica

```sh
npm run db:reset
npm run typecheck
npm run lint
npm test
npm run test:db
npm run test:workers
npm run build
npx playwright install chromium
npm run test:e2e
node scripts/supabase.mjs db advisors --type all --level warn --fail-on error
```

I test DB modificano il seed locale; ripartire da `db:reset` prima di ripetere la suite. Gli E2E usano la build di produzione. Per usare Chromium di sistema: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`.

## Documentazione

- [PRD](docs/PRD.md): contratto originale (copia invariata del file in radice).
- [Decisioni architetturali e hosting](docs/architecture-decisions.md).
- [Guida operativa](docs/operations-runbook.md).
- [Piano test e risultati](docs/test-plan.md).
- [Note per la revisione](docs/review.md).

Nessun invio applicativo, AI, connettore OTA, portale esterno o addebito reale viene attivato. I movimenti sono registrazioni manuali. Nessun deployment o upgrade di piano eseguito. Vercel Hobby non è una destinazione commerciale approvata per questo CRM.
