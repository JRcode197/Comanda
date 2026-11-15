# Comanda — PRD e Architettura Tecnica

**Versione:** 1.0 · **Data:** 15 novembre 2026 · **Stato:** specifica per implementazione, nessun codice applicativo generato.

**Obiettivo:** CRM operativo per corsi di cucina, food tour, degustazioni e cene private. Un'unica fonte dei dati collega prenotazioni, capacità, personale, ospiti, esigenze alimentari, partner e comunicazioni.

**Destinazione:** repository GitHub pubblico `Comanda`, dichiarato già creato dall'utente. Questa analisi non modifica né verifica lo stato degli account o del repository. Stack vincolante: Next.js App Router, TypeScript, Tailwind, Shadcn/UI, Supabase PostgreSQL/Auth/Realtime/Edge Functions e Resend; hosting previsto Vercel.

**Come usare il documento:** salvarlo nel progetto come `docs/PRD.md`; eseguire uno alla volta i quattro prompt della sezione 5. Le sezioni 1–4 costituiscono il contratto comune. Le scelte indicate come differite non vanno implementate automaticamente.

**Assunzioni reversibili:** una sola azienda iniziale, più sedi, EUR, interfaccia italiana, fuso Europe/Rome configurabile, utenti invitati, nessun marketplace pubblico. Predisposizione multi-organizzazione a livello dati e autorizzazioni, senza costruire onboarding SaaS, abbonamenti o provisioning per tenant. Chef, guida e autista sono qualifiche operative; un utente può averne più di una.

**Vincolo economico da conoscere subito:** non è corretto promettere un CRM aziendale in produzione a costo zero su Vercel Hobby. Le condizioni ufficiali limitano Hobby all'uso personale/non commerciale [S2]. Anche un prototipo realizzato nell'ambito di un'attività commerciale va valutato rispetto a queste condizioni. L'architettura resta valida: prima di un deployment commerciale scegliere un piano Vercel compatibile, oppure riaprire il solo vincolo hosting. Nessun upgrade è autorizzato o eseguito da questo documento. Le integrazioni OTA, il modello AI, il dominio email e i pagamenti possono avere ulteriori costi o requisiti indipendenti dal traffico.

## 1. Analisi dei ruoli e permessi — RBAC e RLS su Supabase

### 1.1 Ruoli applicativi

L'identità è `auth.users`. L'accesso a un'organizzazione passa da `organization_memberships`; i ruoli sono assegnati alla membership, non a campi modificabili del profilo. Le qualifiche professionali sono separate dai poteri amministrativi.

| Ruolo | Dati leggibili | Azioni consentite | Limiti |
|---|---|---|---|
| Owner | Tutti i dati aziendali necessari, impostazioni e audit | Gestire amministratori, integrazioni, esportazioni, retention e trasferimento proprietà | Non eliminare l'ultimo owner; cancellazioni sensibili controllate |
| Admin | Operatività, clienti, partner, finanza e report | Configurare catalogo, sedi, utenti non-owner, tariffe; confermare e cancellare servizi | Nessuna lettura delle credenziali in chiaro; non può promuoversi a owner |
| Booking manager | Prenotazioni, richieste, agenda, contatti, tariffe e incassi operativi | Gestire richieste, assegnazioni, esigenze alimentari, comunicazioni e rettifiche | Nessuna gestione ruoli, segreti o cancellazione massiva |
| Staff / Chef | Propri incarichi e dettagli del relativo servizio; esigenze alimentari necessarie alla cucina | Dichiarare disponibilità, accettare/rifiutare incarichi, prendere visione delle revisioni, checklist | Niente prezzi, margini, CRM completo o prenotazioni di altri servizi |
| Staff / Guida | Propri tour, punto d'incontro, partecipanti minimi necessari, avvisi alimentari pertinenti al tour | Come staff; check-in e stato servizio se responsabile | Niente dettagli sanitari non pertinenti, costi o contatti marketing |
| Staff / Autista | Propri trasferimenti, orari, pickup, numero persone, contatto operativo e istruzioni logistiche | Accettazione e stato trasferimento | Nessun accesso ordinario alle allergie, alle note cucina o ai ricavi |
| Partner / Tour operator | Proprie richieste e prenotazioni, propri prezzi e saldo commerciale | Inviare richiesta, integrare ospiti, proporre modifica/cancellazione | Mai confermare capienza, vedere altri partner, tariffe interne o roster completo |
| Cliente finale | Propria prenotazione e dati delle persone per cui è autorizzato a operare | Integrare dettagli, proporre modifiche, leggere conferma | Portale opzionale fase 4; nessun accesso anonimo tramite semplice UUID |

Il ruolo `staff` riceve capability limitate dall'incarico: `kitchen`, `tour`, `transport`, `checkin`, `service_lead`. Non assegnare a tutti gli staff la stessa visibilità. Un utente con più ruoli aziendali eredita la somma dei permessi esplicitamente assegnati. Un partner che lavora con due aziende ha due membership distinte.

### 1.2 Principi RLS obbligatori

1. Ogni tabella aziendale contiene `organization_id`; RLS attiva su tutte le tabelle esposte, permessi SQL minimi e policy distinte per SELECT/INSERT/UPDATE/DELETE. Nessuna policy generica “utente autenticato = tutto consentito”.
2. `auth.uid()` identifica il chiamante; una membership **attiva nel database** autorizza l'organizzazione. Non fidarsi di `user_metadata`, di un `organization_id` del browser o di un semplice filtro frontend. Il controllo sul database rende efficace la revoca anche quando un JWT contiene informazioni vecchie.
3. Per UPDATE usare sia `USING` sia `WITH CHECK`; impedire cambio di tenant, proprietario, partner, ruolo e stato commerciale tramite aggiornamenti generici.
4. Le chiavi esterne tra dati aziendali includono `(organization_id, id)`; in questo modo una riga del tenant A non può puntare a un servizio del tenant B.
5. RLS filtra righe, **non colonne**. Separare costi, contatti privati, dati alimentari e informazioni operative in tabelle differenti. Non consentire SELECT su una riga ricca di dati riservati pensando che il frontend ne mostri soltanto alcuni.
6. Per viste usare `security_invoker`; un'eventuale funzione `SECURITY DEFINER` deve avere motivazione, owner dedicato con minimi privilegi, `search_path` fisso, controllo del chiamante, nomi qualificati e EXECUTE revocato a PUBLIC. Helper privati non ricorsivi evitano policy membership che interrogano se stesse.
7. Le modifiche con invarianti — conferma, trasferimento servizio, assegnazione, rimborso contabile, approvazione email — passano da RPC transazionali. Revocare il DML diretto sulle colonne protette. Le RPC privilegiate verificano ruolo e tenant internamente, non assumono che lo abbia fatto Next.js.
8. Chiavi segrete/service role solo in ambiente server o Vault; mai prefisso `NEXT_PUBLIC_`, log, repository o seed. Le normali letture e azioni utente usano il client Supabase con sessione dell'utente e RLS, non service role universale.
9. Realtime non è un'autorizzazione alternativa. Sottoscrizioni autorizzate e ristrette al contesto, con payload di invalidazione senza dati sensibili; il client rilegge i dati attraverso RLS. Su revoca ruolo si chiudono i canali e si svuota lo stato locale.
10. Sospensione membership interrompe accesso a pagine, RPC, export, Storage e Realtime. Non basta nascondere il menu. Autenticazione SSR con SDK ufficiale e verifica server della sessione; redirect di login limitati a destinazioni ammesse.

Questi requisiti applicano le indicazioni Supabase su RLS, viste e autorizzazione [S5]. MFA per owner/admin prima dell'utilizzo con dati reali; per operazioni critiche verificare il livello MFA, non solo l'avvenuto login.

### 1.3 Matrice delle policy per famiglia dati

| Famiglia | Lettura | Scrittura |
|---|---|---|
| Organizzazione, membership e ruoli | Membri vedono il proprio accesso; amministratori elenco aziendale | Owner gestisce admin/owner; admin gestisce ruoli inferiori via RPC |
| Catalogo e sedi | Back-office; staff per incarichi; partner solo catalogo vendibile | Owner/admin; manager su campi operativi autorizzati |
| Servizi e assegnazioni | Back-office; staff solo incarichi proposti/accettati; partner riceve proiezione disponibilità aggregata | Back-office via RPC; staff risponde soltanto al proprio incarico |
| Prenotazioni e partecipanti | Back-office; partner se `partner_id` associato alla propria membership; cliente se collegamento esplicito | Back-office; altri creano richieste di modifica o usano RPC a campi limitati |
| Contatti | Back-office e partner sui propri referenti | Scrittura limitata al contesto autorizzato; staff usa proiezione del contatto operativo |
| Diete e note cucina | Back-office autorizzato; chef/guida assegnati e con necessità operativa; soggetto autorizzato sui propri dati | Dati dichiarati da cliente/partner; validazione dal team; presa visione dello staff separata |
| Finanza e costi | Back-office; partner solo proprio conto commerciale | Back-office; registrazioni contabili append-only con storni |
| Messaggi | Thread interni al back-office; thread partner separati; notifica al solo destinatario | Autore autorizzato al thread; notifiche di sistema solo worker |
| Inbound, audit, outbox | Owner/admin e manager per coda operativa; payload tecnici ristretto | Integrazioni e funzioni controllate; nessuna modifica client di audit/outbox |

