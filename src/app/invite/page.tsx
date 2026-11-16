import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
async function accept(form: FormData) {
  "use server";
  const db = await createClient();
  const password = String(form.get("password"));
  if (password.length < 12) redirect("/invite?error=1");
  const { error: passError } = await db.auth.updateUser({ password });
  if (passError) redirect("/invite?error=1");
  const { error } = await db.rpc("accept_invitation", {
    token: String(form.get("token")),
  });
  if (error) redirect("/invite?error=1");
  redirect("/");
}
export default async function Invite({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const q = await searchParams;
  return (
    <main id="main" className="mx-auto max-w-lg p-8">
      <h1 className="text-3xl mb-6">Accetta l’invito</h1>
      <p className="muted mb-6">
        Apri prima il link di autenticazione ricevuto dall’amministratore, poi
        inserisci il codice Comanda.
      </p>
      <form action={accept} className="grid gap-5">
        <label>
          Codice invito
          <input name="token" required autoComplete="off" />
        </label>
        <label>
          Nuova password (almeno 12 caratteri)
          <input
            name="password"
            type="password"
            minLength={12}
            required
            autoComplete="new-password"
          />
        </label>
        {q.error && (
          <p role="alert">Invito non valido, scaduto o sessione mancante.</p>
        )}
        <Button>Attiva accesso</Button>
      </form>
    </main>
  );
}
