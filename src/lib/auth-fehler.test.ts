import { describe, expect, it } from "vitest";
import { authFehlerText } from "./auth-fehler";

describe("authFehlerText", () => {
  it("erkennt die Ein-Konto-Sperre aus dem Datenbank-Trigger", () => {
    expect(authFehlerText("Database error saving new user")).toContain("gesperrt");
    expect(authFehlerText("Registrierung gesperrt: Diese App hat bereits ein Konto.")).toContain("gesperrt");
    expect(authFehlerText("Signups not allowed for this instance")).toContain("gesperrt");
  });

  it("übersetzt falsche Anmeldedaten", () => {
    expect(authFehlerText("Invalid login credentials")).toBe("E-Mail oder Passwort stimmt nicht.");
  });

  it("hat eine Rückfallmeldung", () => {
    expect(authFehlerText(undefined)).toMatch(/nochmals/);
  });
});
