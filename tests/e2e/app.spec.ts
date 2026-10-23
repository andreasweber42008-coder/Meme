import { expect, test } from "@playwright/test";
import { anmelden, nachgestelltesBackend } from "./hilfen";

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

  await page.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("link", { name: "Mehr" }).first().click();
  await page.getByRole("link", { name: "Methoden-Bibliothek" }).click();
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
