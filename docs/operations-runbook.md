# Runbook operativo — Step 1

## Avvio locale

```sh
npm ci
npm run db:start
node scripts/local-env.mjs
npm run db:reset
npm run db:types
npm run dev
```

Il seed è esclusivamente sintetico. Account back-office: `owner.a@example.test`, password `Comanda-Test-Only-2026!`. Non importare dati, dump o credenziali reali nel repository.

## Inviti

1. Un owner/admin crea l’utente in Supabase Auth e avvia il relativo invito nella dashboard Supabase.
2. In **Accessi e audit**, prepara il codice Comanda per la stessa email.
3. L’utente apre il link Auth, imposta la password e inserisce il codice nella pagina `/invite`.

Il codice è hashato, dura 72 ore, è legato all’email autenticata e si usa una sola volta. Step 1 non invia email da Comanda: la comunicazione è manuale.

## Operatività

- Una richiesta diventa opzione per 15 minuti o prenotazione confermata solo tramite i comandi server/database.
- Per una conferma normale occorre staff accettato. Una deroga richiede motivo e resta nota interna auditabile.
- L’assegnazione staff riserva l’intervallo, inclusi eventuali buffer; conflitti e indisponibilità sono rifiutati.
- Le esigenze dichiarate richiedono una verifica. Chef/guide assegnati vedono tali dati solo dalla finestra operativa consentita; la modifica revoca ogni precedente presa visione.
- Gli incassi/rimborsi sono registrazioni manuali append-only. Nessun pagamento, rimborso o email automatica è effettuato dal prodotto.

## Incidenti e controlli

- Se una membership è sospesa, l’accesso viene revocato dal database anche con una sessione già emessa. Riattivare solo dopo verifica dell’owner.
- In caso di conflitto di versione, aggiornare la scheda e ripetere la decisione: non forzare richieste HTTP o SQL diretti.
- Eseguire `npm run db:reset` prima delle suite complete locali; i test modificano il database locale.
- Consultare l’audit da **Accessi e audit**. L’audit registra operazioni e campi, non contenuti sanitari.

## Prima di ambiente reale

Servono un progetto Supabase separato, redirect Auth consentiti, email/dominio, policy privacy e retention approvate, backup/restore testati e un piano hosting compatibile con uso commerciale. Le preview non vanno collegate indiscriminatamente ai dati di produzione.