Lo staff legge dati identificativi/dietetici da 48 ore prima a 24 ore dopo il servizio, come default configurabile. Può accettare un incarico prima, vedendo soltanto logistica e mansione. Una riassegnazione rimuove subito l'accesso ai dati personali del servizio precedente. L'amministrazione mantiene lo storico secondo retention.

### 1.4 Privacy e sicurezza operative

Le informazioni sulle allergie possono essere dati relativi alla salute: prima dei dati reali vanno definite base giuridica ex art. 6 e condizione applicabile ex art. 9 GDPR, informativa, responsabilità del partner e tempi di conservazione. Una spunta generica non risolve da sola questi requisiti [S9]. Il software registra finalità, versione informativa ed eventuale consenso esplicito quando è la condizione scelta, senza confonderlo con consenso marketing.

Default progettuale, da validare dal titolare: dati dietetici cancellati o resi non identificabili 90 giorni dopo il servizio; email sorgenti 30 giorni; log tecnici 14 giorni; audit senza contenuti sanitari 12 mesi. Non sono termini legali prescritti. Documenti economici hanno regole di conservazione separate. Nessuna raccolta di date di nascita complete per distinguere adulto/bambino; minori gestiti tramite referente autorizzato.

Niente allergie nei subject email, notifiche push o log. Gli avvisi invitano ad aprire la scheda autenticata. Export sensibili soltanto per ruoli autorizzati, audit dell'accesso, download privato a breve scadenza. Il dato cancellato non deve restare in snapshot, messaggi duplicati, cache offline o vecchi payload AI. Backup cifrati e scadenza coerente con retention; audit registra la cancellazione, non il contenuto cancellato.

## 2. Moduli funzionali, flussi operativi e architettura

### 2.1 Evidenze e confini della replica

Sono stati analizzati la pagina italiana pubblica [S1], recuperata come HTML, e tutti e quattro gli screenshot allegati. Non sono stati provati login, back-office reale o API di Yes Chef: le schermate sono riferimenti dimostrativi, non prove del funzionamento del prodotto.

Legenda: **O** = osservato nella pagina o negli screenshot; **D** = deduzione progettuale necessaria; **E** = estensione richiesta/proposta, non comprovata dalla fonte.

| Area | Evidenza | Requisiti per Comanda |
|---|---|---|
| Dashboard | O: calendario giorno/settimana/mese; servizi di oggi, prossimi corsi, posti residui, assegnazioni e ospiti | Agenda coerente con prenotazioni e capienza; filtri sede, esperienza, staff, stato; pannello dei problemi operativi |
| Prenotazioni | O: menu Bookings; sito descrive ricezione, verifica, assegnazione, sicurezza e conferma | Lista, scheda, timeline, ricerca per codice/riferimento partner; richieste separate dalle prenotazioni confermate |
| Calendario | O: eventi colorati e orari | Giorno/settimana/mese, timezone evidente, pannello dettaglio; spostamenti con verifica conflitti prima del salvataggio |
| Servizi/catalogo | O: Services; corsi, tour, cene e degustazioni | Separare esperienza vendibile, sua singola occorrenza e prenotazione del gruppo |
| Chef e staff | O: elenco assegnazioni; D: disponibilità e conflitti | Qualifiche, lingue, sedi, disponibilità, buffer viaggio, richiesta/accettazione/rifiuto |
| Guests | O: rubrica e informazioni ospiti | Referente commerciale distinto dai singoli partecipanti; storico senza duplicazioni automatiche |
| Allergie e note | O: gravità, preferenze, filtri, contatori, scheda laterale, istruzioni e note interne | Dati strutturati, presa visione per revisione, blocco di readiness per criticità irrisolte |
| Messaggi | O: menu e badge; funzionamento non visibile | Inbox email e commenti collegati a richiesta/servizio; niente chat universale nell'MVP |
| Report | O: ricavi, booking, ticket medio, operatori, margine, trend, mix esperienze e utilizzo chef | KPI definiti e riconciliabili; nessun numero dimostrativo in produzione |
| Agente email | O: coda, nuove richieste/aggiornamenti/attesa cliente, dati estratti e approvazione umana | Proposte create/update/cancel, diff, fonte e campi da verificare; nessuna conferma automatica |
| Ingredienti/spesa | O: ingredienti citati nel sito; D: calcolo fabbisogni | Ricette e ingredienti per esperienza, quantità per partecipante, lista per sede/giorno |
| Partner B2B | O: partner/canali citati, tariffa operatore nella coda; E: portale dedicato | Catalogo e tariffe autorizzate, richieste, stato, voucher e riepiloghi propri |
| OTA | O: nomi GetYourGuide/Viator/Civitatis/Airbnb nei report; E: connettività API | Canale commerciale anche senza API; adapter reali solo dopo verifica accesso del provider |
| Pagamenti/fatture | O: prezzi e ricavi; E: gestione amministrativa | Registro incassi/rimborsi, saldo, riferimento fattura esterna; checkout e fatturazione elettronica differiti |
| Settings | O: menu | Organizzazione, sedi, staff, tariffe, notifiche, retention, integrazioni e stato quote |

**Correzioni rispetto ai mockup:** nello screenshot report, le curve annuali non sono coerenti con il filtro parziale e con il totale in evidenza; quindi si replicano le viste, non quei dati. Nella scheda allergie compaiono note contraddittorie rispetto ai badge: Comanda deve evidenziarle e chiedere verifica. Non inferire allergia al latte da “senza lattosio” né gravità clinica da preferenze. Il 92–96% dell'agente email è un dato della demo, non una precisione da promettere o riprodurre artificialmente.

### 2.2 Modello operativo fondamentale

**Esperienza → servizio/partenza → prenotazioni → partecipanti.** Esempio: “Pasta class” è il prodotto; il corso del 20/12 alle 10:00 è un servizio da 12 posti; due booking da 4 e 3 persone occupano 7 posti. Il numero di prenotazioni è 2, quello degli ospiti è 7, quello dei servizi è 1. Staff, luogo e lista spesa appartengono al servizio; prezzo, referente, canale e incassi appartengono alla prenotazione.

Un evento privato usa `booking_mode=private`: una sola prenotazione attiva occupa l'intero servizio, anche se i pax sono inferiori alla capacità. Per gruppi che richiedono due guide si configura un requisito quantitativo; i posti dei bambini possono avere prezzo diverso ma occupano capacità, salvo regola esplicita del catalogo.

**Stati separati:**

| Oggetto | Stati e significato |
|---|---|
| Richiesta | `draft → pending_review → awaiting_customer / approved / rejected`; `withdrawn` se ritirata. Approvata genera o modifica una prenotazione una sola volta |
| Prenotazione | `held → confirmed → completed / no_show`; `held → expired`; `held/confirmed → cancelled`. L'hold è facoltativo, con scadenza; draft non occupa posti |
| Servizio | `draft → scheduled → completed`; oppure `cancelled`. Bozze visibili soltanto al back-office con stile distinto |
| Readiness operativa | `needs_staff / needs_dietary_review / ready`, calcolata da requisiti e revisioni, non un secondo stato commerciale |
| Incarico | `proposed → accepted / declined`; `proposed → expired`; `accepted → released`. Proposed e accepted riservano lo slot dello staff |
| Pagamento | Saldo derivato da registrazioni: non pagato, parziale, pagato, credito/rimborso dovuto; mai sinonimo di confermato |

Una prenotazione già confermata non diventa automaticamente cancellata se uno chef rinuncia: resta confermata, perde readiness e genera un allarme. Prima conferma normalmente richiede sede, capienza, tariffa e copertura staff accettata; eventuale deroga del manager è esplicita, motivata e registrata, senza poter aggirare capienza o sovrapposizioni fisiche. Per allergie dichiarate ma irrisolte serve verifica operativa del team, non un giudizio AI di sicurezza.

### 2.3 Prenotazione, modifiche e concorrenza

1. Telefono, back-office, partner, form o email producono una richiesta. Il canale e l'identificativo esterno sono conservati; la fonte non equivale a un'autorizzazione.
2. Il manager controlla esperienza, data/ora, sede, lingua, pax, referenti, note, prezzo ed eventuale corrispondenza con un servizio esistente.
3. Il server calcola il prezzo applicabile e ne conserva lo snapshot. Il prezzo suggerito da email o partner non viene accettato come autorevole.
4. Facoltativamente si crea un hold di 15 minuti. La richiesta in revisione, senza hold, non blocca inventario.
5. Si verifica staff, logistica ed esigenze alimentari; si conferma con RPC atomica. Solo dopo commit viene messa in outbox la comunicazione.
6. Cambio data, pax o servizio ricalcola disponibilità, costi e obblighi di revisione. La RPC blocca i servizi di origine/destinazione in ordine deterministico; se fallisce, nulla viene spostato.
7. Annullamento libera capacità, aggiorna fabbisogni e notifiche; il rimborso è una procedura separata. L'annullamento di un servizio richiede gestione esplicita di tutte le sue prenotazioni.

