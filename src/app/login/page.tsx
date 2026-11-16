import Link from "next/link";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const q = await searchParams;
  return (
    <main id="main" className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-md">
        <p className="mb-16 text-2xl font-bold text-amber-300">◒ comanda</p>
        <p className="muted text-xs uppercase tracking-[.2em]">
          Il tuo spazio operativo
        </p>
        <h1 className="mt-3 text-4xl font-semibold">Bentornato.</h1>
        <p className="mt-4 mb-8 muted">
          Dalle prime richieste all’ultimo ospite.
          <br />
          Tutto pronto per la prossima esperienza.
        </p>
        <form action={login} className="grid gap-5">
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {q.error && (
            <p role="alert" className="text-red-300">
              Accesso non riuscito. Verifica le credenziali o il link di invito.
            </p>
          )}
          <Button type="submit">Accedi a Comanda →</Button>
        </form>
        <p className="mt-6 text-sm muted">
          Accesso riservato agli utenti invitati.
        </p>
        <Link
          href="/reset-password"
          className="mt-3 inline-block text-sm text-amber-300"
        >
          Recupera password
        </Link>
      </section>
    </main>
  );
}
