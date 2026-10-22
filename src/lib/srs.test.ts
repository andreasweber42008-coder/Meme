import { describe, expect, it } from "vitest";
import { naechsteWiederholung } from "./srs";

describe("Wiedervorlage", () => {
  it("steigt bei richtig und fällt bei falsch zurück", () => {
    const a = naechsteWiederholung(undefined, true, "2027-01-01");
    expect(a).toMatchObject({ fach: 0, faellig: "2027-01-02" });
    const b = naechsteWiederholung(a, true, "2027-01-02");
    expect(b).toMatchObject({ fach: 1, faellig: "2027-01-05" });
    const c = naechsteWiederholung(b, false, "2027-01-05");
    expect(c).toMatchObject({ fach: 0, faellig: "2027-01-06" });
  });

  it("plant nie über den Testtag hinaus", () => {
    const s = naechsteWiederholung({ fach: 5, faellig: "2027-06-01" }, true, "2027-06-20", "2027-07-09");
    expect(s.faellig < "2027-07-09").toBe(true);
  });
});