**Invariante capienza:** pax confermati più pax degli hold non scaduti ≤ capacità. Ogni percorso che li modifica prende lo stesso lock sul servizio; nessun check esclusivamente nel browser. Hold scaduti sono esclusi subito dal conteggio, anche se il job di pulizia è in ritardo. Ridurre la capacità sotto l'occupato è vietato. Idempotency key obbligatoria per conferme e comandi esterni; `version` protegge dall'overwrite di schermate vecchie.

### 2.4 Staff, risorse e agenda

Disponibilità esplicita per intervalli; assenza di disponibilità significa “non dichiarata”, non “libero”. Eccezioni e ferie prevalgono. Template settimanali opzionali vengono espansi in intervalli per le successive otto settimane, nel fuso locale, con gestione ora legale.

Assegnazione manuale MVP; suggerimenti deterministici fase 2: qualifica e lingua compatibili, disponibilità, sede e tempi di trasferimento, carico di lavoro. Ordinamento spiegabile; nessun modello AI necessario. Un'assegnazione automatica opzionale crea una proposta da accettare, non garantisce disponibilità umana.

La prenotazione del tempo comprende preparazione, attività, riordino e buffer. Intervalli semiaperti `[inizio,fine)` permettono servizi adiacenti soltanto quando i buffer lo consentono. Constraint PostgreSQL di esclusione impedisce sovrapposizioni dello stesso staff anche con due richieste simultanee. Requisiti più complessi, quali trasferimenti variabili tra sedi, sono validati sotto lock sullo staff.

Sale, cucine e veicoli sono risorse. MVP: ciascuna unità prenotabile è esclusiva, con capacità dichiarata. Più sale indipendenti diventano risorse distinte; non inventare un algoritmo per risorse condivise senza necessità. Lo spostamento orario di un servizio aggiorna incarichi e blocchi risorse nella medesima transazione o fallisce.

### 2.5 Allergie, checklist e spesa

Ogni esigenza è legata a un partecipante specifico o provvisorio (“Ospite 2”), non automaticamente a tutto il gruppo. Tipo: `allergy`, `intolerance`, `preference`, `other`; gravità dichiarata `unknown/mild/moderate/severe`, fonte e stato di verifica. `unknown` non equivale a “nessuna allergia”. Consentire segnalazione incompleta e metterla in revisione; distinguere “dato non raccolto” da “nessuna esigenza dichiarata”.

All'aggiornamento si incrementa la revisione alimentare del servizio: lo staff pertinente deve riprendere visione; la presa visione precedente resta in storico ma non soddisfa la versione corrente. Al cambio chef il nuovo incaricato prende visione. Check-in o “servizio pronto” mostrano blocchi irrisolti, senza suggerire che un badge garantisca assenza di contaminazione.

Ricette: quantità base per porzioni, unità canonica, fattore adulto/bambino configurato, scarto opzionale. Formula: quantità ingrediente × porzioni equivalenti / resa ricetta × (1 + scarto). Aggregare per sede/data/unità e arrotondare solo alla fine; non convertire kg in litri senza fattore definito. Menu alternativo per singolo partecipante revisionato da chef; niente sostituzioni automatiche basate su allergeni.

Lista spesa dinamica finché non viene congelata; snapshot e override motivati per quantità acquistate. Variazioni successive generano differenze da controllare. MVP senza inventario, lotti, scadenze, ordini fornitori o ERP.

### 2.6 Email, revisione AI e notifiche

**Ingresso:** indirizzo dedicato/inoltro verso Resend Inbound, oppure importazione manuale del testo come fallback. Questo non concede accesso alla casella Outlook/Gmail esistente. Identificare tenant dal destinatario configurato sul server, non dal corpo dell'email.

Pipeline: webhook verificato sul body originale → persistenza dell'evento e deduplica → recupero contenuto → parsing → proposta nella coda → revisione umana → RPC di approvazione → outbox. Resend documenta la verifica della firma e la sensibilità al body originale [S6]. Rispondere 2xx dopo persistenza durabile; firma invalida 4xx, errore temporaneo di persistenza 5xx. Un messaggio valido ma non processabile viene archiviato in quarantena e riconosciuto, evitando retry inutili.

La coda contiene nuove richieste, aggiornamenti e cancellazioni proposte; vista fonte/dati estratti affiancata; diff prima/dopo; ambiguità su data, timezone, pax e prezzo; matching manuale per partner o esperienza incerti. Una risposta cliente viene collegata tramite thread, Message-ID e riferimento prenotazione, non solo tramite subject. Nessuna modifica di una prenotazione basandosi soltanto sul mittente.

In fase 2: parser deterministico per template e form, revisione per email libere. Adattatore LLM opzionale, disattivato senza provider e budget espliciti. Output JSON validato; confidenza per campo solo se disponibile e interpretabile, altrimenti “da verificare”. L'LLM non ha tool di scrittura, non visita link o allegati e non esegue istruzioni contenute nei messaggi. Firma webhook certifica il trasporto da Resend, non l'identità commerciale del mittente. Limiti di lunghezza, rate limit, HTML sanitizzato, allegati esclusi di default; fonti sconosciute in coda ristretta. Prezzi, ID e transizioni sempre validati dal dominio.

Approvazione idempotente con versione attesa: ricontrolla disponibilità e tariffa corrente; un operatore deve vedere eventuali differenze rispetto alla proposta. Due approvazioni simultanee non creano due booking. Una modifica ricevuta dopo una modifica manuale richiede riconciliazione, non last-write-wins.

**Uscita:** conferma, cancellazione, variazione importante, proposta incarico, rifiuto, riepilogo giornaliero e promemoria. Template italiano/inglese secondo lingua del destinatario. Preferenza email/in-app per categoria; sicurezza operativa sempre visibile in-app. Riepilogo giornaliero alle 18:00 locali per il giorno seguente, configurabile, con link autenticati.

Outbox transazionale in PostgreSQL, worker Edge Function con lease e retry esponenziale, chiave idempotente Resend stabile; stato separato tra accettata dal provider, consegnata e rimbalzata. Dopo timeout ambiguo oltre la finestra di deduplica del provider, riconciliare prima di reinviare. Rate budget condiviso con email di autenticazione se usano lo stesso account; priorità inviti/reset e comunicazioni urgenti, poi riepiloghi. Superata quota: coda e allarme in-app, mai perdita silenziosa.

### 2.7 Partner, OTA e amministrazione

Portale B2B: catalogo autorizzato, tariffe proprie, richiesta di data/pax, stato, integrazione partecipanti, proposta modifica/cancellazione, voucher e conto commerciale. La disponibilità presentata è indicativa fino alla transazione di conferma; nessuna informazione sulle altre prenotazioni.

MVP: canali OTA come anagrafiche, inserimento manuale e CSV con anteprima/mapping. Email in fase 2. La presenza del logo Viator nei report non implica connettività. L'API supplier/reservation di Viator ha specifiche e percorso dedicati [S8]; non sostituirla con un'API affiliati. Per ciascun provider verificare contratto, accesso, sandbox, mapping, cancellazioni, rate limit e test richiesti. In assenza di accesso mostrare “manuale”, non “sincronizzato”.

Adapter opzionale fase 4: ingestione autenticata, chiave univoca evento e prenotazione esterna, gestione eventi fuori ordine, mapping prodotto/variante/data, riconciliazione periodica e inbox errori. Inventario autorevole in Comanda soltanto se il canale consente verifica o allocazione coerente: se la conferma OTA precede il controllo locale può verificarsi overbooking esterno. In quel caso incidente operativo, mai scarto silenzioso o promessa di eliminare il rischio. Senza API usare allotment conservativi e aggiornamento manuale documentato. iCal non trasporta in modo completo pax, prezzi e aggiornamenti: eventuale calendario di sola consultazione, non channel manager.

Finanza MVP: totale venduto, acconto, saldo, rimborso e scadenza; importi in centesimi, valuta, fonte e prova di riconciliazione. Incasso dal cliente e rimessa del partner sono distinti e non si sommano come due ricavi. Registrazione manuale con audit e storno; nessun dato carta. Pagamento online richiede provider ulteriore, commissioni e webhook: differito. Fattura esterna: riferimento e stato; un riepilogo PDF non viene presentato come fattura elettronica valida. Generazione fiscale/SDI fuori perimetro iniziale.

### 2.8 Report e definizioni KPI

