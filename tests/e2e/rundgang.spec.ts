import { expect, test, type Page } from "@playwright/test";
import { anmelden, nachgestelltesBackend } from "./hilfen";

const ziel = process.env.SHOTS;

async function bild(page: Page, name: string) {
  if (ziel) await page.screenshot({ path: `${ziel}/${test.info().project.name}-${name}.png`, fullPage: true });
}

async function keinQuerscroll(page: Page, pfad: string) {
  if (test.info().project.name !== "handy") return;
  const breit = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(breit, pfad).toBe(false);
}

test("Onboarding führt zum Einstufungstest", async ({ page }) => {
  await nachgestelltesBackend(page, { eingerichtet: false });
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill("ich@example.com");
  await page.getByLabel("Passwort").fill("richtig-passwort");
  await page.getByRole("button", { name: "Los geht's" }).click();
  await expect(page.getByRole("heading", { name: "Hoi, ich bin Munggi!" })).toBeVisible();
  await bild(page, "onboarding-1");
  await page.getByRole("button", { name: "Weiter" }).click();
  await expect(page.getByText("Freitag der KW 27")).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByLabel("Fach").fill("Mathematik");
  await page.getByLabel("Datum der Prüfung").fill("2027-05-20");
  await page.getByRole("button", { name: "Prüfung hinzufügen" }).click();
  await expect(page.getByText("Mathematik")).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();
  await bild(page, "onboarding-4");
  await keinQuerscroll(page, "onboarding");
  await page.getByRole("button", { name: /Zum Einstufungstest/ }).click();
  await expect(page.getByRole("heading", { name: "Einstufungstest" })).toBeVisible();
  await page.getByRole("button", { name: "Starten" }).click();
  await expect(page.getByRole("heading", { name: "Figuren lernen" })).toBeVisible();
  await bild(page, "einstufung-figuren");
});

test("Heute, Pfad, Plan, Fehlerheft, Statistik und Einstellungen", async ({ page }) => {
  await nachgestelltesBackend(page);
  await anmelden(page);
  await expect(page.getByText(/Heute ·/)).toBeVisible();
  await bild(page, "heute");
  await keinQuerscroll(page, "/");
  for (const [pfad, titel] of [
    ["/pfad", "Lernpfad"],
    ["/woche", "Plan"],
    ["/ueben", "Üben"],
    ["/fehlerheft", "Fehlerheft"],
    ["/statistik", "Statistik"],
    ["/einstellungen", "Einstellungen"],
    ["/offiziell", "Offizielles"],
    ["/mehr", "Mehr"],
    ["/konz/druck", "Konz auf Papier"],
  ] as const) {
    await page.goto(pfad);
    await expect(page.getByRole("heading", { name: titel, exact: true, level: 1 })).toBeVisible();
    await bild(page, pfad.slice(1).replace(/\//g, "-"));
    await keinQuerscroll(page, pfad);
  }
});

test("Lektion Quanti: Vormachen, dann Einzelschritte", async ({ page }) => {
  await nachgestelltesBackend(page);
  await anmelden(page);
  await page.goto("/lektion/quanti-drei-runden/1");
  await page.getByRole("button", { name: /Verstanden – weiter zu Stufe 2/ }).click();
  await page.goto("/lektion/quanti-drei-runden/2");
  await expect(page.getByText("Munggi löst vor")).toBeVisible();
  for (let i = 0; i < 8; i++) {
    const n = page.getByRole("button", { name: "Nächster Schritt" });
    if (!(await n.isVisible())) break;
    await n.click();
  }
  await bild(page, "lektion-vormachen");
  await keinQuerscroll(page, "lektion");
  await page.getByRole("button", { name: "Abschliessen" }).click();
  await expect(page.getByText("Stufe 3 freigeschaltet!")).toBeVisible();
  await page.getByRole("link", { name: "Weiter zu Stufe 3" }).click();
  await expect(page.getByText(/Schritt \d/).first()).toBeVisible();
  await bild(page, "lektion-einzelschritte");
});

test("Objekte im Raum: 3D-Szene und Antwort mit Fehleranalyse", async ({ page }) => {
  await nachgestelltesBackend(page);
  await anmelden(page);
  // Fortschritt direkt auf Stufe 6 setzen (über die Oberfläche wäre es ein langer Weg)
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((ok) => {
      const r = indexedDB.open("munggi");
      r.onsuccess = () => ok(r.result);
    });
    await new Promise((ok) => {
      const tx = db.transaction("dokumente", "readwrite");
      tx.objectStore("dokumente").put({ sammlung: "fortschritt", id: "objekte-im-raum", daten: { stufe: 6 }, geloescht: false, geaendert: Date.now(), synchron: true });
      tx.oncomplete = ok;
    });
  });
  await page.reload();
  await page.goto("/lektion/objekte-im-raum/6");
  await expect(page.getByText("Vorher")).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.getByRole("radio").first().click();
  await page.getByRole("button", { name: "Prüfen" }).click();
  await expect(page.getByText(/Richtig|Richtig wäre/).first()).toBeVisible();
  await bild(page, "objekte");
});

test("Konz: Einzelentscheide in Stufe 3", async ({ page }) => {
  await nachgestelltesBackend(page);
  await anmelden(page);
  await page.goto("/lektion/konz-zeilenweise/1");
  await page.getByRole("button", { name: /Verstanden/ }).click();
  await page.goto("/lektion/konz-zeilenweise/2");
  await page.getByRole("button", { name: "Los" }).click();
  await bild(page, "konz-vormachen");
  await page.getByRole("button", { name: "Verstanden" }).click();
  await expect(page.getByText("Stufe 3 freigeschaltet!")).toBeVisible();
});
