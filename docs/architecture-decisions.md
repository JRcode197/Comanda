# Decisioni architetturali — Step 1

## Stack e perimetro

Un solo applicativo Next.js 16.4.6 App Router, React 19.3.1, TypeScript 6.0.3, Tailwind 4.3.5, componenti Shadcn/UI (Button, Radix Slot, CVA, configurazione `components.json`), Supabase JS 2.119.0 e SSR 0.12.7. Versioni esatte e `package-lock.json`. PostgreSQL 17 tramite CLI Supabase 3.1.0. Le API Next installate sono state confrontate con le guide incluse nel pacchetto (`proxy`, cookies asincroni, Server Actions).

`PRD.md` in radice resta invariato; `docs/PRD.md` è una copia identica. Le aree P1 sono servite sotto `/{orgSlug}/admin/*`, con un renderer server condiviso. Nessuna route `/ops`, `/partner` o `/customer` pubblicata. Le tabelle P2/P3/P4 non sono create; nessuna dipendenza da outbox inesistente.

## Autorità transazionale e autorizzazione

Tutte le scritture utente passano dalla RPC `command(org, operation, payload, key)`, con operazioni esplicitamente enumerate. Le funzioni interne implementano prezzo, partecipanti, disponibilità, capienza e readiness. Ogni comando verifica l'identità, la membership attiva e il ruolo nel database; i metadati modificabili dall'utente non sono usati.

- RLS su tutte le tabelle esposte; nessun grant DML al ruolo `authenticated`.
- Prezzi, contatti privati, note, diete, ledger e audit separati. Staff/partner non ricevono le righe finanziarie; i portali partner sono differiti e le relative letture sono negate in P1.
- FK composite `(organization_id,id)` su tutti i riferimenti aziendali.
- `command_receipts` e `audit_events` in schema `private`, senza accesso diretto client. Hash SHA-256 del payload e dell'attore; stessa chiave con contenuto diverso è rifiutata.
- Audit append-only: nomi di campi ammessi, ID e operazione, senza valori sanitari. Le motivazioni di deroga staff sono note interne separate.
- Ogni comando acquisisce prima il lock della riga organizzazione. Serializza le mutazioni per tenant, incluso il cambio ruolo; evita deadlock tra servizi origine/destinazione e doppie approvazioni. È una scelta MVP conservativa: riduce throughput per singola azienda e richiede misurazione prima di un carico elevato. Nessun benchmark di scala è dichiarato.
- Capienza controllata dentro il lock; gli hold scaduti non contano. Prenotazioni private esclusive. Exclusion constraint GiST per intervalli staff/risorse `[)`, con buffer inclusi.
- Versione attesa per modifiche a prenotazioni, servizi, incarichi, membership, diete e partecipanti. Conflitti causano rollback dell'intero comando.
- Prezzi determinati da rate card per data locale, partner e categoria, salvati in righe e snapshot; interi in centesimi. Totali fiscali null se aliquota non nota. Rate sovrapposte rifiutate.
- Ledger append-only, storno unico, nessun provider di pagamento. Partecipanti raccolti non vengono eliminati da una riduzione generica dei pax.

### Perché SECURITY DEFINER

Serve per comandi atomici su tabelle con DML diretto revocato e per helper membership non ricorsivi. Owner dedicato `comanda_executor`, NOLOGIN, senza SUPERUSER/BYPASSRLS, proprietario delle sole tabelle Comanda. Eredita i privilegi di base di `authenticated` (USAGE di Auth), non `service_role`; legge soltanto ID/email di `auth.users` per gli inviti. `search_path=''`, riferimenti qualificati, EXECUTE revocato a PUBLIC/anon, soli entry point e helper RLS autorizzati. I helper interni non sono eseguibili dai client. Il ruolo non mantiene CREATE sugli schemi dopo la migrazione. L'app non possiede password o chiave per assumere questo ruolo.

## Auth e cache

Registrazione pubblica disabilitata. Invito Auth provisionato manualmente dall'amministratore; codice applicativo monouso, hash nel DB, scadenza 72 ore, email dell'identità verificata. Callback accetta PKCE e token hash invite/recovery; redirect solo a percorsi locali ammessi.

Client SSR per richiesta, `getClaims()` nel proxy per refresh, `getUser()` e membership corrente nelle letture/azioni server. Cookie di refresh propagati a richiesta e risposta. CSP con nonce, `private, no-store`, nessuna ISR per dati autenticati. Nessun service worker, storage persistente di dati sanitari o scritture offline. Refetch al focus/reconnect e ogni 60 secondi; **obiettivo PRD di aggiornamento entro 5 secondi non ancora misurato**. Realtime resta disabilitato in locale: non viene presentato come attivo.

## Hosting: Vercel e Cloudflare

**Vercel Hobby non è la destinazione scelta per l'uso aziendale.** Il PRD richiama la restrizione personale/non commerciale nelle condizioni Vercel e nelle [fair-use guidelines](https://vercel.com/docs/limits/fair-use-guidelines). In questa sessione il fetch diretto delle condizioni ha ricevuto 403 dal proxy e il motore documentale non ha restituito la clausola pertinente: la restrizione è conservata dal contratto PRD, non presentata come una nuova verifica legale riuscita. Per produzione Vercel occorre un piano che consenta l'uso commerciale, senza upgrade automatici.

Cloudflare Workers è un'alternativa tecnicamente plausibile:

| Aspetto | Evidenza raccolta |
|---|---|
| App Router, RSC, route handler, Server Actions | Supportati nella documentazione Cloudflare; `vinext@1.4.5 check` sul progetto: **19 supported, 0 partial, 0 issues** |
| `proxy.ts` di Next 16 | Riconosciuto dal checker. OpenNext documenta ancora limiti per Node.js middleware: non scegliere un adapter solo per analogia |
| Supabase Auth SSR | Test reale in `workerd`: login, cookie, getClaims, RLS, refresh, logout e no-store superati |
| SDK Supabase | API HTTP/fetch; nessun socket PostgreSQL o Hyperdrive necessario per l'app |
| Limiti Free | Documentazione consultata: 100.000 richieste/giorno, 10 ms CPU per invocazione. Non sono una garanzia di adeguatezza per SSR |
| Hosting dell'app intera | Nessun deploy, bundle Workers completo o benchmark CPU effettuato; compatibilità statica e prova Auth non equivalgono a certificazione del deployment |

La documentazione Cloudflare del 5 novembre 2026 raccomanda **vinext** per nuovi progetti; lo descrive ancora come beta e come reimplementazione delle API Next su Vite. Poiché il PRD richiede Next.js stabile, il progetto conserva `next build` come build primaria. Un eventuale passaggio a vinext deve essere revisionato e provato integralmente nel runtime Workers. Non sono stati creati `wrangler.json`, binding o risorse cloud.

Il runtime workerd installabile nel test supporta fino alla compatibility date **2026-08-06**, usata esplicitamente dalla prova: non è una prova delle semantiche successive. Nessuna promessa di costo zero o SLA. Prima di scegliere Workers Free misurare dimensione bundle, CPU SSR e traffico, e verificare condizioni e piano dell'account. Il piano a pagamento pubblicato parte da $5/mese; nessun acquisto effettuato.

Fonti consultate tramite strumenti documentali ufficiali:

- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/databases/third-party-integrations/supabase/
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs

Il fetch del changelog Supabase è stato tentato ma bloccato con 403. Le API SSR sono state verificate sulle guide recuperate tramite il connettore e sui pacchetti installati, poi esercitate con Auth locale.