| KPI | Definizione implementabile |
|---|---|
| Valore prenotato | Somma venduto dei booking attivi per data servizio; separare futuro confermato da servizi svolti |
| Ricavo gestionale | Importo al netto imposte dei servizi completati, meno rettifiche; non ricavo civilistico certificato |
| Incassato | Movimenti finanziari regolati per data pagamento, meno rimborsi; distinto dai ricavi |
| Prenotazioni / ospiti / servizi | Tre conteggi distinti, con filtro stati coerente |
| Ticket medio | Valore venduto del perimetro / numero booking nello stesso perimetro; evitare divisione per zero |
| Partner attivi | Partner con almeno un booking confermato/completato nel periodo |
| Margine operativo | (Ricavo netto − costi diretti − commissioni) / ricavo netto; N/D se costi incompleti o ricavo zero |
| Conversione richieste | Richieste eleggibili approvate / richieste eleggibili ricevute, per coorte di ricezione; non conversione visite OTA |
| Utilizzo staff | Durata unione incarichi accettati / durata unione disponibilità effettive del periodo; non ore duplicate |
| Ricavi attribuiti chef | Ripartizione per peso dell'incarico, somma pesi = 1 per servizio; metrica gestionale, non performance causale |

Filtri globali periodo, sede, canale/partner ed esperienza si applicano a tutti i grafici. Ogni grafico indica la data usata. Confronto con periodo precedente di pari durata oppure anno precedente esplicitato. Trend non include mesi fuori filtro; nessuna somma tra valute. Drill-down ai record fonte ed export CSV con protezione formula injection. Query SQL aggregate, nessun data warehouse. Indici prima delle materializzazioni.

### 2.9 Architettura minima e costi

**Monolite modulare:** una sola applicazione Next.js per back-office, operativo e partner; un database Supabase; Edge Functions per ingressi esterni e worker. Server Components per letture iniziali, Client Components solo per calendario, filtri e interazioni. Server Actions per comandi utente verso RPC; nessuna duplicazione di invarianti tra Next.js ed Edge Functions. PostgreSQL è l'autorità transazionale.

| Componente | Scelta | Motivo |
|---|---|---|
| Database e autenticazione | Supabase; sviluppo locale, un progetto remoto iniziale | Ridurre consumo e complessità; nessun secondo ORM necessario |
| API interne | Supabase SDK tipizzato + RPC | RLS e transazioni vicino ai dati |
| Background | Una tabella outbox; Supabase Cron ogni 5 minuti per lavorazione e scadenze | Evita Redis, code esterne e job Vercel frequenti; circa 8.640 tick in 30 giorni |
| Realtime | Una connessione per sessione, sottoscrizioni ristrette; refetch su reconnect | Aggiornamento rapido senza replicare l'intero database |
| Email | Resend; SMTP Auth dedicato e invio applicativo con budget condiviso | Un solo provider, controllo sul tetto giornaliero |
| File | Storage privato solo se necessario; immagini catalogo ottimizzate | Nessuna email/immagine in base64 nel DB |
| Calendario | Libreria con viste standard gratuite o griglia semplice; niente scheduler premium | Il valore è nei vincoli operativi, non in licenze grafiche |
| Analytics | Query SQL e grafici leggeri caricati nella pagina report | Nessun BI esterno o streaming continuo |
| AI | Adapter disattivato di default | La coda funziona anche senza abbonamento LLM |

Supabase Cron può eseguire funzioni SQL o richiamare Edge Functions; segreti in Vault [S7]. Worker attivato anche dopo un evento per ridurre latenza, ma l'affidabilità viene dalla coda persistente e dal recupero schedulato. Tick cron non implica garanzia di puntualità su piano gratuito; mostrare ultimo aggiornamento e backlog.

**Quote pubblicate consultate, da ricontrollare all'implementazione:** Supabase Free: DB 500 MB, Storage 1 GB, 5 GB egress, 50.000 MAU, 500.000 invocazioni Edge/mese, 2 milioni messaggi Realtime/mese, 200 connessioni di picco; pausa dopo una settimana di inattività indicata sul pricing [S3]. Resend Free: 3.000 email/mese e 100/giorno [S4]. Sono limiti dei servizi, non capacità garantite di Comanda. L'effettivo consumo e le condizioni dell'account devono essere verificati; inbound e Auth rientrano nel budget applicabile al piano. Nessuna automazione artificiale per eludere la pausa.

Esempio di pianificazione, non benchmark: 300 booking/mese × 2 email = 600; 10 staff × 26 riepiloghi = 260; aggiungere inviti, cambi, Auth e inbound. Il totale mensile potrebbe essere contenuto, ma un picco giornaliero può raggiungere il tetto. Avvisi al 70% e 85% delle quote; blocco di invii non urgenti al budget configurato. Controllo manuale da dashboard provider se le metriche non sono accessibili via API, senza millantare misurazioni.

**Affidabilità:** nessun SLA promesso su Free. Export backup cifrato giornaliero fuori dal repo pubblico e prova di ripristino prima dell'uso reale; obiettivi iniziali RPO 24 ore/RTO 1 giorno solo se quel processo è configurato e testato. Storage e Auth richiedono verifica separata del ripristino; un dump SQL non basta automaticamente. Quando continuità e ripristino diventano critici, il passaggio a piano adeguato è una decisione operativa, non un'ottimizzazione da rimandare a incidente avvenuto.

**Prestazioni e UX, obiettivi da testare:** mobile 390 px, agenda settimanale con 200 servizi caricata entro 2 secondi p95 in ambiente di prova dichiarato; aggiornamenti visibili entro 5 secondi con rete attiva, fallback refetch a 60 secondi e su focus. Paginazione server per liste; query per intervallo, non caricamento di tutto lo storico. Operativo online-first: indicatore offline e scritture disabilitate, nessuna promessa di sincronizzazione offline. Accessibilità WCAG 2.2 AA come obiettivo, stati leggibili senza affidarsi al colore.

## 3. Schema del database — Supabase / PostgreSQL

### 3.1 Convenzioni e relazioni

Le tabelle sotto sono lo schema logico da migrare per fase, non un ordine di creare tutto nell'MVP. `P1/P2/P3/P4` indica il primo step che le richiede. Ogni tabella aziendale, salvo eccezioni esplicite, include `id uuid PK`, `organization_id uuid FK organizations`, `created_at timestamptz`, `updated_at timestamptz`; `UNIQUE(organization_id,id)` consente FK composite. `?` indica nullable; gli altri campi sono NOT NULL salvo valore derivato. FK “→” sempre nello stesso tenant. Gli ID Auth sono globali.

Importi `bigint` in minor unit (centesimi EUR), aliquote `numeric(5,2)`, quantità `numeric(12,3)`, valuta `char(3)`. Mai float monetario. Stati `text` con CHECK per migrazioni semplici. Date effettive `timestamptz` UTC; fuso IANA separato per presentazione e ricorrenze. Tutte le righe modificabili con concorrenza utente hanno `version integer default 1` incrementata dal server. Identificativi esterni sono testo, non UUID interni.

Cardinalità: organizzazione 1:N membership/sedi/esperienze; esperienza 1:N servizi; servizio 1:N prenotazioni e incarichi; booking 1:N partecipanti e movimenti; partecipante 1:N esigenze; partner 1:N prenotazioni; email 1:N proposte di revisione. Una persona può essere referente senza essere partecipante.

### 3.2 Identità, catalogo e staff

| Tabella / fase | Colonne specifiche e relazioni |
|---|---|
| `organizations` P1 | `id uuid PK`, `name text`, `slug text UNIQUE`, `timezone text`, `currency char(3)`, `settings jsonb` validato, timestamp; non ha organization_id |
| `profiles` P1 | `user_id uuid PK → auth.users`, `display_name text`, `locale text`, `avatar_path text?`, timestamp; globale, nessun ruolo e nessuna email commerciale |
| `organization_memberships` P1 | `user_id uuid → auth.users`, `status text(active/suspended/invited)`, UNIQUE(org,user); scope autorizzativo principale |
| `membership_roles` P1 | `membership_id uuid → memberships`, `role text(owner/admin/manager/staff/partner/customer)`, UNIQUE(org,membership,role) |
| `invitations` P1 | `email text`, `role text`, `partner_id uuid?`, `token_hash text UNIQUE`, `expires_at timestamptz`, `accepted_at timestamptz?`, `invited_by uuid → auth.users`; solo hash del token |
| `locations` P1 | `name text`, `address text`, `timezone text`, `meeting_instructions text?`, `active boolean` |
| `resources` P1 | `location_id uuid → locations`, `name text`, `kind text(kitchen/room/vehicle)`, `capacity integer >0`, `active boolean` |
| `experiences` P1 | `name text`, `description text`, `kind text`, `duration_minutes integer >0`, `default_capacity integer >0`, `booking_mode text(shared/private)`, `language_codes text[]`, `color text`, `active boolean` |
| `experience_staff_requirements` P1 | `experience_id uuid`, `operational_role text`, `required_count integer >0`, `language_code text?`, `capability text?` |
| `staff_profiles` P1 | `membership_id uuid UNIQUE`, `home_location_id uuid?`, `active boolean`; contatto privato non esposto ai partner |
| `staff_capabilities` P1 | `staff_id uuid`, `kind text(role/language/skill)`, `value text`, UNIQUE(org,staff,kind,value) |
| `staff_availability` P1 | `staff_id uuid`, `starts_at/ends_at timestamptz`, `kind text(available/unavailable)`, `source text(manual/template)`, `note text?`; fine > inizio |
| `staff_availability_templates` P2 | `staff_id uuid`, `weekday smallint`, `start_local/end_local time`, `timezone text`, `valid_from/valid_to date`, `kind text`; espansione e rigenerazione preservano eccezioni manuali |
| `services` P1 | `experience_id uuid`, `location_id uuid`, `starts_at/ends_at timestamptz`, `timezone text`, `capacity integer`, `booking_mode text`, `status text`, `language_code text`, `meeting_point text?`, `dietary_revision integer`, `version integer` |
| `service_staff_requirements` P1 | `service_id uuid`, `operational_role text`, `required_count integer`, `capability text?`, `language_code text?`; snapshot dei requisiti esperienza |
| `staff_assignments` P1 | `service_id uuid`, `staff_id uuid`, `operational_role text`, `capabilities text[]`, `status text`, `reserved_from/reserved_to timestamptz`, `response_deadline timestamptz?`, `responded_at timestamptz?`, `decline_reason text?`, `revenue_weight numeric(8,5)?` |
| `resource_reservations` P1 | `service_id uuid`, `resource_id uuid`, `reserved_from/reserved_to timestamptz`, `status text(active/released)` |

