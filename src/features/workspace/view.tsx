import {InvitationForm} from "./invitations";
import {calendarRange} from "@/lib/dates/range";
import Link from "next/link";
import { notFound } from "next/navigation";
import { workspace } from "@/lib/auth/context";
import type { Database } from "@/types/database.generated";
import { dateTime, money } from "@/lib/utils";
import { CommandForm, type Field } from "./form";

type Table = Exclude<keyof Database["public"]["Tables"], "organizations" | "profiles">;
type Row = Record<string, unknown>;
const str = (r: Row, k: string) => String(r[k] ?? "");
const labels: Record<string, string> = {
  dashboard: "La giornata, sotto controllo.",
  requests: "Richieste",
  bookings: "Prenotazioni",
  calendar: "Calendario",
  services: "Servizi",
  experiences: "Catalogo esperienze",
  locations: "Sedi e risorse",
  staff: "Staff e disponibilità",
  guests: "Ospiti e contatti",
  dietary: "Esigenze alimentari",
  partners: "Partner e canali",
  finance: "Incassi manuali",
  settings: "Accessi e audit",
};
export const nav = Object.entries(labels).map(([path, title]) => ({
  path,
  title: path === "dashboard" ? "Panoramica" : title,
}));
const names: Record<string, string> = {
  pending_review: "Da verificare",
  approved: "Approvata",
  awaiting_customer: "In attesa cliente",
  confirmed: "Confermata",
  held: "Opzionata",
  cancelled: "Annullata",
  scheduled: "In programma",
  accepted: "Accettato",
  proposed: "Proposto",
  declined: "Rifiutato",
  ready: "Pronto",
  needs_staff: "Staff da coprire",
  needs_dietary_review: "Diete da verificare",
  shared: "Condiviso",
  private: "Privato",
  verified: "Verificato",
  unreviewed: "Da verificare",
  needs_clarification: "Da chiarire",
  unknown: "Non raccolte",
  declared_none: "Nessuna dichiarata",
  provided: "Esigenze presenti",
  receipt: "Incasso",
  refund: "Rimborso",
  reversal: "Storno",
  available: "Disponibile",
  unavailable: "Non disponibile",
};
function Badge({ value }: { value: unknown }) {
  const s = String(value ?? "");
  return (
    <span
      className={`badge ${s === "confirmed" || s === "ready" || s === "accepted" ? "text-emerald-300" : s.includes("needs") || s === "unreviewed" ? "text-amber-300" : ""}`}
    >
      {names[s] ?? s}
    </span>
  );
}
function Empty() {
  return (
    <p className="panel muted">
      Nessun dato in questo elenco. Usa il modulo per iniziare.
    </p>
  );
}
function DataTable({
  rows,
  cols,
}: {
  rows: Row[];
  cols: { label: string; render: (r: Row) => React.ReactNode }[];
}) {
  return !rows.length ? (
    <Empty />
  ) : (
    <div className="overflow-x-auto rounded-xl border border-neutral-700">
      <table>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.label}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={str(r, "id") || i}>
              {cols.map((c) => (
                <td key={c.label}>{c.render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
const text = (name: string, label: string, required = true): Field => ({
  name,
  label,
  required,
});
const number = (name: string, label: string, value = "1", min = 0): Field => ({
  name,
  label,
  type: "number",
  value,
  min,
});
const select = (
  name: string,
  label: string,
  values: string[],
  value?: string,
): Field => ({
  name,
  label,
  options: values.map((v) => ({ value: v, label: names[v] ?? v })),
  value,
});
const instant = (name: string, label: string): Field => ({
  name,
  label: `${label} (ISO con fuso, es. 2026-12-20T10:00+01:00)`,
  placeholder: "2026-12-20T10:00:00+01:00",
});
export async function WorkspaceView({
  slug,
  path,
  q,
}: {
  slug: string;
  path: string[];
  q: Record<string, string | undefined>;
}) {
  const area = path[0] ?? "dashboard",
    id = path[1];
  if (!labels[area] || path.length > 2) notFound();
  const { db, org, roles } = await workspace(slug);
  const base = `/${slug}/admin`;
  const page = Math.max(1, Math.min(10000, Number(q.page) || 1));
  async function list(table: Table, limit = 50, filter?: [string, string]) {
    let query = db.from(table).select("*").eq("organization_id", org.id);
    if (filter) query = query.eq(filter[0], filter[1]);
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    if (error) throw new Error("Caricamento non riuscito");
    return (data ?? []) as unknown as Row[];
  }
  async function one(table: Table, rowId: string) {
    if (!/^[\da-f-]{36}$/i.test(rowId)) notFound();
    const { data, error } = await db
      .from(table)
      .select("*")
      .eq("organization_id", org.id)
      .eq("id", rowId)
      .maybeSingle();
    if (error) throw new Error("Caricamento non riuscito");
    if (!data) notFound();
    return data as unknown as Row;
  }
  async function options(
    table: Table,
    label = "name",
  ): Promise<{ value: string; label: string }[]> {
    const { data, error } = await db
      .from(table)
      .select("*")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error("Caricamento non riuscito");
    if(table==='staff_profiles'||table==='organization_memberships'){
      const [{data:members},{data:profiles}]=await Promise.all([
        db.from('organization_memberships').select('id,user_id').eq('organization_id',org.id),
        db.from('profiles').select('user_id,display_name')
      ]);
      return ((data??[]) as unknown as Row[]).map(r=>{
        const userId=table==='staff_profiles'?members?.find(m=>m.id===r.membership_id)?.user_id:r.user_id;
        return {value:str(r,'id'),label:profiles?.find(p=>p.user_id===userId)?.display_name??str(r,'id').slice(0,8)};
      });
    }
    if(table==='services'){
      const {data:experiences}=await db.from('experiences').select('id,name').eq('organization_id',org.id);
      return ((data??[]) as unknown as Row[]).map(r=>({value:str(r,'id'),label:`${experiences?.find(e=>e.id===r.experience_id)?.name??'Servizio'} · ${dateTime(str(r,'starts_at'))} · ${str(r,'id').slice(0,8)}`}));
    }
    return ((data ?? []) as unknown as Row[]).map((r) => ({
      value: str(r, "id"),
      label: str(r, label) || str(r, "id").slice(0, 8),
    }));
  }
  const lookup = async (
    name: string,
    label: string,
    table: Table,
    column = "name",
    required = true,
  ): Promise<Field> => ({
    name,
    label,
    options: await options(table, column),
    required,
  });
  function form(
    operation: string,
    title: string,
    fields: Field[],
    hidden: Record<string, string> = {},
    extra: { button?: string; resultPath?: string; destructive?: boolean } = {},
  ) {
    return (
      <CommandForm
        slug={slug}
        operation={operation}
        title={title}
        fields={fields}
        hidden={hidden}
        {...extra}
      />
    );
  }
  const isAdmin = roles.some((r) => ["owner", "admin"].includes(r));
  let content: React.ReactNode;
  if (area === "dashboard" || area === "calendar") {
    const day = /^\d{4}-\d{2}-\d{2}$/.test(q.date ?? "")
      ? q.date!
      : new Intl.DateTimeFormat("en-CA", { timeZone: org.timezone }).format(
          new Date(),
        );
    const {from,to}=calendarRange(day,q.view??'week',org.timezone);
    const { data: services, error } = await db
      .from("services")
      .select("*,experiences(name),locations(name)")
      .eq("organization_id", org.id)
      .gte("starts_at", from)
      .lt("starts_at", to)
      .order("starts_at")
      .limit(200);
    if (error) throw new Error("Calendario non disponibile");
    const readiness = await Promise.all(
      (services ?? []).map(async (s) => {
        const { data, error } = await db.rpc("service_readiness", {
          p_org: org.id,
          p_service: s.id,
        });
        if (error) throw new Error("Readiness non disponibile");
        return data;
      }),
    );
    const { count: pending } = await db
      .from("booking_requests")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.id)
      .eq("status", "pending_review");
    const cards = [
      ["Servizi nel periodo", services?.length ?? 0, "services"],
      ["Richieste da verificare", pending ?? 0, "requests"],
      [
        "Staff da coprire",
        readiness.filter((r) => r === "needs_staff").length,
        "services",
      ],
      [
        "Diete da verificare",
        readiness.filter((r) => r === "needs_dietary_review").length,
        "dietary",
      ],
    ];
    content = (
      <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(([label, value, url]) => (
            <Link
              key={label}
              href={`${base}/${url}`}
              className="panel hover:border-amber-300"
            >
              <p className="muted text-xs">{label}</p>
              <p className="mt-4 text-4xl font-semibold">{value}</p>
              <p className="mt-4 muted text-xs">Apri elenco ↗</p>
            </Link>
          ))}
        </div>
        <section className="panel">
          <div className="mb-6 flex flex-wrap justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Agenda operativa</h2>
              <p className="muted mt-1 text-xs">
                {org.timezone} · massimo 200 servizi nel periodo
              </p>
            </div>
            <form className="flex flex-wrap items-end gap-2">
              <label>
                Dal
                <input type="date" name="date" defaultValue={day} />
              </label>
              <label>
                Vista
                <select name="view" defaultValue={q.view ?? "week"}>
                  <option value="day">Giorno</option>
                  <option value="week">7 giorni</option>
                  <option value="month">Mese</option>
                </select>
              </label>
              <button className="rounded-lg bg-neutral-700 p-3">Mostra</button>
            </form>
          </div>
          {!services?.length ? (
            <p className="py-14 text-center muted">
              Nessun servizio in questo periodo. Crea la prossima esperienza.
            </p>
          ) : (
            <div className="grid gap-3">
              {services.map((s, i) => (
                <Link
                  key={s.id}
                  href={`${base}/services/${s.id}`}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-neutral-700 border-l-4 border-l-amber-300 p-4 hover:bg-neutral-800"
                >
                  <div>
                    <p className="muted text-xs mb-2">
                      {dateTime(s.starts_at)} · {s.locations?.name}
                    </p>
                    <h3 className="font-semibold">{s.experiences?.name}</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Badge value={s.booking_mode} />
                    <Badge value={readiness[i]} />
                    <span className="text-sm muted">Capienza {s.capacity}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </>
    );
  } else if (area === "requests") {
    const rows = id
      ? [await one("booking_requests", id)]
      : await list("booking_requests");
    content = (
      <>
        {form(
          "create_request",
          "＋ Nuova richiesta",
          [
            await lookup("contact_id", "Referente", "contacts", "display_name"),
            await lookup("channel_id", "Canale", "channels"),
            await lookup(
              "experience_id",
              "Esperienza desiderata",
              "experiences",
            ),
            await lookup(
              "service_id",
              "Servizio (facoltativo)",
              "services",
              "starts_at",
              false,
            ),
            await lookup(
              "partner_id",
              "Partner (facoltativo)",
              "partners",
              "name",
              false,
            ),
            number("adults", "Adulti"),
            number("children", "Bambini", "0"),
            text("source_reference", "Riferimento esterno", false),
          ],
          {},
          { resultPath: "requests" },
        )}
        <DataTable
          rows={rows}
          cols={[
            {
              label: "Richiesta",
              render: (r) => (
                <Link
                  className="text-amber-300"
                  href={`${base}/requests/${str(r, "id")}`}
                >
                  {str(r, "source_reference") || str(r, "id").slice(0, 8)}
                </Link>
              ),
            },
            {
              label: "Partecipanti",
              render: (r) => Number(r.adults) + Number(r.children),
            },
            { label: "Stato", render: (r) => <Badge value={r.status} /> },
            {
              label: "Ricevuta",
              render: (r) => dateTime(str(r, "created_at")),
            },
          ]}
        />
        {id &&
          rows.map((r) => (
            <section className="grid gap-4" key={id}>
              {r.approved_booking_id ? (
                <Link
                  className="panel text-amber-300"
                  href={`${base}/bookings/${str(r, "approved_booking_id")}`}
                >
                  Apri prenotazione generata →
                </Link>
              ) : (
                <>
                  {form(
                    "create_hold",
                    "Opziona per 15 minuti",
                    [{ name: "service_id", label: "Servizio", options: [] }],
                    { id, expected_version: str(r, "version") },
                  )}
                  {form(
                    "confirm_request",
                    "Conferma richiesta",
                    [
                      {
                        ...({
                          name: "service_id",
                          label: "Servizio",
                          options: [],
                        } as Field),
                      },
                    ],
                    { id, expected_version: str(r, "version") },
                  )}
                </>
              )}
            </section>
          ))}
      </>
    );
    if (id) {
      const r = rows[0];
      const serviceField = await lookup(
        "service_id",
        "Servizio",
        "services",
        "starts_at",
      );
      content = (
        <>
          <DataTable
            rows={rows}
            cols={[
              {
                label: "Riferimento",
                render: (r) =>
                  str(r, "source_reference") || str(r, "id").slice(0, 8),
              },
              { label: "Stato", render: (r) => <Badge value={r.status} /> },
              {
                label: "Ospiti",
                render: (r) => Number(r.adults) + Number(r.children),
              },
            ]}
          />
          {r.approved_booking_id ? (
            <Link
              className="panel text-amber-300"
              href={`${base}/bookings/${str(r, "approved_booking_id")}`}
            >
              Apri prenotazione generata →
            </Link>
          ) : (
            <>
              {form(
                "create_hold",
                "Opziona per 15 minuti",
                [serviceField],
                { id, expected_version: str(r, "version") },
                { button: "Crea opzione", resultPath: "bookings" },
              )}
              {form(
                "confirm_request",
                "Conferma richiesta",
                [
                  serviceField,
                  text(
                    "override_reason",
                    "Motivo deroga staff (solo se necessario)",
                    false,
                  ),
                ],
                { id, expected_version: str(r, "version") },
                { button: "Conferma prenotazione", resultPath: "bookings" },
              )}
              {form(
                "set_request_status",
                "Aggiorna stato richiesta",
                [
                  select("status", "Stato", [
                    "pending_review",
                    "awaiting_customer",
                    "rejected",
                    "withdrawn",
                  ]),
                ],
                { id, expected_version: str(r, "version") },
              )}
            </>
          )}
        </>
      );
    }
  } else if (area === "services") {
    if (!id) {
      const rows = await list("services");
      content = (
        <>
          {form(
            "create_service",
            "＋ Nuovo servizio",
            [
              await lookup("experience_id", "Esperienza", "experiences"),
              await lookup("location_id", "Sede", "locations"),
              instant("starts_at", "Inizio"),
              number("capacity", "Capienza", "12", 1),
              text("language_code", "Lingua", false),
            ],
            {},
            { resultPath: "services" },
          )}
          <DataTable
            rows={rows}
            cols={[
              {
                label: "Inizio",
                render: (r) => (
                  <Link
                    className="text-amber-300"
                    href={`${base}/services/${str(r, "id")}`}
                  >
                    {dateTime(str(r, "starts_at"))}
                  </Link>
                ),
              },
              {
                label: "Modalità",
                render: (r) => <Badge value={r.booking_mode} />,
              },
              { label: "Capienza", render: (r) => str(r, "capacity") },
              { label: "Stato", render: (r) => <Badge value={r.status} /> },
            ]}
          />
        </>
      );
    } else {
      const s = await one("services", id);
      const assignments = await list("staff_assignments", 50, [
        "service_id",
        id,
      ]);
      const bookings = await list("bookings", 50, ["service_id", id]);
      const { data: readiness } = await db.rpc("service_readiness", {
        p_org: org.id,
        p_service: id,
      });
      content = (
        <>
          <div className="panel flex flex-wrap gap-5">
            <span>{dateTime(str(s, "starts_at"))}</span>
            <Badge value={s.booking_mode} />
            <Badge value={readiness} />
            <span>Capienza {str(s, "capacity")}</span>
            <span>
              Occupati{" "}
              {bookings
                .filter(
                  (b) =>
                    b.status === "confirmed" ||
                    (b.status === "held" &&
                      new Date(str(b, "hold_expires_at")) > new Date()),
                )
                .reduce((n, b) => n + Number(b.adults) + Number(b.children), 0)}
            </span>
          </div>
          {form(
            "assign_staff",
            "＋ Proponi incarico",
            [
              await lookup("staff_id", "Staff", "staff_profiles", "id"),
              select("operational_role", "Mansione", [
                "chef",
                "guide",
                "driver",
              ]),
              number("buffer_before", "Buffer prima (minuti)", "0"),
              number("buffer_after", "Buffer dopo (minuti)", "0"),
            ],
            { service_id: id },
          )}
          <h2 className="text-xl">Incarichi</h2>
          <DataTable
            rows={assignments}
            cols={[
              { label: "Staff", render: (r) => str(r, "staff_id").slice(0, 8) },
              { label: "Mansione", render: (r) => str(r, "operational_role") },
              { label: "Stato", render: (r) => <Badge value={r.status} /> },
            ]}
          />
          {assignments.map((a) => (
            <div className="grid gap-3" key={str(a, "id")}>
              {form(
                "respond_assignment",
                `Rispondi al tuo incarico ${str(a, "id").slice(0, 8)}`,
                [select("status", "Risposta", ["accepted", "declined"])],
                { id: str(a, "id"), expected_version: str(a, "version") },
              )}
              {form(
                "release_assignment",
                `Rilascia incarico ${str(a, "id").slice(0, 8)}`,
                [],
                { id: str(a, "id"), expected_version: str(a, "version") },
                { destructive: true },
              )}
            </div>
          ))}
          {form(
            "reserve_resource",
            "Riserva risorsa",
            [await lookup("resource_id", "Risorsa", "resources")],
            { service_id: id },
          )}
          {form(
            "reschedule_service",
            "Modifica orario / capienza",
            [
              instant("starts_at", "Nuovo inizio"),
              number("capacity", "Capienza", str(s, "capacity"), 1),
              await lookup("location_id", "Sede", "locations"),
            ],
            { service_id: id, expected_version: str(s, "version") },
          )}
          <h2 className="text-xl">Prenotazioni</h2>
          <DataTable
            rows={bookings}
            cols={[
              {
                label: "Codice",
                render: (r) => (
                  <Link
                    className="text-amber-300"
                    href={`${base}/bookings/${str(r, "id")}`}
                  >
                    {str(r, "code")}
                  </Link>
                ),
              },
              {
                label: "Ospiti",
                render: (r) => Number(r.adults) + Number(r.children),
              },
              { label: "Stato", render: (r) => <Badge value={r.status} /> },
            ]}
          />
        </>
      );
    }
  } else if (area === "bookings") {
    if (!id) {
      const rows = await list("bookings");
      content = (
        <>
          <p className="muted">
            Le prenotazioni nascono dalle{" "}
            <Link href={`${base}/requests`} className="text-amber-300">
              richieste
            </Link>
            . Conferma e incasso sono stati distinti.
          </p>
          <DataTable
            rows={rows}
            cols={[
              {
                label: "Codice",
                render: (r) => (
                  <Link
                    href={`${base}/bookings/${str(r, "id")}`}
                    className="text-amber-300"
                  >
                    {str(r, "code")}
                  </Link>
                ),
              },
              {
                label: "Ospiti",
                render: (r) => Number(r.adults) + Number(r.children),
              },
              { label: "Stato", render: (r) => <Badge value={r.status} /> },
              {
                label: "Scadenza opzione",
                render: (r) =>
                  r.hold_expires_at ? dateTime(str(r, "hold_expires_at")) : "—",
              },
            ]}
          />
        </>
      );
    } else {
      const b = await one("bookings", id);
      const [financials, payments, participants] = await Promise.all([
        list("booking_financials", 50, ["booking_id", id]),
        list("payment_entries", 50, ["booking_id", id]),
        list("participants", 100, ["booking_id", id]),
      ]);
      const paid = payments.reduce(
        (sum, p) =>
          sum +
          (p.status === "settled"
            ? (p.kind === "receipt"
                ? 1
                : p.kind === "refund"
                  ? -1
                  : payments.find((x) => x.id === p.reverses_entry_id)?.kind ===
                      "refund"
                    ? 1
                    : -1) * Number(p.amount_minor)
            : 0),
        0,
      );
      const gross = Number(financials[0]?.gross_minor ?? 0);
      content = (
        <>
          <div className="panel flex flex-wrap items-center gap-5">
            <h2 className="text-2xl">{str(b, "code")}</h2>
            <Badge value={b.status} />
            <Link
              href={`${base}/services/${str(b, "service_id")}`}
              className="text-amber-300"
            >
              Apri servizio →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Valore prenotato", gross],
              ["Incassato netto", paid],
              ["Saldo / credito", gross - paid],
            ].map(([label, value]) => (
              <div className="panel" key={String(label)}>
                <p className="muted text-xs">{label}</p>
                <p className="mt-3 text-3xl">{money(value)}</p>
              </div>
            ))}
          </div>
          {b.status === "held" &&
            form(
              "confirm_booking",
              "Conferma opzione",
              [
                text(
                  "override_reason",
                  "Motivo deroga staff (facoltativo)",
                  false,
                ),
              ],
              { booking_id: id, expected_version: str(b, "version") },
              { button: "Conferma prenotazione" },
            )}
          {["held", "confirmed"].includes(str(b, "status")) && (
            <>
              {form(
                "change_booking",
                "Modifica prenotazione",
                [
                  await lookup(
                    "service_id",
                    "Servizio destinazione",
                    "services",
                    "starts_at",
                  ),
                  number("adults", "Adulti", str(b, "adults")),
                  number("children", "Bambini", str(b, "children")),
                  select(
                    "allow_removal",
                    "Rimuovi partecipanti provvisori se necessario",
                    ["false", "true"],
                    "false",
                  ),
                ],
                { booking_id: id, expected_version: str(b, "version") },
              )}
              {form(
                "cancel_booking",
                "Annulla prenotazione",
                [text("reason", "Motivo")],
                { booking_id: id, expected_version: str(b, "version") },
                { destructive: true, button: "Annulla prenotazione" },
              )}
            </>
          )}
          {form(
            "record_payment_entry",
            "Registra incasso / rimborso",
            [
              select("kind", "Tipo", ["receipt", "refund"]),
              number("amount_minor", "Importo in centesimi", "100", 1),
              select("method", "Metodo", ["cash", "bank"]),
              text("external_reference", "Riferimento", false),
            ],
            { booking_id: id },
          )}
          <h2 className="text-xl">Movimenti manuali</h2>
          <DataTable
            rows={payments}
            cols={[
              { label: "Tipo", render: (r) => <Badge value={r.kind} /> },
              {
                label: "Importo",
                render: (r) => money(str(r, "amount_minor")),
              },
              { label: "Data", render: (r) => dateTime(str(r, "occurred_at")) },
              {
                label: "Riferimento",
                render: (r) => str(r, "external_reference"),
              },
            ]}
          />
          {form(
            "record_payment_entry",
            "Storna un movimento",
            [
              {
                name: "reverses_entry_id",
                label: "Movimento",
                options: payments
                  .filter((p) => ["receipt", "refund"].includes(str(p, "kind")))
                  .map((p) => ({
                    value: str(p, "id"),
                    label: `${names[str(p, "kind")]} ${money(str(p, "amount_minor"))} · ${str(p, "id").slice(0, 8)}`,
                  })),
              },
            ],
            { booking_id: id, kind: "reversal" },
            { destructive: true },
          )}
          <h2 className="text-xl">Partecipanti e raccolta diete</h2>
          {participants.map((p) => (
            <div className="grid gap-3" key={str(p, "id")}>
              {form(
                "update_participant",
                `Ospite ${str(p, "ordinal")} · ${str(p, "display_name") || "Nome da raccogliere"} · ${names[str(p, "dietary_collection_status")]}`,
                [
                  {
                    ...text("display_name", "Nome", false),
                    value: str(p, "display_name"),
                  },
                  select(
                    "dietary_collection_status",
                    "Dichiarazione",
                    ["unknown", "declared_none", "provided"],
                    str(p, "dietary_collection_status"),
                  ),
                ],
                { id: str(p, "id"), expected_version: str(p, "version") },
              )}
              {form(
                "save_dietary",
                `Aggiungi esigenza · ospite ${str(p, "ordinal")}`,
                [
                  select("type", "Tipo", [
                    "allergy",
                    "intolerance",
                    "preference",
                    "religious",
                  ]),
                  text("label", "Esigenza dichiarata"),
                  select("severity", "Gravità dichiarata", [
                    "unspecified",
                    "low",
                    "high",
                    "critical",
                  ]),
                  text("source", "Fonte della dichiarazione"),
                ],
                { participant_id: str(p, "id") },
              )}
            </div>
          ))}
          {form(
            "save_note",
            "Aggiungi nota interna",
            [text("body", "Nota operativa (nessun dato sanitario)")],
            { booking_id: id, service_id: str(b, "service_id") },
          )}
        </>
      );
    }
  } else if (area === "experiences") {
    const [rows, rates, requirements] = await Promise.all([
      list("experiences"),
      list("rate_cards"),
      list("experience_staff_requirements"),
    ]);
    content = (
      <>
        {isAdmin && (
          <>
            {form("save_experience", "＋ Nuova esperienza", [
              text("name", "Nome"),
              text("description", "Descrizione", false),
              number("duration_minutes", "Durata (minuti)", "120", 1),
              number("capacity", "Capienza", "12", 1),
              select("booking_mode", "Modalità", ["shared", "private"]),
            ])}
            {form("save_requirement", "Aggiungi requisito staff", [
              await lookup("experience_id", "Esperienza", "experiences"),
              select("operational_role", "Mansione", [
                "chef",
                "guide",
                "driver",
              ]),
              number("required_count", "Numero richiesto", "1", 1),
              select("capability", "Capability", [
                "kitchen",
                "tour",
                "transport",
                "checkin",
                "service_lead",
              ]),
              text("language_code", "Lingua", false),
            ])}
            {form("save_rate", "＋ Nuova tariffa", [
              await lookup("experience_id", "Esperienza", "experiences"),
              await lookup(
                "partner_id",
                "Partner (facoltativo)",
                "partners",
                "name",
                false,
              ),
              select("category", "Categoria", ["adult", "child", "private"]),
              select("pricing_basis", "Base", ["per_person", "per_group"]),
              number("unit_gross_minor", "Prezzo in centesimi", "8500"),
              { ...text("tax_rate", "IVA %", false), type: "number" },
              number("commission_bps", "Commissione in punti base", "0"),
              { ...text("valid_from", "Valida dal"), type: "date" },
              { ...text("valid_to", "Valida al"), type: "date" },
            ])}
          </>
        )}
        <DataTable
          rows={rows}
          cols={[
            { label: "Esperienza", render: (r) => str(r, "name") },
            {
              label: "Durata",
              render: (r) => `${str(r, "duration_minutes")} min`,
            },
            { label: "Capienza", render: (r) => str(r, "default_capacity") },
            {
              label: "Modalità",
              render: (r) => <Badge value={r.booking_mode} />,
            },
          ]}
        />
        <h2 className="text-xl">Tariffe</h2>
        <DataTable
          rows={rates}
          cols={[
            {
              label: "Esperienza",
              render: (r) =>
                str(rows.find((x) => x.id === r.experience_id) ?? {}, "name"),
            },
            { label: "Categoria", render: (r) => str(r, "category") },
            {
              label: "Prezzo unitario",
              render: (r) => money(str(r, "unit_gross_minor")),
            },
            {
              label: "Validità",
              render: (r) => `${str(r, "valid_from")} → ${str(r, "valid_to")}`,
            },
          ]}
        />
        <h2 className="text-xl">Requisiti staff</h2>
        <DataTable
          rows={requirements}
          cols={[
            {
              label: "Esperienza",
              render: (r) =>
                str(rows.find((x) => x.id === r.experience_id) ?? {}, "name"),
            },
            { label: "Mansione", render: (r) => str(r, "operational_role") },
            { label: "Numero", render: (r) => str(r, "required_count") },
          ]}
        />
      </>
    );
  } else if (area === "locations") {
    const [rows, resources] = await Promise.all([
      list("locations"),
      list("resources"),
    ]);
    content = (
      <>
        {isAdmin && (
          <>
            {form("save_location", "＋ Nuova sede", [
              text("name", "Nome"),
              text("address", "Indirizzo"),
              { ...text("timezone", "Fuso"), value: "Europe/Rome" },
            ])}
            {form("save_resource", "＋ Nuova risorsa", [
              await lookup("location_id", "Sede", "locations"),
              text("name", "Nome"),
              select("kind", "Tipo", ["kitchen", "room", "vehicle"]),
              number("capacity", "Capienza", "12", 1),
            ])}
          </>
        )}
        <DataTable
          rows={rows}
          cols={[
            { label: "Sede", render: (r) => str(r, "name") },
            { label: "Indirizzo", render: (r) => str(r, "address") },
            { label: "Fuso", render: (r) => str(r, "timezone") },
          ]}
        />
        <h2 className="text-xl">Risorse</h2>
        <DataTable
          rows={resources}
          cols={[
            { label: "Risorsa", render: (r) => str(r, "name") },
            { label: "Tipo", render: (r) => str(r, "kind") },
            { label: "Capienza", render: (r) => str(r, "capacity") },
          ]}
        />
      </>
    );
  } else if (area === "staff") {
    const [rows, availability, caps] = await Promise.all([
      list("staff_profiles"),
      list("staff_availability"),
      list("staff_capabilities"),
    ]);
    content = (
      <>
        {isAdmin && (
          <>
            {form("save_staff", "＋ Aggiungi profilo staff", [
              await lookup(
                "membership_id",
                "Membership",
                "organization_memberships",
                "user_id",
              ),
              await lookup(
                "location_id",
                "Sede base",
                "locations",
                "name",
                false,
              ),
            ])}
            {form("save_capability", "Aggiungi qualifica / lingua", [
              await lookup("staff_id", "Staff", "staff_profiles", "id"),
              select("kind", "Tipo", ["role", "language", "skill"]),
              text("value", "Valore (chef, guide, driver, it, en…)"),
            ])}
          </>
        )}
        {form("set_availability", "＋ Dichiara disponibilità", [
          await lookup("staff_id", "Staff", "staff_profiles", "id"),
          instant("starts_at", "Inizio"),
          instant("ends_at", "Fine"),
          select("kind", "Disponibilità", ["available", "unavailable"]),
        ])}
        <DataTable
          rows={rows}
          cols={[
            { label: "Staff", render: (r) => str(r, "id").slice(0, 8) },
            {
              label: "Membership",
              render: (r) => str(r, "membership_id").slice(0, 8),
            },
            {
              label: "Qualifiche",
              render: (r) =>
                caps
                  .filter((c) => c.staff_id === r.id)
                  .map((c) => str(c, "value"))
                  .join(", "),
            },
          ]}
        />
        <h2 className="text-xl">Disponibilità dichiarate</h2>
        <DataTable
          rows={availability}
          cols={[
            { label: "Staff", render: (r) => str(r, "staff_id").slice(0, 8) },
            { label: "Dal", render: (r) => dateTime(str(r, "starts_at")) },
            { label: "Al", render: (r) => dateTime(str(r, "ends_at")) },
            { label: "Stato", render: (r) => <Badge value={r.kind} /> },
          ]}
        />
      </>
    );
  } else if (area === "guests") {
    const rows = await list("contacts");
    content = (
      <>
        {form("save_contact", "＋ Nuovo referente", [
          text("display_name", "Nome"),
          { ...text("email", "Email", false), type: "email" },
          text("phone", "Telefono", false),
          await lookup("partner_id", "Partner", "partners", "name", false),
        ])}
        <DataTable
          rows={rows}
          cols={[
            { label: "Referente", render: (r) => str(r, "display_name") },
            { label: "Email", render: (r) => str(r, "email") },
            { label: "Telefono", render: (r) => str(r, "phone") },
          ]}
        />
        <p className="muted">
          I singoli partecipanti e le dichiarazioni alimentari sono nella scheda
          prenotazione.
        </p>
        {form("save_privacy", "Registra evidenza privacy", [
          await lookup("contact_id", "Contatto", "contacts", "display_name"),
          text("purpose", "Finalità"),
          text("lawful_basis", "Base giuridica"),
          text(
            "special_category_condition",
            "Condizione art. 9 (se applicabile)",
            false,
          ),
          text("notice_version", "Versione informativa"),
          text("evidence_reference", "Riferimento evidenza", false),
        ])}
      </>
    );
  } else if (area === "dietary") {
    const rows = await list("dietary_requirements");
    content = (
      <>
        <p className="panel text-amber-200">
          Le esigenze dichiarate richiedono verifica operativa. Non dedurre
          allergie dalle preferenze. Le modifiche invalidano le prese visione
          precedenti.
        </p>
        <DataTable
          rows={rows}
          cols={[
            { label: "Esigenza", render: (r) => str(r, "label") },
            { label: "Tipo", render: (r) => str(r, "type") },
            { label: "Gravità dichiarata", render: (r) => str(r, "severity") },
            {
              label: "Stato",
              render: (r) => <Badge value={r.verification_status} />,
            },
            { label: "Revisione", render: (r) => str(r, "revision") },
          ]}
        />
        {rows.map((r) => (
          <div key={str(r, "id")}>
            {form(
              "verify_dietary",
              `Verifica: ${str(r, "label")}`,
              [
                select("verification_status", "Esito", [
                  "verified",
                  "needs_clarification",
                ]),
                text("instruction", "Istruzioni operative", false),
              ],
              { id: str(r, "id"), expected_version: str(r, "version") },
            )}
          </div>
        ))}
      </>
    );
  } else if (area === "partners") {
    const [rows, channels] = await Promise.all([
      list("partners"),
      list("channels"),
    ]);
    content = (
      <>
        {isAdmin && (
          <>
            {form("save_partner", "＋ Nuovo partner", [
              text("name", "Nome"),
              select("kind", "Tipo", [
                "tour_operator",
                "ota",
                "hotel",
                "concierge",
                "other",
              ]),
            ])}
            {form("save_channel", "＋ Nuovo canale", [
              text("name", "Nome"),
              select("kind", "Tipo", [
                "direct",
                "phone",
                "partner",
                "ota",
                "email",
              ]),
              await lookup("partner_id", "Partner", "partners", "name", false),
            ])}
          </>
        )}
        <DataTable
          rows={rows}
          cols={[
            { label: "Partner", render: (r) => str(r, "name") },
            { label: "Tipo", render: (r) => str(r, "kind") },
          ]}
        />
        <h2 className="text-xl">Canali · gestione manuale</h2>
        <DataTable
          rows={channels}
          cols={[
            { label: "Canale", render: (r) => str(r, "name") },
            { label: "Tipo", render: (r) => str(r, "kind") },
            { label: "Integrazione", render: () => "Manuale" },
          ]}
        />
      </>
    );
  } else if (area === "finance") {
    const rows = await list("payment_entries");
    content = (
      <>
        <p className="muted">
          Registrazioni contabili manuali. Nessun addebito o rimborso viene
          eseguito su un provider.
        </p>
        <DataTable
          rows={rows}
          cols={[
            {
              label: "Prenotazione",
              render: (r) => (
                <Link
                  className="text-amber-300"
                  href={`${base}/bookings/${str(r, "booking_id")}`}
                >
                  Apri dettaglio →
                </Link>
              ),
            },
            { label: "Tipo", render: (r) => <Badge value={r.kind} /> },
            { label: "Importo", render: (r) => money(str(r, "amount_minor")) },
            { label: "Controparte", render: (r) => str(r, "payer_type") },
            { label: "Metodo", render: (r) => str(r, "method") },
          ]}
        />
      </>
    );
  } else {
    const memberships = await list("organization_memberships");
    const { data: audit, error } = await db.rpc("audit_log", { p_org: org.id });
    if (error) throw new Error("Audit non disponibile");
    content = (
      <>
        <div className="panel">
          <h2 className="text-xl">{org.name}</h2>
          <p className="muted mt-3">
            {org.timezone} · {org.currency} · Comunicazioni manuali
          </p>
          <p className="mt-4 text-sm">
            Inviti: provisioning Supabase Auth e codice Comanda, secondo la
            guida operativa. Nessun invio automatico a clienti.
          </p>
        </div>
        {isAdmin && <InvitationForm slug={slug} owner={roles.includes("owner")}/>}
        {isAdmin &&
          form(
            "set_membership",
            "Modifica ruolo / sospendi membership",
            [
              await lookup(
                "id",
                "Membership",
                "organization_memberships",
                "user_id",
              ),
              number("expected_version", "Versione corrente", "1", 1),
              select("role", "Ruolo", [
                "owner",
                "admin",
                "manager",
                "staff",
                "partner",
              ]),
              select("status", "Stato", ["active", "suspended"]),
            ],
            {},
            { destructive: true },
          )}
        <DataTable
          rows={memberships}
          cols={[
            { label: "Utente", render: (r) => str(r, "user_id") },
            { label: "Stato", render: (r) => str(r, "status") },
            { label: "Versione", render: (r) => str(r, "version") },
          ]}
        />
        <h2 className="text-xl">Audit · ultime 100 operazioni</h2>
        <DataTable
          rows={(audit ?? []) as unknown as Row[]}
          cols={[
            { label: "Data", render: (r) => dateTime(str(r, "created_at")) },
            { label: "Operazione", render: (r) => str(r, "action") },
            { label: "Attore", render: (r) => str(r, "actor_id").slice(0, 8) },
            {
              label: "Campi modificati",
              render: (r) => (r.changed_fields as string[])?.join(", "),
            },
          ]}
        />
      </>
    );
  }
  return (
    <>
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[.18em] muted">
          {org.name} / Back-office
        </p>
        <h1 className="mt-3 text-3xl font-semibold">{labels[area]}</h1>
        <p className="mt-3 muted text-sm">
          {area === "dashboard"
            ? "Persone, prenotazioni e prossime esperienze."
            : id
              ? "Dettaglio operativo · modifiche tracciate"
              : "Dati persistenti della tua organizzazione."}
        </p>
      </header>
      <div className="grid gap-6">{content}</div>
      {!id && !["dashboard", "calendar", "settings"].includes(area) && (
        <nav
          aria-label="Paginazione"
          className="mt-6 flex gap-5 text-sm text-amber-300"
        >
          {page > 1 && <Link href={`?page=${page - 1}`}>← Precedente</Link>}
          <span>Pagina {page}</span>
          <Link href={`?page=${page + 1}`}>Successiva →</Link>
        </nav>
      )}
    </>
  );
}
