"use client";
import { useActionState, useEffect, useState, useId } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { submitCommand, type CommandState } from "./commands";
export type Field = {
  name: string;
  label: string;
  type?: string;
  value?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
};
export function CommandForm({
  slug,
  operation,
  title,
  fields,
  hidden = {},
  button = "Salva",
  destructive = false,
  resultPath,
}: {
  slug: string;
  operation: string;
  title: string;
  fields: Field[];
  hidden?: Record<string, string>;
  button?: string;
  destructive?: boolean;
  resultPath?: string;
}) {
  const formId = useId();
  const [key] = useState(() => crypto.randomUUID());
  const [offline, setOffline] = useState(false);
  const [state, action, pending] = useActionState(
    submitCommand.bind(null, slug, operation, key),
    {} as CommandState,
  );
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("offline", update);
    window.addEventListener("online", update);
    return () => {
      window.removeEventListener("offline", update);
      window.removeEventListener("online", update);
    };
  }, []);
  return (
    <details className="panel">
      <summary className="font-semibold text-base">{title}</summary>
      <form
        action={action}
        className="mt-5 grid gap-4"
        onSubmit={(e) => {
          if (!navigator.onLine) e.preventDefault();
        }}
      >
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((f) => (
            <div className="grid gap-1.5" key={f.name}>
              <label htmlFor={`${formId}-${f.name}`}>{f.label}</label>
              {f.options ? (
                <select
                  id={`${formId}-${f.name}`}
                  name={f.name}
                  defaultValue={f.value ?? ""}
                  required={f.required !== false}
                >
                  <option value="">Seleziona…</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`${formId}-${f.name}`}
                  name={f.name}
                  type={f.type ?? "text"}
                  defaultValue={f.value}
                  min={f.min}
                  max={f.max}
                  placeholder={f.placeholder}
                  required={f.required !== false}
                  maxLength={4000}
                />
              )}
            </div>
          ))}
        </div>
        {destructive && (
          <label className="flex items-center gap-3">
            <input type="checkbox" required />
            Confermo l’operazione e le sue conseguenze.
          </label>
        )}
        {state.error && (
          <p role="alert" className="text-red-300">
            {state.error}
          </p>
        )}
        {state.success && (
          <p role="status" className="text-emerald-300">
            {state.success}{" "}
            {resultPath && state.result && (
              <Link
                className="underline"
                href={`/${slug}/admin/${resultPath}/${state.result}`}
              >
                Apri dettaglio →
              </Link>
            )}
          </p>
        )}
        <div>
          <Button
            type="submit"
            variant={destructive ? "destructive" : "default"}
            disabled={pending || offline || !!state.success}
          >
            {pending ? "Salvataggio…" : button}
          </Button>
        </div>
      </form>
    </details>
  );
}