Le disponibilità sono intervalli effettivi; non usarle come blocchi di occupazione. Le prenotazioni di staff e risorse sono gli oggetti su cui applicare exclusion constraints con `btree_gist`, tenant e identità risorsa/staff, range `[)`, predicate sullo stato bloccante. Buffer già inclusi negli estremi riservati. La RPC aggiorna anche la readiness e produce invalidazione notifiche.

### 3.3 CRM, prenotazioni e finanza

| Tabella / fase | Colonne specifiche e relazioni |
|---|---|
| `partners` P1 | `name text`, `kind text(tour_operator/ota/hotel/concierge/other)`, `billing_email text?`, `active boolean`, `payment_terms_days integer`, `billing_details jsonb?` ristretto |
| `partner_memberships` P3 | `membership_id uuid`, `partner_id uuid`, UNIQUE(org,membership,partner); associazione esplicita al portale |
| `channels` P1 | `name text`, `kind text(direct/phone/partner/ota/email)`, `partner_id uuid?`, `integration_mode text(manual/email/api)` |
| `contacts` P1 | `display_name text`, `email text?`, `phone text?`, `locale text`, `partner_id uuid?`; referente commerciale, email normalizzata indicizzata ma non unica |
| `rate_cards` P1 | `experience_id uuid`, `partner_id uuid?`, `category text(adult/child/private)`, `pricing_basis text(per_person/per_group)`, `unit_gross_minor bigint`, `tax_rate numeric(5,2)?`, `commission_bps integer`, `currency char(3)`, `valid_from/valid_to date`, `active boolean`; rifiutare sovrapposizioni ambigue |
| `booking_requests` P1 | `contact_id uuid?`, `partner_id uuid?`, `channel_id uuid`, `desired_experience_id uuid?`, `desired_service_id uuid?`, `requested_at timestamptz?`, `adults/children integer`, `status text`, `requested_changes jsonb?`, `target_booking_id uuid?`, `approved_booking_id uuid?`, `source_reference text?`, `version integer` |
| `bookings` P1 | `service_id uuid`, `contact_id uuid`, `partner_id uuid?`, `channel_id uuid`, `code text UNIQUE per org`, `external_reference text?`, `adults/children integer`, `status text`, `hold_expires_at timestamptz?`, `confirmed_at/cancelled_at timestamptz?`, `cancellation_reason text?`, `customer_user_id uuid? → auth.users`, `version integer`; nessun dettaglio prezzi in questa tabella |
| `booking_financials` P1 | `booking_id uuid UNIQUE`, `currency char(3)`, `gross_minor bigint`, `tax_minor bigint?`, `net_minor bigint?`, `commission_minor bigint`, `pricing_snapshot jsonb`, `settlement_party text(customer/partner)`, `due_at timestamptz?`, `version integer`; snapshot validato e senza dati sanitari |
| `booking_price_lines` P1 | `booking_id uuid`, `label text`, `category text`, `quantity numeric(12,3)`, `unit_gross_minor bigint`, `line_gross_minor bigint`, `tax_rate numeric(5,2)?`, `tax_minor bigint?`; sconti tramite righe dedicate; totali riconciliati |
| `participants` P1 | `booking_id uuid`, `display_name text?`, `category text(adult/child)`, `ordinal integer`, `dietary_collection_status text(unknown/declared_none/provided)`, UNIQUE(org,booking,ordinal) |
| `booking_operational_contacts` P1 | `booking_id uuid UNIQUE`, `contact_name text`, `phone text?`, `meeting_note text?`; sola proiezione strettamente necessaria a staff assegnato |
| `payment_entries` P1 | `booking_id uuid`, `kind text(receipt/refund/reversal/adjustment)`, `amount_minor bigint >0`, `currency char(3)`, `payer_type text(customer/partner)`, `method text(cash/bank/provider)`, `status text(pending/settled/failed)`, `occurred_at timestamptz`, `external_reference text?`, `reverses_entry_id uuid?`, `recorded_by uuid`; mutazioni solo RPC |
| `service_costs` P4 | `service_id uuid`, `category text(staff/ingredients/venue/transport/other)`, `amount_minor bigint`, `currency char(3)`, `status text(estimated/actual)`, `note text?`, `assignment_id uuid?`; importi alternativi stimato/effettivo non doppiati |
| `financial_adjustments` P4 | `booking_id uuid`, `net_delta_minor bigint`, `tax_delta_minor bigint?`, `reason text`, `effective_at timestamptz`, `external_reference text?`; separa rettifiche ricavi da rimborsi monetari |
| `invoice_references` P4 | `booking_id uuid`, `provider text`, `external_id text`, `document_number text?`, `status text`, `issued_at date?`, `private_storage_path text?`; non motore fiscale |

I partecipanti devono rappresentare il totale pax: quando non sono noti i nomi creare righe provvisorie. Aumento/riduzione pax aggiorna righe e prezzo con un unico comando; non cancellare implicitamente partecipanti con esigenze alimentari senza scelta esplicita. Gruppi cancellati sono esclusi da capacità e fabbisogni, non rimossi dallo storico.

### 3.4 Diete, preparazione e comunicazioni

| Tabella / fase | Colonne specifiche e relazioni |
|---|---|
| `dietary_requirements` P1 | `participant_id uuid`, `type text`, `label text`, `severity text`, `source text`, `verification_status text(unreviewed/verified/needs_clarification)`, `declared_at timestamptz`, `verified_by uuid?`, `verified_at timestamptz?`, `revision integer`, `expires_at timestamptz` |
| `dietary_instructions` P1 | `dietary_requirement_id uuid`, `instruction text`, `authored_by uuid`, `version integer`; accesso cucina/guida pertinente |
| `service_notes` P1 | `service_id uuid`, `booking_id uuid?`, `visibility text(backoffice/assigned_staff/partner)`, `partner_id uuid?`, `body text`, `author_id uuid`; non usare note generiche per dati sanitari o segreti |
| `dietary_acknowledgements` P1 | `service_id uuid`, `assignment_id uuid`, `dietary_revision integer`, `acknowledged_by uuid`, `acknowledged_at timestamptz`, UNIQUE(org,assignment,revision); immutabile |
| `privacy_records` P1 | `participant_id uuid?`, `contact_id uuid?`, `purpose text`, `lawful_basis text`, `special_category_condition text?`, `notice_version text`, `recorded_at timestamptz`, `withdrawn_at timestamptz?`, `recorded_by uuid`, `evidence_reference text?`; nessun consenso inventato |
| `recipes` P3 | `experience_id uuid`, `name text`, `yield_portions numeric(12,3)>0`, `version integer`, `active boolean` |
| `ingredients` P3 | `name text`, `canonical_unit text(g/ml/unit)`, `allergen_tags text[]`; catalogo indicativo soggetto a verifica etichette |
| `recipe_ingredients` P3 | `recipe_id uuid`, `ingredient_id uuid`, `quantity numeric(12,3)>0`, `waste_factor numeric(6,4)`, UNIQUE(org,recipe,ingredient) |
| `service_menus` P3 | `service_id uuid`, `recipe_id uuid`, `recipe_version integer`, `portions numeric(12,3)`, `participant_id uuid?`, `approved_by uuid?`; porzioni base escludono quelle assegnate ad alternative |
| `shopping_lists` P3 | `location_id uuid`, `service_date date`, `status text(draft/frozen/completed)`, `version integer`, `generated_at timestamptz`, UNIQUE(org,location,date) |
| `shopping_list_items` P3 | `shopping_list_id uuid`, `ingredient_id uuid`, `required_quantity numeric(12,3)`, `purchased_quantity numeric(12,3)`, `unit text`, `override_quantity numeric(12,3)?`, `override_reason text?`, `source_breakdown jsonb`; snapshot senza identità/allergie ospiti |
| `service_tasks` P3 | `service_id uuid`, `assigned_staff_id uuid?`, `kind text(prep/checkin/cleanup/custom)`, `label text`, `status text(open/done)`, `completed_by uuid?`, `completed_at timestamptz?` |
| `checkins` P3 | `participant_id uuid UNIQUE`, `service_id uuid`, `status text(arrived/no_show)`, `checked_by uuid`, `checked_at timestamptz`; il service_id deve coincidere con quello del booking |
| `message_threads` P2 | `booking_request_id uuid?`, `booking_id uuid?`, `service_id uuid?`, `scope text(internal/partner/customer)`, `partner_id uuid?`; un contesto primario obbligatorio |
| `messages` P2 | `thread_id uuid`, `author_user_id uuid?`, `direction text(inbound/outbound/internal)`, `body_text text`, `provider_message_id text?`, `in_reply_to text?`, `sent_at timestamptz?`, `expires_at timestamptz?`; accesso ereditato dal thread |
| `notifications` P2 | `recipient_user_id uuid`, `type text`, `entity_type text`, `entity_id uuid`, `read_at timestamptz?`, `dedupe_key text UNIQUE per org`; testo generico senza dati sensibili |
| `notification_preferences` P2 | `membership_id uuid`, `category text`, `email_enabled boolean`, `in_app_enabled boolean`, UNIQUE(org,membership,category) |

