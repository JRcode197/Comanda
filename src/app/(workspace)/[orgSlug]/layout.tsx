import Link from "next/link";
import { workspace } from "@/lib/auth/context";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { LiveState } from "@/components/layout/live-state";
import { nav } from "@/features/workspace/view";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { org } = await workspace(orgSlug);
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[230px_1fr]">
      <aside className="border-b border-neutral-700 bg-[#171d18] p-5 lg:sticky lg:top-0 lg:h-screen lg:border-r">
        <Link href="/" className="block text-2xl font-bold text-amber-300">
          ◒ comanda
        </Link>
        <p className="mt-7 text-xs muted">{org.name}</p>
        <nav
          aria-label="Navigazione principale"
          className="mt-5 flex gap-1 overflow-x-auto lg:grid"
        >
          {nav.map((n) => (
            <Link
              key={n.path}
              href={`/${orgSlug}/admin/${n.path}`}
              className="whitespace-nowrap rounded-lg px-3 py-2.5 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white"
            >
              {n.title}
            </Link>
          ))}
        </nav>
        <form action={logout} className="mt-6">
          <Button variant="outline">Esci</Button>
        </form>
      </aside>
      <div className="min-w-0">
        <div className="flex flex-wrap justify-between gap-2 border-b border-neutral-700 px-6 py-4 text-xs muted">
          <span>Workspace / Operatività</span>
          <span>Comunicazioni manuali · {org.timezone}</span>
        </div>
        <LiveState />
        <main id="main" className="mx-auto max-w-[1500px] p-5 md:p-9">
          {children}
        </main>
      </div>
    </div>
  );
}
