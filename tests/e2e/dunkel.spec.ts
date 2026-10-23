import { expect, test } from "@playwright/test";
import { anmelden, nachgestelltesBackend } from "./hilfen";

test.use({ colorScheme: "dark" });

test("Dunkelmodus: Heute und Lektion lesbar", async ({ page }) => {
  await nachgestelltesBackend(page);
  await anmelden(page);
  await expect(page.locator("html")).toHaveClass(/dark/);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/dunkel-heute.png` });
  await page.goto("/lektion/mednat-ableiten/1");
  await page.getByRole("button", { name: /Verstanden/ }).click();
  await page.goto("/lektion/mednat-ableiten/2");
  await page.getByRole("button", { name: "Nächster Schritt" }).click();
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/dunkel-lektion.png` });
  await page.goto("/statistik");
  await expect(page.getByRole("heading", { name: "Statistik", level: 1 })).toBeVisible();
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/dunkel-statistik.png` });
});