### 3.5 Tabelle tecniche e integrazioni

Queste tabelle risiedono preferibilmente in schema `private`, non esposto via Data API. La coda visibile al back-office usa RPC o proiezioni autorizzate; niente accesso indiscriminato a payload e segreti.

| Tabella / fase | Colonne specifiche e relazioni |
|---|---|
| `command_receipts` P1 | `actor_id uuid?`, `operation text`, `idempotency_key text`, `request_hash text`, `result_entity_id uuid?`, `status text`, UNIQUE(org,operation,key); stessa chiave con payload diverso rifiutata |
| `audit_events` P1 | `actor_id uuid?`, `actor_kind text(user/system)`, `action text`, `entity_type text`, `entity_id uuid`, `changed_fields text[]`, `reason text?`, `request_id uuid`; append-only, no corpi email né dati sanitari |
| `integration_connections` P2 | `provider text`, `status text`, `inbound_recipient text?`, `credentials_secret_ref text?`, `last_success_at timestamptz?`, `last_error_code text?`; solo riferimento Vault, non segreto |
| `inbound_events` P2 | `connection_id uuid`, `provider_event_id text`, `provider_message_id text?`, `received_at timestamptz`, `status text(received/processing/processed/quarantined/failed)`, `payload_private_path text?`, `error_code text?`, UNIQUE(org,connection,provider_event_id) |
| `review_items` P2 | `inbound_event_id uuid`, `action text(create/update/cancel)`, `target_booking_id uuid?`, `base_booking_version integer?`, `extracted_data jsonb`, `field_evidence jsonb`, `parser_version text`, `status text(pending/awaiting_customer/approved/rejected)`, `reviewed_by uuid?`, `reviewed_at timestamptz?`, `result_request_id uuid?`, `version integer` |
| `outbox_jobs` P2 | `kind text`, `dedupe_key text UNIQUE per org`, `entity_type text`, `entity_id uuid`, `recipient_user_id uuid?`, `recipient_contact_id uuid?`, `due_at timestamptz`, `status text(pending/processing/sent/failed/cancelled)`, `attempts integer`, `locked_until timestamptz?`, `locked_by text?`, `provider_id text?`, `error_code text?`; evita copie dati personali nei payload |
| `delivery_events` P2 | `outbox_job_id uuid`, `provider_event_id text UNIQUE`, `status text`, `occurred_at timestamptz`; storico webhook che non degrada delivered a sent per eventi tardivi |
| `job_runs` P2 | `job_name text`, `started_at/finished_at timestamptz?`, `status text`, `processed_count integer`, `error_code text?`; retention breve |
| `integration_product_mappings` P4 | `connection_id uuid`, `external_product_id text`, `external_option_id text`, `experience_id uuid`, `location_id uuid?`, UNIQUE(org,connection,external_product,external_option) |
| `external_booking_links` P4 | `connection_id uuid`, `external_booking_id text`, `booking_id uuid`, `external_version text?`, `last_applied_at timestamptz?`, UNIQUE(org,connection,external_booking_id) |
| `integration_sync_runs` P4 | `connection_id uuid`, `cursor text?`, `started_at/finished_at timestamptz?`, `status text`, `conflict_count integer`; no polling indiscriminato |

Le tabelle fase 4 relative a OTA vengono create soltanto per un adapter autorizzato e disponibile. La coda email fase 2 non richiede queste tabelle OTA. Nessuna tabella vettoriale, embeddings o data lake.

### 3.6 Vincoli, indici e operazioni atomiche

**Vincoli:** fine > inizio; pax ≥ 0 e totale > 0; capacità > 0; hold richiede scadenza; totale righe = totale booking; valuta coerente su movimenti; FK composite; transizioni legali; esclusioni staff/risorse; massimo un booking attivo per servizio privato. Coerenza check-in/service e menu/partecipante verificata nel dominio e in constraint trigger quando non esprimibile con FK semplice.

Le somme tra righe, capacità e pesi di attribuzione non sono CHECK locali: RPC/trigger transazionali, lock e test concorrenti. Le modifiche dirette che le aggirano sono revocate. Per disponibilità e incarichi, tutte le mutazioni prendono lo stesso lock staff; inserire indisponibilità su un incarico esistente genera conflitto da risolvere, mai cancellazione silenziosa dell'incarico.

**Indici iniziali:** `(organization_id,starts_at)` servizi; `(organization_id,service_id,status)` booking; `(organization_id,partner_id,created_at)` booking/richieste; `(organization_id,user_id,status)` membership; `(organization_id,staff_id,reserved_from)` incarichi; `(organization_id,participant_id)` diete; `(recipient_user_id,read_at,created_at)` notifiche; outbox parziale `(due_at)` sugli stati lavorabili; univocità eventi provider. Ricerca iniziale indicizzata per codice, nome normalizzato ed email; full-text soltanto se necessario.

**Contratti RPC da implementare, non codice già prodotto:**

| Comando | Input essenziale | Garanzia |
|---|---|---|
| `confirm_booking` | request/service, pax, expected_version, idempotency_key | Prezzo server, capacità e readiness, booking+audit+outbox nello stesso commit |
| `change_booking` | booking, patch ammessa, expected_version, key | Lock risorse coinvolte, nessuna modifica parziale; ricalcolo prezzo e fabbisogni |
| `cancel_booking` | booking, motivo, expected_version, key | Rilascio posti e avvio workflow di saldo; nessun rimborso provider implicito |
| `assign_staff` | servizio, staff, mansione, intervallo, key | Disponibilità e conflitti sotto lock; proposta incarico |
| `respond_assignment` | incarico, risposta, expected_version | Solo assegnatario; aggiorna readiness senza modificare prenotazioni confermate |
| `reschedule_service` | servizio, nuovi orari/sede, expected_version, key | Ricalcolo blocchi staff/risorse e allarme; intera transazione rollback se incompatibile |
| `approve_review_item` | proposta, correzioni, expected_version, key | Ricontrolli correnti, riferimento risultato unico, no duplicati |
| `acknowledge_dietary` | incarico, revisione attesa | Rifiuta presa visione di versione superata |
| `record_payment_entry` | booking, importo/tipo, riferimento, key | Autorizzazione, valuta e riconciliazione; nessun doppio movimento |
| `claim_outbox_batch` | worker, limite | `FOR UPDATE SKIP LOCKED`, lease, recupero dopo crash; accesso solo worker |

L'approvazione di una proposta email può creare una richiesta pronta alla revisione commerciale oppure confermare una prenotazione **solo** quando l'operatore sceglie esplicitamente “Approva e conferma” e tutti i controlli passano. La UI deve rendere distinta questa scelta da “Crea richiesta”.

## 4. Struttura delle cartelle e delle pagine Next.js

### 4.1 Organizzazione del repository

Un singolo repository e applicativo. I route group non cambiano l'URL: i prefissi reali `admin`, `ops` e `partner` evitano collisioni. `[orgSlug]` è un selettore di contesto, mai una prova di autorizzazione.

