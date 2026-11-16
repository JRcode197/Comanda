import "server-only";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function workspace(slug: string) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data: org, error } = await db
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error("Impossibile verificare l’accesso. Riprova.");
  if (!org) notFound();
  const { data: membership } = await db
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", org.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();
  if (!membership) notFound();
  const { data: roles } = await db
    .from("membership_roles")
    .select("role")
    .eq("membership_id", membership.id)
    .eq("organization_id", org.id);
  if (!roles?.some((r) => ["owner", "admin", "manager"].includes(r.role)))
    redirect("/?access=restricted");
  return { db, org, user, roles: roles.map((r) => r.role) };
}
