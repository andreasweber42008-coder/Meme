import { expect, type Page, type Route } from "@playwright/test";

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

export interface Backend {
  registrierungOffen: boolean;
  fortschritt: Array<Record<string, unknown>>;
  upserts: number;
  /** Einstellungen mit erledigtem Onboarding vom Server liefern */
  eingerichtet: boolean;
}

export async function nachgestelltesBackend(page: Page, start: Partial<Backend> = {}): Promise<Backend> {
  const zustand: Backend = { registrierungOffen: false, fortschritt: [], upserts: 0, eingerichtet: true, ...start };
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
    if (url.pathname === "/rest/v1/dokumente" && req.method() === "GET") {
      // Erster Abruf (Cursor 1970): eingerichtetes Konto liefern
      const erster = (url.searchParams.get("server_am") ?? "").includes("1970");
      const zeit = "2026-01-01T00:00:00.000Z";
      return json(
        route,
        zustand.eingerichtet && erster
          ? [{ sammlung: "einstellungen", id: "haupt", daten: { onboardingFertig: true, einstufungFertig: true }, geloescht: false, geaendert_am: zeit, server_am: zeit }]
          : [],
      );
    }
    return json(route, { message: `nicht nachgestellt: ${req.method()} ${url.pathname}` }, 404);
  });
  return zustand;
}

export async function anmelden(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill("ich@example.com");
  await page.getByLabel("Passwort").fill("richtig-passwort");
  await page.getByRole("button", { name: "Los geht's" }).click();
  await expect(page.getByText(/bis zum EMS/)).toBeVisible();
}