```text
Comanda/
  docs/
    PRD.md
    architecture-decisions.md
    operations-runbook.md
    test-plan.md
  src/
    app/
      (auth)/login/page.tsx
      (auth)/invite/page.tsx
      (auth)/reset-password/page.tsx
      auth/callback/route.ts
      (workspace)/[orgSlug]/
        layout.tsx
        admin/
          dashboard/page.tsx
          requests/page.tsx
          requests/[id]/page.tsx
          bookings/page.tsx
          bookings/[id]/page.tsx
          calendar/page.tsx
          services/page.tsx
          services/[id]/page.tsx
          experiences/page.tsx
          staff/page.tsx
          staff/[id]/page.tsx
          guests/page.tsx
          dietary/page.tsx
          partners/page.tsx
          messages/page.tsx
          review-queue/page.tsx
          shopping/page.tsx
          finance/page.tsx
          reports/page.tsx
          settings/page.tsx
        ops/
          today/page.tsx
          agenda/page.tsx
          services/[id]/page.tsx
          assignments/page.tsx
          availability/page.tsx
          notifications/page.tsx
        partner/
          dashboard/page.tsx
          catalog/page.tsx
          requests/new/page.tsx
          bookings/page.tsx
          bookings/[id]/page.tsx
          statements/page.tsx
        customer/bookings/[id]/page.tsx
      api/health/route.ts
      layout.tsx
      error.tsx
      not-found.tsx
    features/
      bookings/
      scheduling/
      staff/
      dietary/
      partners/
      messaging/
      review-queue/
      shopping/
      finance/
      reporting/
    components/
      ui/
      layout/
      calendar/
      data-table/
      status/
    lib/
      supabase/browser.ts
      supabase/server.ts
      auth/
      permissions/
      validation/
      dates/
      money/
      realtime/
    types/database.generated.ts
    proxy.ts
  supabase/
    config.toml
    migrations/
    seed.sql
    tests/
    functions/
      _shared/
      resend-webhook/
      process-outbox/
      process-inbound/
      ota-webhook/                 # solo quando esiste un adapter reale
  tests/
    unit/
    integration/
    e2e/
    fixtures/
  public/
  .github/workflows/ci.yml
  .env.example
  package.json
  lockfile del package manager scelto
```

Lo schema delle cartelle è progettuale, non file già creati. `proxy.ts` e API specifiche devono seguire la versione Next.js effettivamente installata. Versioni stabili compatibili fissate e lockfile committato; consultare documentazione della versione al bootstrap [S10]. Nessun obbligo di usare una versione ipotizzata in questa specifica.

Ogni feature contiene componenti, query, azioni e validazione; non introdurre un framework di dependency injection o un monorepo. Le regole SQL rimangono nelle migrazioni. Il codice condiviso tra Next.js ed Edge deve essere puro e compatibile con entrambi i runtime; template email e worker restano lato server. Webhook Resend terminano in Supabase Edge, non duplicati anche in Next.js.

### 4.2 Viste principali e comportamento

**Admin dashboard:** navigazione laterale, calendario centrale, servizi del giorno, incarichi da coprire, richieste pendenti, problemi dietetici; ogni card apre un elenco filtrato. Dashboard iniziale utile anche senza report finanziari avanzati.

**Booking detail:** intestazione codice/stato, schede informazioni, partecipanti, esigenze, pagamenti, messaggi e timeline. Evidenziare chi ha modificato cosa; pulsanti diversi per “salva richiesta”, “opziona” e “conferma”. Errori di conflitto restituiscono dettagli utili senza esporre dati di altri partner.

**Dietary:** tabella e pannello laterale come riferimento; filtri data, sede, gravità, chef, stato revisione. Badge testuale, ultima verifica, istruzioni e presa visione. Nessuna foto ospite obbligatoria; niente raccolta foto per imitare il mockup.

**Report:** filtri globali, KPI, trend, mix, canali, utilizzazione staff e drill-down; KPI non disponibili mostrano N/D con causa. Non mostrare metriche di margine senza costi o conversione OTA senza denominatore.

**Operativo mobile:** “Oggi”, “Agenda”, “Incarichi”, “Disponibilità”; scheda servizio con orario, mappa/link meeting point, pax, task, esigenze per capability e revisione da accettare. Pulsanti ampi e una sola azione principale per stato. Per autista, layout focalizzato sui trasferimenti. Nessuna cache persistente di dati sanitari; PWA installabile opzionale con sola shell offline.

**Partner:** catalogo semplice, form richiesta, elenco proprie prenotazioni e saldo; messaggi separati da note interne. Dati cliente modificabili solo entro policy/cutoff, altrimenti proposta al manager. Cutoff iniziale 24 ore, configurabile per esperienza, senza annullamenti automatici.

**Stile:** identità originale Comanda; tema scuro ispirato alla densità delle schermate, accenti ambra, rosso riservato agli errori/criticità, verde per conferma. Tema chiaro utile sul campo. Non copiare marchio, fotografie, testi proprietari o asset di Yes Chef. Empty/loading/error/offline state per ogni vista, navigazione tastiera e conferma accessibile di azioni distruttive.

### 4.3 Ambienti e repository pubblico

Sviluppo locale Supabase con dati sintetici; preview isolata dai dati di produzione e dagli invii reali. Se manca un secondo progetto remoto usare locale per i test, non collegare indiscriminatamente tutte le preview al database reale. Nessun segreto, dump, email originale, screenshot di clienti o backup nel repository pubblico. `.env.example` contiene solo nomi e valori fittizi.

Variabili pubbliche limitate a URL Supabase e publishable key; credenziali privilegiate, Resend e segreti webhook solo nei secret store degli ambienti che le usano. Domini redirect Auth allowlist, log redatti, header di sicurezza e CSP compatibile con UI. Endpoint health senza dati interni. Invii email di sviluppo in modalità test esplicita; nessuna approvazione di un prompt abilita implicitamente invii a clienti reali.

## 5. Piano di sviluppo a fasi — roadmap e prompt per Codex

### 5.1 Sequenza, esclusioni e criteri di uscita

| Step | Risultato utilizzabile | Escluso intenzionalmente | Criterio di uscita |
|---|---|---|---|
| 1 — MVP | Back-office reale: Auth/RLS, catalogo, servizi, staff, disponibilità, prenotazioni, diete, pagamenti manuali, agenda e audit | AI, sync OTA, portale cliente, spesa, report avanzati | Prenotazione end-to-end persistente; isolamento tenant e concorrenza dimostrati |
| 2 — Automazioni | Resend, outbox, inbox/coda revisione, reminder, disponibilità ricorrenti, suggerimenti staff | Conferma AI autonoma, polling massivo, dipendenza LLM obbligatoria | Retry, deduplica e crash recovery testati; coda funziona senza AI |
| 3 — Portale operativo | Mobile staff, accettazioni, check-in, checklist, spesa; portale B2B | App native, offline scrivibile, ERP magazzino | Staff e partner completano i rispettivi flussi senza accesso improprio |
| 4 — Rifiniture | Report, costi, riconciliazioni, sicurezza/UX/backup, portale cliente opzionale, un adapter OTA se disponibile | Tutte le OTA in un solo sprint, SDI e gateway pagamento non approvati | Go-live checklist verificata, limiti/costi dichiarati e nessuna integrazione fittizia |

Non usare stime di giorni come garanzia: il lavoro su accesso OTA e qualità dei dati può essere superiore a quello della UI. Ogni step termina con una versione provabile e un elenco trasparente delle funzioni differite. Nessuna dipendenza di P1 da tabelle P2 non ancora create: in P1 le notifiche restano manuali; quando si aggiunge outbox in P2 si aggiornano le RPC transazionali.

### 5.2 Prompt 1 — MVP transazionale

> Lavora nel repository Comanda seguendo docs/PRD.md, sezioni 1–4, e implementa soltanto lo Step 1. Prima leggi AGENTS.md e lo stato del repository; non sovrascrivere modifiche esistenti. Scegli versioni stabili compatibili di Next.js App Router, TypeScript, Tailwind, Shadcn/UI e Supabase SDK, fissale e committa il lockfile. Mantieni un solo progetto Next.js, senza Prisma, Redis o microservizi.
>
> Implementa le tabelle P1, migrazioni riproducibili, RLS e permessi SQL, helper membership non ricorsivi, FK composite per tenant e RPC per capienza, assegnazioni, modifiche e pagamenti. Se occorre SECURITY DEFINER, documentane la necessità e limita owner/EXECUTE/search_path. Non affidare gli invarianti al frontend. Crea seed esclusivamente sintetici per due organizzazioni, ruoli diversi, servizi condivisi/privati, staff, gruppi e allergie. Crea login a invito, dashboard, richieste, booking detail, calendario, catalogo, sedi/risorse, staff/disponibilità, ospiti e scheda diete. I pagamenti sono registrazioni manuali, non addebiti reali.
>
> Metti subito in evidenza problemi di staff e diete, separa prezzo e stato pagamento dalla conferma. Implementa command_receipts, versioni e audit redatto. Finché non esiste P2, non simulare invii automatici: mostra chiaramente comunicazione manuale. Non attivare portali esterni né pubblicare dati reali.
>
> Verifica con test reali su PostgreSQL/RLS: utente tenant A non accede a B; partner/staff non leggono prezzi o note riservate; nessuna escalation ruolo; due richieste concorrenti per l'ultimo posto ne confermano una sola; doppia assegnazione simultanea rifiutata; spostamento fallito fa rollback; hold scaduto non occupa; sessione sospesa perde accesso; doppio pagamento con stessa chiave non duplica. Aggiungi E2E del percorso richiesta→servizio→assegnazione→conferma e del caso privato. Esegui typecheck, lint, build, test e advisor Supabase disponibili. Fornisci comandi riproducibili, risultati e limiti residui. Non fare upgrade di piani né deployment commerciale su Vercel Hobby.

