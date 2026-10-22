export interface Stufe {
  nr: number;
  name: string;
  beschreibung: string;
}

/** Die 8 Methoden-Stufen jeder Lern-Einheit. Aufsteigen erst bei Beherrschung. */
export const STUFEN: Stufe[] = [
  { nr: 1, name: "Verstehen", beschreibung: "Methoden-Karte lesen und Video schauen." },
  { nr: 2, name: "Vormachen", beschreibung: "Die App löst eine Aufgabe sichtbar Schritt für Schritt." },
  { nr: 3, name: "Einzelschritte", beschreibung: "Kurze Drills für jeweils einen Schritt." },
  { nr: 4, name: "Geführt", beschreibung: "Der nächste Schritt kommt erst, wenn der vorherige erledigt ist." },
  { nr: 5, name: "Teilgeführt", beschreibung: "Die Hilfen werden nach und nach ausgeblendet." },
  { nr: 6, name: "Frei", beschreibung: "Normale Aufgaben; die Methode erscheint nur noch bei Fehlern." },
  { nr: 7, name: "Tempo", beschreibung: "Zeitbudget pro Schritt und Aufgabe." },
  { nr: 8, name: "Ernstfall", beschreibung: "Anwendung unter Testbedingungen." },
];

/** Standard-Beherrschung: 80 % richtig und Schritte eingehalten. */
export const BEHERRSCHUNG = { richtig: 0.8, schritteEingehalten: 0.8 } as const;
