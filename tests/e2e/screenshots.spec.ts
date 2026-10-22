import { test } from "@playwright/test";

// Nur für die visuelle Prüfung: SHOTS=<Ordner> npx playwright test screenshots --project handy
const ziel = process.env.SHOTS;
test.skip(!ziel, "nur mit SHOTS");
for (const schema of ["light", "dark"] as const) {
  test(`Bildschirme ${schema}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: schema });
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const b = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const user = { id: "11111111-1111-1111-1111-111111111111", aud: "authenticated", role: "authenticated", email: "ich@example.com" };
    const session = { access_token: `${b({ alg: "HS256" })}.${b({ sub: user.id, exp })}.s`, token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: "r", user };
    await page.route("http://supabase.test/**", (route) => {
      const u = new URL(route.request().url());
      const body = u.pathname.includes("token") ? session : u.pathname.includes("/user") ? user : u.pathname.includes("rpc") ? false : u.pathname.includes("fortschritt") ? [{ methode_id: "kreuzblick", verstanden_am: new Date().toISOString() }] : {};
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.goto("/login");
    await page.screenshot({ path: `${ziel}/${schema}-1-login.png` });
    await page.getByLabel("E-Mail").fill("ich@example.com");
    await page.getByLabel("Passwort").fill("x");
    await page.getByRole("button", { name: "Los geht's" }).click();
    await page.getByRole("heading", { name: "Hoi!" }).waitFor();
    await page.screenshot({ path: `${ziel}/${schema}-2-start.png` });
    await page.goto("/methoden");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${ziel}/${schema}-3-bibliothek.png` });
    await page.goto("/methoden/fakten-loci");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${ziel}/${schema}-4-detail-oben.png` });
    await page.getByRole("heading", { name: "Schritte" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${ziel}/${schema}-5-schritte.png` });
    await page.getByText("W1: Fakten lernen").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${ziel}/${schema}-6-varianten.png` });
  });
}
