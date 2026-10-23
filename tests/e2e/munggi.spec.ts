import { expect, test } from "@playwright/test";
import { anmelden, nachgestelltesBackend } from "./hilfen";

async function setzen(page: import("@playwright/test").Page, sammlung: string, id: string, daten: object) {
  await page.evaluate(
    async ([sammlung, id, daten]) => {
      const db = await new Promise<IDBDatabase>((ok) => {
        const r = indexedDB.open("munggi");
        r.onsuccess = () => ok(r.result);
      });
      await new Promise((ok) => {
        const tx = db.transaction("dokumente", "readwrite");
        tx.objectStore("dokumente").put({ sammlung, id, daten, geloescht: false, geaendert: Date.now(), synchron: true });
        tx.oncomplete = ok;
      });
    },
    [sammlung, id, daten] as const,
  );
}

test("Shop: kaufen, anziehen, Munggi reagiert", async ({ page }) => {
  await nachgestelltesBackend(page);
  await anmelden(page);
  await setzen(page, "gamification", "haupt", { xpGesamt: 1000, streakSchutz: 1, abzeichen: [], inventar: ["sennenhut", "brille", "schal", "edelweiss", "alpen"], angezogen: { kopf: "sennenhut", augen: "brille", hals: "schal", hand: "edelweiss", hintergrund: "alpen" } });
  await page.reload();
  await page.goto("/munggi");
  await expect(page.getByText("1000 XP")).toBeVisible();
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/munggi-angezogen.png` });
  // kaufen
  await page.getByRole("button", { name: /120 XP/ }).first().click();
  await expect(page.getByText("880 XP")).toBeVisible();
  await page.getByRole("button", { name: "Munggi antippen" }).click();
  await page.waitForTimeout(300);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/munggi-reaktion.png` });
  await page.getByRole("tab", { name: "Garderobe" }).click();
  await expect(page.getByRole("button", { name: /Zipfelmütze/ })).toHaveAttribute("aria-pressed", "true");
});