### 5.3 Prompt 2 — Automazioni affidabili e coda email

> Continua da Step 1 già verificato, seguendo docs/PRD.md. Implementa soltanto Step 2, migrazioni P2 e modifica atomica delle RPC per produrre outbox. Usa Supabase Cron, PostgreSQL e Edge Functions; non aggiungere infrastrutture a pagamento. Crea worker con lease, batch limitati, retry, dead-letter visibile e budget email giornaliero/mensile configurabile. Resend gestisce invio, inbound e stato consegna; verifica firme sul body originale e deduplica gli eventi. Le chiavi restano nei secret store.
>
> Costruisci messaggi/thread separati per audience, coda revisione con fonte, campi estratti, diff e approvazione umana idempotente. Parti con parser per template e importazione manuale; aggiungi solo l'interfaccia provider AI disattivata, senza fingere che un LLM sia configurato. Nessun dato email può comandare tool o autorizzare conferme. Controlla tenant dal destinatario configurato. Approvazione ricontrolla prezzo, versione e capacità. Distingui Crea richiesta da Approva e conferma.
>
> Implementa riepilogo staff alle 18:00 locali del giorno precedente, avvisi su modifiche e reminder; nessun dato sanitario nel contenuto email. Aggiungi template settimanali disponibilità e suggerimenti staff deterministici con motivazione. Non inviare email a persone reali durante i test; usa destinatari di prova autorizzati e modalità test.
>
> Testa firma errata, payload ostile, evento duplicato e fuori ordine, email ambigua, doppia approvazione, proposta obsoleta, crash dopo invio prima del commit, quota esaurita, bounce e retry; prova ora legale Europe/Rome. Verifica che i reminder cancellati o superati non partano. Mostra log redatti e coda errori; documenta setup DNS/SMTP/inbound ancora necessario. Esegui i check del progetto e riporta consumo stimato con assunzioni, senza dichiarare integrate caselle Outlook/Gmail o OTA.

### 5.4 Prompt 3 — Operatività mobile e partner

> Continua da Step 2 e implementa Step 3 di docs/PRD.md. Aggiungi tabelle P3, portale /ops mobile-first e portale /partner nello stesso Next.js. Staff: oggi, agenda, incarichi, disponibilità, accetta/rifiuta, scheda servizio per capability, presa visione revisione dieta, task, check-in e chiusura autorizzata. Autista non vede dati sanitari. Se offline, segnala e non accodare scritture o dati sanitari in cache persistente.
>
> Partner: catalogo e tariffe proprie, richieste, stato, dettagli dei propri booking, integrazioni ospiti e richieste di modifica/cancellazione. Non consentire conferma autonoma, accesso ad altri partner o note interne. Crea RPC/proiezioni che non espongano importi o dati personali non necessari. Disponibilità mostrata non è promessa di posto prima del commit.
>
> Aggiungi ricette, ingredienti, porzioni e menu alternativi approvati, lista spesa per sede/data, snapshot congelabile e diff dopo variazioni. Non costruire inventario o acquisti fornitori. Non suggerire sostituzioni alimentari come sicure in automatico.
>
> Testa da browser a 390 px i percorsi chef, guida, autista e partner. Verifica accesso tramite chiamate dirette API, non solo menu; revoca incarico e perdita accesso; nuova revisione dieta invalida acknowledgement; doppio check-in; variazione pax e ricalcolo spesa senza duplicare porzioni; nessuna conversione tra unità incompatibili. Testa accessibilità, reconnect e stato offline. Consegna risultati E2E, screenshot solo sintetici e guida d'uso sintetica.

### 5.5 Prompt 4 — Report, affidabilità e preparazione all'esercizio

> Completa Step 4 di docs/PRD.md partendo dagli step precedenti verificati. Implementa costi/aggiustamenti e report con definizioni KPI della sezione 2.8, filtri globali coerenti, confronto periodi e drill-down. Mostra N/D dove manca il denominatore o il costo; non usare numeri demo. Attribuisci ricavi staff senza duplicare il totale; separa ricavi, incassi e rimesse partner. Aggiungi export CSV sicuro e riferimento fatture esterne, non emissione SDI.
>
> Completa UX, accessibilità, rate limit, header/CSP, MFA admin, revoca membership, retention e pulizia dei payload, monitoraggio outbox e quota, backup cifrato e prova di restore. Tieni dati e segreti fuori dal repository pubblico; preview senza dati reali. Documenta RPO/RTO effettivamente verificati e rischi residui.
>
> Portale cliente e adapter OTA sono feature opzionali: implementa il portale cliente solo con collegamento identità-prenotazione verificato; non basta conoscere un UUID. Per OTA verifica prima credenziali, contratto, documentazione e sandbox del provider. Se manca accesso, lascia import manuale/email e documenta il blocco; non costruire mock spacciati per sync. Per un adapter disponibile testa mapping, duplicati, fuori ordine, cancellazioni, overbooking esterno e riconciliazione. Non introdurre gateway di pagamento, provider LLM o spese senza decisione esplicita dell'utente.
>
> Esegui suite completa, test concorrenti/RLS, E2E per ogni ruolo e test prestazioni con dataset sintetico dichiarato. Produci checklist go-live con risultati e prerequisiti mancanti. Mantieni lo stack Vercel richiesto ma impedisci di presentare come pronta una produzione commerciale su Hobby; indica il piano compatibile da scegliere senza attivarlo. Consegna una release revisionabile e documentazione aggiornata.

### 5.6 Accettazione finale e decisioni residue

**Il progetto è pronto per un pilota soltanto se:** prenotazioni e disponibilità concordano sotto concorrenza; staff riceve la versione corrente delle istruzioni; ogni partner vede solo il proprio perimetro; tutte le modifiche critiche sono tracciate; l'outbox recupera errori senza duplicare prenotazioni; nessun dato personale è nel repository; backup e restore sono provati; il piano hosting consente l'uso previsto.

**Decisioni prima dell'esercizio, senza bloccare la specifica:** piano hosting compatibile; dominio e mittente email; calendario/volumi reali; regole fiscali e annullamento; base giuridica/retention; policy di accettazione delle allergie; SLA e budget. **Decisioni solo quando serve l'estensione:** quale OTA con accesso disponibile, quale modello AI con limite di spesa, quale provider pagamenti, se attivare portale cliente. Finché non decise, restano i percorsi manuali funzionanti descritti sopra.

### 5.7 Fonti e tracciabilità

Consultazione: 15 novembre 2026. I link alle documentazioni possono cambiare e vanno riconfermati nel bootstrap. Le raccomandazioni architetturali, soglie interne, schema, tempi di retention e criteri di test sono proposte per Comanda, non dichiarazioni del funzionamento interno di Yes Chef.

| ID | Fonte | Uso |
|---|---|---|
| S1 | https://yeschef-booking.com/it/#platform | Pagina italiana recuperata come HTML: flusso prenotazione, sicurezza ospiti, pianificazione, report, agente email e supervisione umana |
| A1–A4 | Quattro screenshot forniti dall'utente: Dashboard; Reports & Insights; Agente Email; Allergies & Notes | Analisi visiva delle viste; dati dimostrativi non trattati come benchmark |
| S2 | https://vercel.com/legal/terms e https://vercel.com/docs/limits/fair-use-guidelines | Restrizione Hobby personale/non commerciale |
| S3 | https://supabase.com/pricing e https://supabase.com/docs/guides/platform/billing-on-supabase | Quote e condizioni Free; non verifica del piano effettivo dell'account |
| S4 | https://resend.com/pricing | Quote email pubblicate |
| S5 | https://supabase.com/docs/guides/database/postgres/row-level-security | RLS e sicurezza accesso ai dati |
| S6 | https://resend.com/docs/webhooks/verify-webhooks-requests e https://resend.com/features/inbound | Firma webhook e ricezione email |
| S7 | https://supabase.com/docs/guides/cron e https://supabase.com/docs/guides/functions/schedule-functions | Scheduling su PostgreSQL/Edge Functions |
| S8 | https://docs.viator.com/supplier-api/technical/index.html | Specifiche connettività reservation/supplier, da verificare prima dell'adapter |
| S9 | https://eur-lex.europa.eu/eli/reg/2016/679/ | Principi GDPR, basi del trattamento e categorie particolari; applicazione da validare dal titolare |
| S10 | https://nextjs.org/docs/app/getting-started/project-structure e https://supabase.com/changelog.md | Convenzioni progetto e verifica documentazione alla versione scelta |

