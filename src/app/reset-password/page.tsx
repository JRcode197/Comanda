import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  searchParams: Promise<{ error?: string }>;
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
        <p className="panel">
          Richiedi all’amministratore un link di recupero. Gli invii automatici
          non sono ancora attivi.
        </p>
      )}
    </main>
  );
}
