import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ access?: string }>;
}) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data: orgs, error } = await db
    .from("organizations")
    .select("id,name,slug");
  if (error) throw new Error("Accesso non verificabile");
  const q = await searchParams;
  return (
    <main id="main" className="mx-auto max-w-xl p-8">
      <p className="text-amber-300 text-2xl font-bold">◒ comanda</p>
      <h1 className="mt-12 mb-6 text-3xl">I tuoi spazi</h1>
      {q.access && (
        <p role="alert" className="panel mb-6">
          Questo account non dispone di accesso al back-office. I portali staff
          e partner saranno disponibili nello Step 3.
        </p>
      )}
      <div className="grid gap-3">
        {orgs?.map((org) => (
          <Link
            className="panel hover:border-amber-300"
            key={org.id}
            href={`/${org.slug}/admin/dashboard`}
          >
            {org.name} →
          </Link>
        ))}
      </div>
      {!orgs?.length && (
        <p className="panel">
          Nessuna membership attiva. Apri un invito valido o contatta
          l’amministratore.
        </p>
      )}
      <form action={logout} className="mt-8">
        <Button variant="outline">Esci</Button>
      </form>
    </main>
  );
}
