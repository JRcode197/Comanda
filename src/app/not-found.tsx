import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="m-auto max-w-lg p-12">
      <h1 className="text-3xl">Pagina non disponibile</h1>
      <p className="my-5 muted">
        La pagina non esiste o non hai accesso a questo spazio.
      </p>
      <Link href="/" className="text-amber-300">
        Torna ai tuoi spazi
      </Link>
    </main>
  );
}
