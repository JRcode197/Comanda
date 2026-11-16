"use server";
import { revalidatePath } from "next/cache";
import { workspace } from "@/lib/auth/context";
import { z } from "zod";
const errors: Record<string, string> = {
  FORBIDDEN: "Non sei autorizzato a eseguire questa operazione.",
  CAPACITY_EXCEEDED: "Capienza insufficiente o servizio privato già occupato.",
  STAFF_REQUIRED:
    "Manca la copertura staff accettata. Assegna lo staff prima di confermare.",
  STAFF_UNAVAILABLE: "Lo staff non è disponibile in questo intervallo.",
  QUALIFICATION_REQUIRED: "Qualifica richiesta non presente.",
  LANGUAGE_REQUIRED: "Lingua richiesta non presente.",
  VERSION_CONFLICT:
    "Il record è cambiato. Aggiorna la pagina prima di riprovare.",
  IDEMPOTENCY_MISMATCH:
    "Questo tentativo è già stato usato con dati diversi. Riapri il modulo.",
  HOLD_EXPIRED: "L’opzione è scaduta. Crea una nuova richiesta.",
  REQUEST_ALREADY_PROCESSED: "La richiesta è già stata elaborata.",
  RATE_NOT_FOUND: "Manca una tariffa valida per data, categoria o partner.",
  DIETARY_REVIEW_REQUIRED:
    "Verifica le esigenze alimentari dichiarate prima di confermare.",
  PARTICIPANT_REMOVAL_REQUIRES_REVIEW:
    "La riduzione rimuoverebbe un ospite con dati raccolti. Richiede revisione esplicita.",
  LAST_OWNER: "Non puoi rimuovere o sospendere l’ultimo owner.",
  OWNER_REQUIRED: "Questa modifica richiede il ruolo owner.",
  ONLY_ASSIGNEE: "Solo l’assegnatario può accettare o rifiutare.",
  DIETARY_CONTRADICTION:
    "Sono presenti esigenze alimentari: non puoi dichiarare “nessuna”.",
  RELEASE_ASSIGNMENTS_FIRST: "Rilascia prima gli incarichi sovrapposti.",
  CONFIRM_PARTICIPANT_REMOVAL:
    "Conferma esplicitamente la rimozione dei partecipanti provvisori.",
};
export type CommandState = {
  error?: string;
  success?: string;
  result?: string;
};
export async function submitCommand(
  slug: string,
  operation: string,
  key: string,
  _previous: CommandState,
  form: FormData,
): Promise<CommandState> {
  const { db, org } = await workspace(slug);
  const payload: Record<string, string | boolean> = {};
  for (const [name, value] of form.entries()) {
    if (name.startsWith("$ACTION_")) continue;
    if (typeof value !== "string" || value.length > 4000)
      return { error: "Valore non valido o troppo lungo." };
    if (value !== "") payload[name] = value;
  }
  if (
    !z
      .string()
      .regex(/^[a-z_]+$/)
      .max(60)
      .safeParse(operation).success
  )
    return { error: "Operazione non valida." };
  const { data, error } = await db.rpc("command", {
    p_org: org.id,
    p_operation: operation,
    p_payload: payload,
    p_key: key,
  });
  if (error)
    return {
      error:
        errors[error.message] ??
        (error.code === "23P01"
          ? "Intervallo già occupato: esiste una sovrapposizione."
          : error.code === "23503"
            ? "Il riferimento non appartiene a questa organizzazione."
            : "Operazione non riuscita. Verifica i campi e aggiorna i dati prima di riprovare."),
    };
  revalidatePath(`/${slug}/admin`, "layout");
  return {
    success: "Operazione salvata. Comunicazione da effettuare manualmente.",
    result: data,
  };
}
