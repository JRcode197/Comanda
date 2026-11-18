import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "./actions";
async function reset(form: FormData) {
  "use server";
  const db = await createClient();
  const password = String(form.get("password"));
  if (password.length < 12) redirect("/reset-password?error=1");
  const { error } = await db.auth.updateUser({ password });
  if (error) redirect("/reset-password?error=1");
  redirect("/");
}
export default async function Reset({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  const q = await searchParams;
  return (
    <main id="main" className="mx-auto max-w-lg p-8">
      <h1 className="text-3xl mb-6">Recupera password</h1>
      {user ? (
        <form action={reset} className="grid gap-5">
          <label>
            Nuova password
            <input
              name="password"
              type="password"
              minLength={12}
              required
              autoComplete="new-password"
            />
          </label>
          {q.error && <p role="alert">Password non aggiornata. Riprova.</p>}
          <Button>Aggiorna password</Button>
        </form>
      ) : (
        <form action={requestPasswordReset} className="grid gap-5 panel">
          <p>
            Inserisci la tua email: se l&apos;account esiste, riceverai un link per
            scegliere una nuova password.
          </p>
          <label>
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </label>
          {q.sent && (
            <p role="status">
              Se l&apos;account esiste, abbiamo inviato il link di recupero.
            </p>
          )}
          <Button>Invia link di recupero</Button>
        </form>
      )}
    </main>
  );
}
