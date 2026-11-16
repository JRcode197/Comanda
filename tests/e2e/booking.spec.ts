import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import f from "../fixtures.json";
const password = "Comanda-Test-Only-2026!";
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("owner.a@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Accedi a Comanda" }).click();
  await page.getByRole("link", { name: "Officina del Gusto" }).click();
  await expect(
    page.getByRole("heading", { name: "La giornata, sotto controllo." }),
  ).toBeVisible();
}
async function openForm(page: Page, title: string) {
  const box = page
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: title }) });
  await box.locator("summary").click();
  return box;
}
async function createRequest(page: Page, reference: string, mode: string) {
  await page.goto("/officina/admin/requests");
  const form = await openForm(page, "Nuova richiesta");
  await form.getByLabel("Referente", { exact: true }).selectOption(f.a_contact);
  await form.getByLabel("Canale", { exact: true }).selectOption(f.a_channel);
  await form
    .getByLabel("Esperienza desiderata")
    .selectOption(mode === "private" ? f.a_private : f.a_shared);
  await form.getByLabel("Adulti", { exact: true }).fill("2");
  await form.getByLabel("Bambini", { exact: true }).fill("0");
  await form.getByLabel("Riferimento esterno").fill(reference);
  await form.getByRole("button", { name: "Salva", exact: true }).click();
  await expect(form.getByRole("status")).toBeVisible();
  await form.getByRole("link", { name: "Apri dettaglio" }).click();
  await page.waitForURL(/\/requests\/[a-f0-9-]{36}$/);
  return page.url().split("/").at(-1)!;
}
for (const mode of ["shared", "private"])
  test(`Richiesta → servizio → incarico accettato → conferma (${mode})`, async ({
    page,
  }) => {
    await login(page);
    const ref = `E2E-${mode}-${Date.now()}`;
    const requestId = await createRequest(page, ref, mode);
    await page.goto("/officina/admin/services");
    const serviceForm = await openForm(page, "Nuovo servizio");
    await serviceForm
      .getByLabel("Esperienza", { exact: true })
      .selectOption(mode === "private" ? f.a_private : f.a_shared);
    await serviceForm
      .getByLabel("Sede", { exact: true })
      .selectOption(f.a_location);
    await serviceForm
      .getByLabel("Inizio (ISO")
      .fill(
        mode === "private"
          ? "2029-06-11T10:00:00+02:00"
          : "2029-06-10T10:00:00+02:00",
      );
    await serviceForm.getByLabel("Capienza", { exact: true }).fill("12");
    await serviceForm
      .getByRole("button", { name: "Salva", exact: true })
      .click();
    await expect(serviceForm.getByRole("status")).toBeVisible();
    await serviceForm.getByRole("link", { name: "Apri dettaglio" }).click();
    await page.waitForURL(/\/services\/[a-f0-9-]{36}$/);
    const serviceId = page.url().split("/").at(-1)!;
    const assign = await openForm(page, "Proponi incarico");
    await assign
      .getByLabel("Staff", { exact: true })
      .selectOption(f.a_owner_staff);
    await assign.getByLabel("Mansione").selectOption("chef");
    await assign.getByRole("button", { name: "Salva", exact: true }).click();
    await expect(assign.getByRole("status")).toBeVisible();
    const respond = await openForm(page, "Rispondi al tuo incarico");
    await respond.getByLabel("Risposta").selectOption("accepted");
    await respond.getByRole("button", { name: "Salva", exact: true }).click();
    await expect(respond.getByRole("status")).toBeVisible();
    await page.goto(`/officina/admin/requests/${requestId}`);
    const confirm = await openForm(page, "Conferma richiesta");
    await confirm
      .getByLabel("Servizio", { exact: true })
      .selectOption(serviceId);
    await confirm
      .getByRole("button", { name: "Conferma prenotazione" })
      .click();
    await expect(
      page.getByRole("link", { name: "Apri prenotazione generata" }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Apri prenotazione generata" })
      .click();
    await expect(page.getByText("Confermata", { exact: true })).toBeVisible();
    await expect(
      page
        .getByText(mode === "private" ? "600,00 €" : "170,00 €", {
          exact: true,
        })
        .first(),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByText("Confermata", { exact: true })).toBeVisible();
    if (mode === "private") {
      const other = await createRequest(page, `${ref}-second`, mode);
      await page.goto(`/officina/admin/requests/${other}`);
      const second = await openForm(page, "Conferma richiesta");
      await second
        .getByLabel("Servizio", { exact: true })
        .selectOption(serviceId);
      await second
        .getByRole("button", { name: "Conferma prenotazione" })
        .click();
      await expect(second.getByRole("alert")).toContainText(
        "Capienza insufficiente",
      );
    }
  });
test("Accesso protetto, mobile 390px e scritture offline disabilitate", async ({
  page,
  context,
}) => {
  await page.goto("/officina/admin/bookings");
  await expect(page).toHaveURL(/login/);
  await login(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/officina/admin/guests");
  const form = await openForm(page, "Nuovo referente");
  await context.setOffline(true);
  await expect(page.getByRole("alert").filter({hasText:"Sei offline"})).toContainText("Sei offline");
  await expect(
    form.getByRole("button", { name: "Salva", exact: true }),
  ).toBeDisabled();
  await context.setOffline(false);
  await page.goto("/altro-tenant/admin/guests");
  await expect(
    page.getByRole("heading", { name: "Pagina non disponibile" }),
  ).toBeVisible();
});
test("Staff autenticato escluso dal back-office e REST prezzi protetta", async () => {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { error } = await db.auth.signInWithPassword({
    email: "chef.a@example.test",
    password,
  });
  expect(error).toBeNull();
  const rows = await db.from("booking_financials").select("*");
  expect(rows.error).toBeNull();
  expect(rows.data).toEqual([]);
  await db.auth.signOut();
});
