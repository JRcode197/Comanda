"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="m-auto max-w-lg p-12">
      <h1 className="text-3xl">Non siamo riusciti a caricare i dati</h1>
      <p className="my-5 muted">
        Controlla la connessione e riprova. Nessuna conferma è stata simulata.
      </p>
      <Button onClick={reset}>Riprova</Button>
    </main>
  );
}
