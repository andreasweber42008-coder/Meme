import { expect, test, type Page, type Route } from "@playwright/test";

const SUPABASE = "http://supabase.test";
const USER_ID = "11111111-1111-1111-1111-111111111111";

function b64url(obj: object) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function sitzung() {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: USER_ID, role: "authenticated", exp, aud: "authenticated" })}.signatur`;
  const user = { id: USER_ID, aud: "authenticated", role: "authenticated", email: "ich@example.com", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  return { access_token: token, token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: "refresh", user };
}

interface Backend {
  registrierungOffen: boolean;
  fortschritt: Array<Record<string, unknown>>;
  upserts: number;
}

async function nachgestelltesBackend(page: Page, start: Partial<Backend> = {}): Promise<Backend> {
  const zustand: Backend = { registrierungOffen: false, fortschritt: [], upserts: 0, ...start };
  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body), headers: { "access-control-allow-origin": "*" } });

  await page.route(`${SUPABASE}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });

    if (url.pathname === "/rest/v1/rpc/registrierung_offen") return json(route, zustand.registrierungOffen);

    if (url.pathname === "/auth/v1/token") {
      const body = req.postDataJSON() as { email: string; password: string };
      if (body.password === "richtig-passwort") return json(route, sitzung());
      return json(route, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" }, 400);
    }
    if (url.pathname === "/auth/v1/signup") return json(route, { code: 500, msg: "Database error saving new user" }, 500);
    if (url.pathname === "/auth/v1/user") return json(route, sitzung().user);
    if (url.pathname === "/auth/v1/logout") return route.fulfill({ status: 204 });

    if (url.pathname === "/rest/v1/rpc/dokumente_speichern") {
      const { eintraege } = req.postDataJSON() as { eintraege: Array<Record<string, unknown>> };
      zustand.upserts++;
      for (const e of eintraege) {
        zustand.fortschritt = zustand.fortschritt.filter((x) => !(x.sammlung === e.sammlung && x.id === e.id));
        zustand.fortschritt.push({ ...e, server_am: new Date().toISOString() });
      }
      return json(route, eintraege.length);
    }
    if (url.pathname === "/rest/v1/dokumente" && req.method() === "GET") return json(route, []);
    return json(route, { message: `nicht nachgestellt: ${req.method()} ${url.pathname}` }, 404);
  });
  return zustand;
}

async function anmelden(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill("ich@example.com");
  await page.getByLabel("Passwort").fill("richtig-passwort");
  await page.getByRole("button", { name: "Los geht's" }).click();
  await expect(page.getByRole("heading", { name: "Hoi!" })).toBeVisible();
}

test("ohne Login landet man auf der Anmeldung, ohne Registrierungs-Tab", async ({ page }) => {
  await nachgestelltesBackend(page);
  await page.goto("/methoden");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Munggi" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Konto einrichten" })).toHaveCount(0);
});

test("falsches Passwort zeigt eine verständliche Meldung", async ({ page }) => {
  await nachgestelltesBackend(page);
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill("ich@example.com");
  await page.getByLabel("Passwort").fill("falsch");
  await page.getByRole("button", { name: "Los geht's" }).click();
  await expect(page.getByRole("alert")).toHaveText("E-Mail oder Passwort stimmt nicht.");
});

test("zweites Konto wird von der Datenbank-Sperre abgewiesen", async ({ page }) => {
  await nachgestelltesBackend(page, { registrierungOffen: true });
  await page.goto("/login");
  await page.getByRole("tab", { name: "Konto einrichten" }).click();
  await page.getByLabel("E-Mail").fill("fremd@example.com");
  await page.getByLabel("Passwort").fill("ein-langes-passwort");
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page.getByRole("alert")).toContainText("Registrierung ist gesperrt");
});

test("Bibliothek: Methode öffnen, Schritte lesen, als verstanden markieren", async ({ page }) => {
  const backend = await nachgestelltesBackend(page);
  await anmelden(page);

  await page.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("link", { name: "Methoden" }).first().click();
  await expect(page.getByRole("heading", { name: "Methoden-Bibliothek" })).toBeVisible();
  for (const gruppe of ["Muster zuordnen", "Objekte im Raum", "Konzentriertes und sorgfältiges Arbeiten", "Übergreifend"]) {
    await expect(page.getByRole("heading", { name: gruppe, exact: true })).toBeVisible();
  }

  await page.getByRole("link", { name: /^Kreuzblick/ }).click();
  await expect(page.getByRole("heading", { name: "Kreuzblick", level: 1 })).toBeVisible();
  await expect(page.locator("section[aria-labelledby=schritte] ol > li")).toHaveCount(7);
  await expect(page.getByText("53 s pro Aufgabe (18 Aufgaben in 16 Min.)").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Video laden/ })).toHaveCount(2);

  await page.getByRole("button", { name: "Methode verstanden" }).click();
  await expect(page.getByText("Stark! Stufe 1 «Verstehen» erledigt.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Verstanden – zurücksetzen" })).toBeVisible();
  await expect.poll(() => backend.upserts, { timeout: 8000 }).toBeGreaterThanOrEqual(1);
  expect(backend.fortschritt.find((d) => d.sammlung === "fortschritt" && d.id === "kreuzblick")).toBeTruthy();
});

test("Fakten-Methode zeigt beide Varianten W1 mit Entscheidung", async ({ page }) => {
  await nachgestelltesBackend(page);
  await anmelden(page);
  await page.goto("/methoden/fakten-loci");
  const w1 = page.locator("div.rounded-2xl", { has: page.getByText("W1: Fakten lernen: Loci oder Mini-Geschichte?") });
  await expect(w1).toBeVisible();
  await expect(w1.getByText("Variante a", { exact: true })).toBeVisible();
  await expect(w1.getByText("Variante b", { exact: true })).toBeVisible();
  await expect(w1.getByText("gewählt", { exact: true })).toHaveCount(1);
});

test("keine horizontale Scrollleiste auf dem Handy", async ({ page }, info) => {
  test.skip(info.project.name !== "handy");
  await nachgestelltesBackend(page);
  await anmelden(page);
  for (const pfad of ["/", "/methoden", "/methoden/objekte-im-raum", "/methoden/quanti-drei-runden"]) {
    await page.goto(pfad);
    await page.waitForLoadState("networkidle");
    const breit = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(breit, pfad).toBe(false);
  }
});
