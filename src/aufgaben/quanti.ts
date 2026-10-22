import { Zufall } from "@/lib/zufall";
import { grundpruefung, type EinzelGenerator, type Option } from "./typen";

/** Die 7 Aufgabentypen nach Milan (Quanti 100 %). */
export const QUANTI_TYPEN = [
  "Prozentrechnung",
  "Mischungen",
  "Funktionen/Formeln",
  "Proportionalitäten",
  "Dreisatz",
  "Einheitenrechnung",
  "Potenzen",
] as const;
export type QuantiTyp = (typeof QUANTI_TYPEN)[number];

export interface QuantiDaten {
  typ: QuantiTyp;
  text: string;
  frage: string;
  einheit?: string;
}

/** Schweizer Schreibweise: Dezimalkomma, Apostroph als Tausendertrennzeichen. */
export function zahl(wert: number, stellen = 2): string {
  const gerundet = Math.round(wert * 10 ** stellen) / 10 ** stellen;
  const [ganz, dez] = Math.abs(gerundet).toString().split(".");
  const gruppiert = ganz.replace(/\B(?=(\d{3})+(?!\d))/g, "’");
  return `${gerundet < 0 ? "−" : ""}${gruppiert}${dez ? "," + dez : ""}`;
}

function zehnerpotenz(m: number, e: number): string {
  const hoch = String(e)
    .replace("-", "⁻")
    .split("")
    .map((c) => ({ "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "⁻": "⁻" })[c] ?? c)
    .join("");
  return `${zahl(m)} · 10${hoch}`;
}

interface Entwurf {
  typ: QuantiTyp;
  text: string;
  frage: string;
  richtig: string;
  falsch: Array<{ text: string; denkfehler: string; schritt: number }>;
  ansatz: string;
  falscheAnsaetze: string[];
  schaetzung: [string, string[]];
  weg: string[];
}

type Vorlage = (z: Zufall, s: number) => Entwurf;

const W1 = 1; // Schritt 1: Typ zuordnen (inkl. passendes Werkzeug)
const W4 = 4; // Schritt 4: Schätzen & Ausschliessen

const VORLAGEN: Vorlage[] = [
  // ---------- Prozentrechnung: «um X %» vs. «auf X %»
  (z, s) => {
    const preis = z.waehle([40, 60, 80, 120, 150, 240]);
    const p = s >= 3 ? z.waehle([15, 25, 35, 45]) : z.waehle([10, 20, 30, 50]);
    const neu = preis * (1 + p / 100);
    return {
      typ: "Prozentrechnung",
      text: `Eine Packung eines Medikaments kostet ${zahl(preis)} Franken. Der Preis wird um ${p} % erhöht.`,
      frage: "Wie viel kostet die Packung danach?",
      richtig: `${zahl(neu)} Franken`,
      falsch: [
        { text: `${zahl((preis * p) / 100)} Franken`, denkfehler: "«auf X %» statt «um X %» gerechnet (nur der Zuschlag).", schritt: W1 },
        { text: `${zahl(preis * (1 - p / 100))} Franken`, denkfehler: "Richtung verwechselt: abgezogen statt dazugezählt.", schritt: W1 },
        { text: `${zahl(preis + p)} Franken`, denkfehler: "Prozent als Franken addiert.", schritt: W4 },
        { text: `${zahl(preis * (1 + p / 10))} Franken`, denkfehler: "Kommafehler beim Faktor (×1,p statt ×1,0p).", schritt: W4 },
      ],
      ansatz: `${zahl(preis)} · ${zahl(1 + p / 100)}`,
      falscheAnsaetze: [`${zahl(preis)} · ${zahl(p / 100)}`, `${zahl(preis)} · ${zahl(1 - p / 100)}`, `${zahl(preis)} + ${p}`],
      schaetzung: [`etwas mehr als ${zahl(preis)} Franken`, [`weniger als ${zahl(preis)} Franken`, `rund das Doppelte`, `unter 50 Franken`]],
      weg: [`Typ: Prozentrechnung – «um ${p} %» heisst ×(1 + ${p}/100) = ×${zahl(1 + p / 100)}.`, `${zahl(preis)} · ${zahl(1 + p / 100)} = ${zahl(neu)}.`],
    };
  },
  // ---------- Prozentrechnung: Prozentpunkte vs. Prozent
  (z) => {
    const a = z.waehle([10, 20, 25, 40]);
    const faktor = z.waehle([1.5, 1.2, 1.4, 1.6]);
    const b = a * faktor;
    const anstieg = (faktor - 1) * 100;
    return {
      typ: "Prozentrechnung",
      text: `In einer Klinik lag der Anteil der ambulant behandelten Fälle bei ${zahl(a)} %. Ein Jahr später sind es ${zahl(b)} %.`,
      frage: "Um wie viel Prozent ist der Anteil gestiegen?",
      richtig: `um ${zahl(anstieg)} %`,
      falsch: [
        { text: `um ${zahl(b - a)} %`, denkfehler: "Prozentpunkte mit Prozent verwechselt.", schritt: W1 },
        { text: `um ${zahl(faktor * 100)} %`, denkfehler: "Faktor statt Zunahme genommen (auf statt um).", schritt: W1 },
        { text: `um ${zahl(((b - a) / b) * 100)} %`, denkfehler: "Falsche Bezugsgrösse: durch den neuen statt den alten Wert geteilt.", schritt: W4 },
        { text: `um ${zahl(anstieg / 10)} %`, denkfehler: "Kommafehler beim Umrechnen in Prozent.", schritt: W4 },
      ],
      ansatz: `(${zahl(b)} − ${zahl(a)}) / ${zahl(a)}`,
      falscheAnsaetze: [`${zahl(b)} − ${zahl(a)}`, `${zahl(b)} / ${zahl(a)}`, `(${zahl(b)} − ${zahl(a)}) / ${zahl(b)}`],
      schaetzung: [`zwischen ${zahl(anstieg - 10)} und ${zahl(anstieg + 10)} %`, ["unter 5 %", "über 100 %", `genau ${zahl(b - a)} %`]],
      weg: [`Typ: Prozentrechnung – Zunahme relativ zum Ausgangswert.`, `(${zahl(b)} − ${zahl(a)}) / ${zahl(a)} = ${zahl(faktor - 1)} → ${zahl(anstieg)} %.`, `${zahl(b - a)} sind Prozentpunkte, nicht Prozent.`],
    };
  },
  // ---------- Prozentrechnung: Grundwert nach Reduktion
  (z) => {
    const p = z.waehle([20, 25, 40, 50]);
    const alt = z.waehle([80, 120, 160, 200, 240]);
    const neu = alt * (1 - p / 100);
    return {
      typ: "Prozentrechnung",
      text: `Nach einer Senkung um ${p} % beträgt die Tagesdosis eines Präparats noch ${zahl(neu)} mg.`,
      frage: "Wie hoch war die Tagesdosis vor der Senkung?",
      richtig: `${zahl(alt)} mg`,
      falsch: [
        { text: `${zahl(neu * (1 + p / 100))} mg`, denkfehler: "Prozent vom neuen statt vom alten Wert zurückgerechnet.", schritt: W1 },
        { text: `${zahl(neu + p)} mg`, denkfehler: "Prozent als Milligramm addiert.", schritt: W4 },
        { text: `${zahl(neu * (1 - p / 100))} mg`, denkfehler: "Nochmals gesenkt statt zurückgerechnet.", schritt: W1 },
        { text: `${zahl(neu / (p / 100))} mg`, denkfehler: "Durch den Senkungsanteil statt durch den Restanteil geteilt.", schritt: W1 },
      ],
      ansatz: `${zahl(neu)} / ${zahl(1 - p / 100)}`,
      falscheAnsaetze: [`${zahl(neu)} · ${zahl(1 + p / 100)}`, `${zahl(neu)} · ${zahl(1 - p / 100)}`, `${zahl(neu)} + ${p}`],
      schaetzung: [`mehr als ${zahl(neu)} mg`, [`weniger als ${zahl(neu)} mg`, "unter 10 mg", "über 10’000 mg"]],
      weg: [`Typ: Prozentrechnung – nach der Senkung bleiben ${100 - p} % = ×${zahl(1 - p / 100)}.`, `Zurück: ${zahl(neu)} / ${zahl(1 - p / 100)} = ${zahl(alt)} mg.`],
    };
  },
  // ---------- Mischungen: Teile
  (z, s) => {
    const k = z.waehle(s >= 3 ? [3, 4, 5, 7, 9] : [1, 3, 4]);
    const teil = z.waehle([10, 20, 25, 30, 40]);
    const gesamt = teil * (k + 1);
    return {
      typ: "Mischungen",
      text: `Eine Infusionslösung wird aus Wirkstoff und Kochsalzlösung im Verhältnis 1 : ${k} gemischt. Insgesamt entstehen ${zahl(gesamt)} ml.`,
      frage: "Wie viel Milliliter Wirkstoff enthält die Lösung?",
      richtig: `${zahl(teil)} ml`,
      falsch: [
        { text: `${zahl(gesamt / k)} ml`, denkfehler: "Verhältnis nicht in Teile zerlegt: durch k statt durch k + 1 geteilt.", schritt: W1 },
        { text: `${zahl(teil * k)} ml`, denkfehler: "Kochsalzlösung statt Wirkstoff berechnet – am Ende nicht genau gelesen.", schritt: W1 },
        { text: `${zahl(gesamt / (k + 2))} ml`, denkfehler: "Teile falsch gezählt.", schritt: W1 },
        { text: `${zahl(gesamt * k)} ml`, denkfehler: "Multipliziert statt geteilt – Grössenordnung nicht geprüft.", schritt: W4 },
      ].filter((f) => f.text !== `${zahl(teil)} ml`),
      ansatz: `${zahl(gesamt)} / ${k + 1}`,
      falscheAnsaetze: [`${zahl(gesamt)} / ${k}`, `${zahl(gesamt)} · ${k}`, `${zahl(gesamt)} − ${k}`],
      schaetzung: [`kleiner als die Hälfte von ${zahl(gesamt)} ml`, [`mehr als ${zahl(gesamt)} ml`, `genau ${zahl(gesamt / 2)} ml`, "über 1 Liter"]],
      weg: [`Typ: Mischung – 1 : ${k} sind ${k + 1} Teile.`, `${zahl(gesamt)} ml / ${k + 1} Teile = ${zahl(teil)} ml pro Teil = Wirkstoff.`],
    };
  },
  // ---------- Mischungen: Verdünnen – Zugabe vs. Gesamtmenge (Beispiel aus Milans Video)
  (z) => {
    const k1 = z.waehle([1, 3, 4]);
    const teil = z.waehle([10, 20, 30]);
    const vol = teil * (k1 + 1);
    const k2 = z.waehle([k1 * 2 + 2, k1 * 4, 9, 15].filter((x) => x > k1));
    const zugabe = teil * k2 - teil * k1;
    return {
      typ: "Mischungen",
      text: `${zahl(vol)} ml einer Lösung enthalten Wirkstoff und Kochsalzlösung im Verhältnis 1 : ${k1}. Sie soll auf 1 : ${k2} verdünnt werden.`,
      frage: "Wie viel Kochsalzlösung muss zugegeben werden?",
      richtig: `${zahl(zugabe)} ml`,
      falsch: [
        { text: `${zahl(teil * k2)} ml`, denkfehler: "Gesamtmenge Kochsalz statt Zugabe – am Ende nicht genau gelesen.", schritt: W1 },
        { text: `${zahl(teil * (k2 + 1))} ml`, denkfehler: "Gesamtvolumen der neuen Lösung genommen.", schritt: W1 },
        { text: `${zahl(vol * (k2 / k1) - vol)} ml`, denkfehler: "Gesamtvolumen proportional hochgerechnet statt in Teilen gedacht.", schritt: W1 },
        { text: `${zahl(teil * (k2 - k1 - 1))} ml`, denkfehler: "Teile falsch gezählt.", schritt: W4 },
      ],
      ansatz: `Wirkstoff ${zahl(teil)} ml → Kochsalz neu ${zahl(teil)} · ${k2}`,
      falscheAnsaetze: [`${zahl(vol)} · ${k2}`, `${zahl(vol)} / ${k2}`, `${zahl(vol)} · ${k2} / ${k1}`],
      schaetzung: [`weniger als ${zahl(teil * k2)} ml`, [`mehr als ${zahl(teil * (k2 + 2))} ml`, "unter 5 ml", "genau so viel wie vorher"]],
      weg: [`Typ: Mischung – Verhältnis in Teile zerlegen: 1 : ${k1} = ${k1 + 1} Teile → ${zahl(teil)} ml pro Teil, Wirkstoff ${zahl(teil)} ml.`, `Für 1 : ${k2} braucht es ${zahl(teil * k2)} ml Kochsalz; vorhanden ${zahl(teil * k1)} ml.`, `Zugabe = ${zahl(teil * k2)} − ${zahl(teil * k1)} = ${zahl(zugabe)} ml (gefragt ist die Zugabe, nicht die Gesamtmenge).`],
    };
  },
  // ---------- Funktionen/Formeln: Veränderung mit Potenzen (r⁴, U² …)
  (z, s) => {
    const formeln = [
      { text: "Der Strömungswiderstand eines Blutgefässes ist R = 8 · η · l / (π · r⁴) (η: Viskosität, l: Länge, r: Radius).", gross: "der Widerstand R", vars: [{ n: "der Radius r", e: -4 }, { n: "die Länge l", e: 1 }] },
      { text: "Für die elektrische Leistung gilt P = U² / R (U: Spannung, R: Widerstand).", gross: "die Leistung P", vars: [{ n: "die Spannung U", e: 2 }, { n: "der Widerstand R", e: -1 }] },
      { text: "Die Bewegungsenergie ist E = ½ · m · v² (m: Masse, v: Geschwindigkeit).", gross: "die Energie E", vars: [{ n: "die Geschwindigkeit v", e: 2 }, { n: "die Masse m", e: 1 }] },
      { text: "Der Volumenstrom durch ein Rohr ist Q = π · Δp · r⁴ / (8 · η · l).", gross: "der Volumenstrom Q", vars: [{ n: "der Radius r", e: 4 }, { n: "die Viskosität η", e: -1 }] },
    ];
    const f = z.waehle(formeln);
    const anzahl = s >= 3 ? 2 : 1;
    const aend = f.vars.slice(0, anzahl).map((v) => ({ ...v, faktor: z.waehle([2, 3, 0.5]) }));
    const wort = (x: number) => (x === 2 ? "verdoppelt" : x === 3 ? "verdreifacht" : "halbiert");
    const ergebnis = aend.reduce((p, v) => p * v.faktor ** v.e, 1);
    const ohneExp = aend.reduce((p, v) => p * v.faktor ** Math.sign(v.e), 1);
    const vorzeichen = aend.reduce((p, v) => p * v.faktor ** -v.e, 1);
    const nurErste = aend[0].faktor ** aend[0].e;
    const faktorText = (x: number) => (x >= 1 ? `Faktor ${zahl(x)}` : `Faktor 1/${zahl(1 / x)}`);
    const kandidaten = [
      { text: faktorText(ohneExp), denkfehler: "Exponent übersehen – nur die veränderte Grösse eingesetzt.", schritt: W1 },
      { text: faktorText(vorzeichen), denkfehler: "Zähler und Nenner verwechselt (Kehrwert).", schritt: W1 },
      { text: faktorText(nurErste), denkfehler: "Nur eine der Änderungen berücksichtigt.", schritt: W1 },
      { text: faktorText(ergebnis * 2), denkfehler: "Zusätzlich verdoppelt – alte und neue Formel nicht sauber nebeneinandergestellt.", schritt: W4 },
      { text: faktorText(ergebnis / 2), denkfehler: "Einen Faktor zu wenig berücksichtigt.", schritt: W4 },
      { text: "bleibt gleich", denkfehler: "Die Effekte heben sich nicht auf – nachrechnen.", schritt: W4 },
    ];
    const richtigText = faktorText(ergebnis);
    const falsch = z.mischen(kandidaten.filter((k, i, a) => k.text !== richtigText && a.findIndex((x) => x.text === k.text) === i)).slice(0, 4);
    return {
      typ: "Funktionen/Formeln",
      text: `${f.text} Nun wird ${aend.map((v) => `${v.n} ${wort(v.faktor)}`).join(" und ")}.`,
      frage: `Um welchen Faktor ändert sich ${f.gross}?`,
      richtig: richtigText,
      falsch,
      ansatz: aend.map((v) => `(${zahl(v.faktor)})^${v.e}`).join(" · "),
      falscheAnsaetze: [aend.map((v) => zahl(v.faktor)).join(" · "), aend.map((v) => `(${zahl(v.faktor)})^${-v.e}`).join(" · "), aend.map((v) => `${zahl(v.faktor)} · ${Math.abs(v.e)}`).join(" + ")],
      schaetzung: [ergebnis >= 1 ? `grösser als 1` : "kleiner als 1", [ergebnis >= 1 ? "kleiner als 1" : "grösser als 1", "genau 1", "negativ"]],
      weg: [`Typ: Formel-Veränderung – alte und neue Formel nebeneinander, nur die veränderten Grössen ersetzen.`, ...aend.map((v) => `${v.n} ${wort(v.faktor)} → Faktor ${zahl(v.faktor)}^${v.e} = ${zahl(v.faktor ** v.e, 4)}.`), `Zusammen: ${richtigText}.`],
    };
  },
  // ---------- Proportionalität (direkt)
  (z) => {
    const gew1 = z.waehle([50, 60, 70, 80]);
    const dosisProKg = z.waehle([2, 3, 4, 5]);
    const gew2 = z.waehle([40, 45, 55, 65, 75, 90].filter((g) => g !== gew1));
    const d1 = gew1 * dosisProKg;
    const d2 = gew2 * dosisProKg;
    return {
      typ: "Proportionalitäten",
      text: `Die Dosis eines Antibiotikums ist proportional zum Körpergewicht. Eine ${gew1} kg schwere Person erhält ${zahl(d1)} mg.`,
      frage: `Wie viel erhält eine ${gew2} kg schwere Person?`,
      richtig: `${zahl(d2)} mg`,
      falsch: [
        { text: `${zahl((d1 * gew1) / gew2)} mg`, denkfehler: "Umgekehrt statt direkt proportional gerechnet.", schritt: W1 },
        { text: `${zahl(d1 + (gew2 - gew1))} mg`, denkfehler: "Differenz addiert statt mit dem Faktor gerechnet.", schritt: W1 },
        { text: `${zahl(d2 * 10)} mg`, denkfehler: "Kommafehler – Grössenordnung nicht geprüft.", schritt: W4 },
        { text: `${zahl(d1 - (gew1 - gew2) * 1)} mg`, denkfehler: "Pro Kilogramm 1 mg angenommen statt den Faktor bestimmt.", schritt: W1 },
      ],
      ansatz: `${zahl(d1)} / ${gew1} · ${gew2}`,
      falscheAnsaetze: [`${zahl(d1)} · ${gew1} / ${gew2}`, `${zahl(d1)} + ${gew2 - gew1}`, `${zahl(d1)} · ${gew2}`],
      schaetzung: [gew2 > gew1 ? `mehr als ${zahl(d1)} mg` : `weniger als ${zahl(d1)} mg`, [gew2 > gew1 ? `weniger als ${zahl(d1)} mg` : `mehr als ${zahl(d1)} mg`, "über 10’000 mg", "unter 1 mg"]],
      weg: [`Typ: direkte Proportionalität – doppeltes Gewicht, doppelte Dosis.`, `${zahl(d1)} mg / ${gew1} kg = ${dosisProKg} mg pro kg → ${gew2} kg · ${dosisProKg} = ${zahl(d2)} mg.`],
    };
  },
  // ---------- Proportionalität (umgekehrt)
  (z) => {
    const n1 = z.waehle([3, 4, 6]);
    const t1 = z.waehle([4, 6, 8, 12]);
    const n2 = z.waehle([2, 3, 4, 8, 12].filter((n) => n !== n1 && (n1 * t1) % n === 0));
    const t2 = (n1 * t1) / n2;
    return {
      typ: "Proportionalitäten",
      text: `${n1} Pflegefachpersonen brauchen für die Vorbereitung einer Station ${t1} Stunden. Alle arbeiten gleich schnell.`,
      frage: `Wie lange brauchen ${n2} Pflegefachpersonen?`,
      richtig: `${zahl(t2)} Stunden`,
      falsch: [
        { text: `${zahl((t1 * n2) / n1)} Stunden`, denkfehler: "Direkt statt umgekehrt proportional – mehr Personen brauchen weniger Zeit.", schritt: W1 },
        { text: `${zahl(t1 + (n1 - n2))} Stunden`, denkfehler: "Differenz addiert statt das Produkt konstant gehalten.", schritt: W1 },
        { text: `${zahl(t1 * n1)} Stunden`, denkfehler: "Arbeitsstunden insgesamt statt Dauer angegeben.", schritt: W1 },
        { text: `${zahl(t2 / 2)} Stunden`, denkfehler: "Einen Faktor doppelt angewendet.", schritt: W4 },
      ],
      ansatz: `${n1} · ${t1} / ${n2}`,
      falscheAnsaetze: [`${t1} · ${n2} / ${n1}`, `${t1} + ${n1 - n2}`, `${n1} · ${t1}`],
      schaetzung: [n2 > n1 ? `weniger als ${t1} Stunden` : `mehr als ${t1} Stunden`, [n2 > n1 ? `mehr als ${t1} Stunden` : `weniger als ${t1} Stunden`, "genau gleich lang", "über 100 Stunden"]],
      weg: [`Typ: umgekehrte Proportionalität – Personen × Stunden bleibt gleich.`, `${n1} · ${t1} = ${n1 * t1} Personenstunden → / ${n2} = ${zahl(t2)} Stunden.`],
    };
  },
  // ---------- Dreisatz: Geschwindigkeit (Krankenwagen vs. Hubschrauber)
  (z) => {
    const v1 = z.waehle([60, 80, 90]);
    const t1 = z.waehle([30, 40, 45, 60]);
    const v2 = z.waehle([180, 240, 270].filter((v) => (v1 * t1) % v === 0));
    const t2 = (v1 * t1) / v2;
    const strecke = (v1 * t1) / 60;
    return {
      typ: "Dreisatz",
      text: `Ein Krankenwagen fährt mit durchschnittlich ${v1} km/h und braucht ${t1} Minuten bis zum Spital. Ein Rettungshelikopter fliegt dieselbe Strecke mit ${v2} km/h.`,
      frage: "Wie lange braucht der Helikopter?",
      richtig: `${zahl(t2)} Minuten`,
      falsch: [
        { text: `${zahl((t1 * v2) / v1)} Minuten`, denkfehler: "Schneller heisst kürzer – hier proportional statt umgekehrt gerechnet.", schritt: W1 },
        { text: `${zahl(strecke)} Minuten`, denkfehler: "Strecke in km statt Zeit angegeben.", schritt: W1 },
        { text: `${zahl(t1 - (v2 - v1) / 10)} Minuten`, denkfehler: "Differenz der Geschwindigkeiten abgezogen.", schritt: W4 },
        { text: `${zahl(t2 * 60)} Minuten`, denkfehler: "Stunden und Minuten nicht vereinheitlicht.", schritt: W1 },
      ],
      ansatz: `${t1} · ${v1} / ${v2}`,
      falscheAnsaetze: [`${t1} · ${v2} / ${v1}`, `${t1} − (${v2} − ${v1})`, `${v1} · ${t1}`],
      schaetzung: [`deutlich weniger als ${t1} Minuten`, [`mehr als ${t1} Minuten`, "über 1 Stunde", "genau gleich lang"]],
      weg: [`Typ: Dreisatz – gleiche Strecke: Zeit × Geschwindigkeit bleibt gleich.`, `${t1} min · ${v1} km/h / ${v2} km/h = ${zahl(t2)} min (Strecke: ${zahl(strecke)} km).`],
    };
  },
  // ---------- Dreisatz: Infusion
  (z) => {
    const rate = z.waehle([50, 75, 100, 125, 150]);
    const vol = z.waehle([250, 500, 750, 1000].filter((v) => ((v / rate) * 60) % 1 === 0));
    const minuten = (vol / rate) * 60;
    return {
      typ: "Dreisatz",
      text: `Eine Infusion läuft mit ${rate} ml pro Stunde. Der Beutel enthält ${zahl(vol)} ml.`,
      frage: "Nach wie vielen Minuten ist der Beutel leer?",
      richtig: `${zahl(minuten)} Minuten`,
      falsch: [
        { text: `${zahl(vol / rate)} Minuten`, denkfehler: "Stunden als Minuten angegeben – Einheiten nicht vereinheitlicht.", schritt: W1 },
        { text: `${zahl((rate / vol) * 60)} Minuten`, denkfehler: "Kehrwert: Rate durch Volumen geteilt.", schritt: W1 },
        { text: `${zahl(vol * 60 / (rate * 2))} Minuten`, denkfehler: "Halbe Rate angenommen.", schritt: W4 },
        { text: `${zahl(minuten + 60)} Minuten`, denkfehler: "Eine Stunde zu viel gezählt.", schritt: W4 },
      ],
      ansatz: `${zahl(vol)} / ${rate} · 60`,
      falscheAnsaetze: [`${zahl(vol)} / ${rate}`, `${rate} / ${zahl(vol)} · 60`, `${zahl(vol)} · ${rate}`],
      schaetzung: [`mehr als 60 Minuten`, ["unter 10 Minuten", "über 10’000 Minuten", "genau 1 Minute"]],
      weg: [`Typ: Dreisatz – ${rate} ml in 60 min.`, `${zahl(vol)} ml / ${rate} ml/h = ${zahl(vol / rate)} h = ${zahl(minuten)} min.`],
    };
  },
  // ---------- Einheiten: Tropfen
  (z) => {
    const tropfenProMin = z.waehle([20, 30, 40, 60]);
    const tropfenProMl = 20;
    const stunden = z.waehle([1, 2, 3]);
    const ml = (tropfenProMin * 60 * stunden) / tropfenProMl;
    return {
      typ: "Einheitenrechnung",
      text: `Eine Infusion tropft mit ${tropfenProMin} Tropfen pro Minute. 1 ml entspricht ${tropfenProMl} Tropfen.`,
      frage: `Wie viele Milliliter fliessen in ${stunden} ${stunden === 1 ? "Stunde" : "Stunden"}?`,
      richtig: `${zahl(ml)} ml`,
      falsch: [
        { text: `${zahl(tropfenProMin * 60 * stunden)} ml`, denkfehler: "Tropfen statt Milliliter angegeben – Einheiten nicht gekürzt.", schritt: W1 },
        { text: `${zahl((tropfenProMin * stunden) / tropfenProMl)} ml`, denkfehler: "Stunden nicht in Minuten umgerechnet.", schritt: W1 },
        { text: `${zahl((tropfenProMin * 60 * stunden) / tropfenProMl / 60)} ml`, denkfehler: "Zweimal durch 60 geteilt.", schritt: W4 },
        { text: `${zahl(ml * 2)} ml`, denkfehler: "Faktor 2 zu viel – Grössenordnung nicht geprüft.", schritt: W4 },
      ],
      ansatz: `${tropfenProMin} · 60 · ${stunden} / ${tropfenProMl}`,
      falscheAnsaetze: [`${tropfenProMin} · 60 · ${stunden}`, `${tropfenProMin} · ${stunden} / ${tropfenProMl}`, `${tropfenProMin} / ${tropfenProMl}`],
      schaetzung: [`zwischen ${zahl(ml / 2)} und ${zahl(ml * 1.5)} ml`, ["unter 5 ml", "über 10’000 ml", "genau 20 ml"]],
      weg: [`Typ: Einheiten – nach der gesuchten Grösse umstellen, nur Einheiten einsetzen und kürzen.`, `Tropfen/min · min / (Tropfen/ml) = ml: ${tropfenProMin} · ${60 * stunden} / ${tropfenProMl} = ${zahl(ml)} ml.`],
    };
  },
  // ---------- Einheiten: Einheit einer Konstanten (wie ε₀ bei Milan)
  (z) => {
    const faelle = [
      { formel: "F = k · q₁ · q₂ / r²", gesucht: "k", einheiten: "F in N, q in C, r in m", richtig: "N · m² / C²", falsch: ["N · m / C²", "N / (m² · C²)", "C² / (N · m²)", "N · C² / m²"] },
      { formel: "p = ρ · g · h", gesucht: "ρ", einheiten: "p in Pa = kg/(m · s²), g in m/s², h in m", richtig: "kg / m³", falsch: ["kg / m²", "kg · m³", "kg / (m · s²)", "Pa · s² / m"] },
      { formel: "Q = c · m · ΔT", gesucht: "c", einheiten: "Q in J, m in kg, ΔT in K", richtig: "J / (kg · K)", falsch: ["J · kg / K", "J · kg · K", "kg · K / J", "J / K"] },
      { formel: "R = ρ · l / A", gesucht: "ρ", einheiten: "R in Ω, l in m, A in m²", richtig: "Ω · m", falsch: ["Ω / m", "Ω · m²", "Ω / m²", "m / Ω"] },
      { formel: "I = Δp / R", gesucht: "R", einheiten: "I (Volumenstrom) in m³/s, Δp in Pa", richtig: "Pa · s / m³", falsch: ["Pa · m³ / s", "m³ / (Pa · s)", "Pa / s", "Pa · s"] },
    ];
    const f = z.waehle(faelle);
    const fehler = ["Beim Umstellen Zähler und Nenner vertauscht.", "Ein Exponent ging verloren.", "Kehrwert der gesuchten Einheit genommen.", "Eine Grösse doppelt eingesetzt."];
    return {
      typ: "Einheitenrechnung",
      text: `Es gilt ${f.formel} (${f.einheiten}).`,
      frage: `Welche Einheit hat ${f.gesucht}?`,
      richtig: f.richtig,
      falsch: f.falsch.slice(0, 4).map((t, i) => ({ text: t, denkfehler: fehler[i], schritt: W1 })),
      ansatz: `nach ${f.gesucht} umstellen, Einheiten einsetzen`,
      falscheAnsaetze: ["Zahlen einsetzen und ausrechnen", "die Einheit von F übernehmen", "Einheiten addieren"],
      schaetzung: [`hat mehrere Einheiten im Bruch`, ["ist dimensionslos", "ist immer Meter", "hat keine Einheit"]],
      weg: [`Typ: Einheiten – sichere Punkte: nur Einheiten einsetzen.`, `Nach ${f.gesucht} umstellen und kürzen → ${f.richtig}.`],
    };
  },
  // ---------- Potenzen: Verdoppelung
  (z) => {
    const start = z.waehle([1, 2, 5]);
    const exp = z.waehle([2, 3]);
    const takt = z.waehle([15, 20, 30]);
    const minuten = takt * z.waehle([4, 5, 6]);
    const n = minuten / takt;
    const ende = start * 10 ** exp * 2 ** n;
    return {
      typ: "Potenzen",
      text: `Eine Bakterienkultur verdoppelt sich alle ${takt} Minuten. Zu Beginn sind es ${zehnerpotenz(start, exp)} Zellen.`,
      frage: `Wie viele Zellen sind es nach ${minuten} Minuten?`,
      richtig: zahl(ende, 0),
      falsch: [
        { text: zahl(start * 10 ** exp * 2 * n, 0), denkfehler: "Linear statt exponentiell: mit 2 · n statt 2ⁿ multipliziert.", schritt: W1 },
        { text: zahl(start * 10 ** exp * 2 ** (n - 1), 0), denkfehler: "Eine Verdopplung zu wenig gezählt.", schritt: W4 },
        { text: zahl(start * 10 ** exp * 2 ** (n + 1), 0), denkfehler: "Eine Verdopplung zu viel gezählt.", schritt: W4 },
        { text: zahl(start * 10 ** exp * n ** 2, 0), denkfehler: "n² statt 2ⁿ gerechnet.", schritt: W1 },
      ],
      ansatz: `${zehnerpotenz(start, exp)} · 2^${n}`,
      falscheAnsaetze: [`${zehnerpotenz(start, exp)} · 2 · ${n}`, `${zehnerpotenz(start, exp)} · ${n}²`, `${zehnerpotenz(start, exp)} + 2^${n}`],
      schaetzung: [`zwischen ${zahl(ende / 3, 0)} und ${zahl(ende * 3, 0)}`, ["weniger als zu Beginn", "über 10⁹", "genau doppelt so viele"]],
      weg: [`Typ: Potenzen – ${minuten} min / ${takt} min = ${n} Verdopplungen.`, `${zehnerpotenz(start, exp)} · 2^${n} = ${zahl(ende, 0)}.`],
    };
  },
  // ---------- Potenzen: Verdünnung in Zehnerpotenzen
  (z) => {
    const m = z.waehle([2, 3, 4, 5]);
    const e = -z.waehle([2, 3, 4]);
    const v = z.waehle([10, 100, 1000]);
    const ve = Math.log10(v);
    return {
      typ: "Potenzen",
      text: `Eine Lösung hat die Konzentration ${zehnerpotenz(m, e)} mol/l. Sie wird im Verhältnis 1 : ${zahl(v)} verdünnt (1 Teil Lösung auf insgesamt ${zahl(v)} Teile).`,
      frage: "Welche Konzentration hat die verdünnte Lösung?",
      richtig: `${zehnerpotenz(m, e - ve)} mol/l`,
      falsch: [
        { text: `${zehnerpotenz(m, e + ve)} mol/l`, denkfehler: "Verdünnen erhöht die Konzentration nicht – Vorzeichen des Exponenten verwechselt.", schritt: W1 },
        { text: `${zehnerpotenz(m, e - ve - 1)} mol/l`, denkfehler: "Eine Zehnerpotenz zu viel abgezogen.", schritt: W4 },
        { text: `${zehnerpotenz(m, e * ve)} mol/l`, denkfehler: "Exponenten multipliziert statt addiert.", schritt: W1 },
        { text: `${zehnerpotenz(m / v, e)} mol/l`, denkfehler: "Nur die Mantisse geteilt (falsche Schreibweise).", schritt: W1 },
      ],
      ansatz: `${zehnerpotenz(m, e)} / 10^${ve}`,
      falscheAnsaetze: [`${zehnerpotenz(m, e)} · 10^${ve}`, `${zehnerpotenz(m, e)} / ${ve}`, `${zehnerpotenz(m, e)} − ${zahl(v)}`],
      schaetzung: [`kleiner als ${zehnerpotenz(m, e)} mol/l`, [`grösser als ${zehnerpotenz(m, e)} mol/l`, "genau gleich", "negativ"]],
      weg: [`Typ: Potenzen – 1 : ${zahl(v)} = Division durch 10^${ve}.`, `10^${e} / 10^${ve} = 10^${e - ve} → ${zehnerpotenz(m, e - ve)} mol/l.`],
    };
  },
];

export const quantiGenerator: EinzelGenerator<QuantiDaten> = {
  id: "quanti",
  erzeugen(seed, schwierigkeit, methodeId = "quanti-drei-runden") {
    for (let versuch = 0; versuch < 40; versuch++) {
      const z = new Zufall(`quanti:${seed}:${schwierigkeit}:${versuch}`);
      const vorlage = z.waehle(VORLAGEN);
      let e: Entwurf;
      try {
        e = vorlage(z, schwierigkeit);
      } catch {
        continue; // Zahlenkombination ohne glatte Lösung – neu würfeln
      }
      if (e.richtig === "Faktor 1") continue; // «bleibt gleich» wäre sonst auch richtig
      const texte = new Set([e.richtig]);
      const falsche = e.falsch.filter((f) => {
        if (texte.has(f.text) || /NaN|Infinity|−/.test(f.text)) return false;
        texte.add(f.text);
        return true;
      });
      if (falsche.length < 4) continue;
      const richtigeOption: Option = { text: e.richtig };
      const optionen = z.mischen([richtigeOption, ...falsche.slice(0, 4)]);
      const typOptionen = z.mischen([e.typ, ...z.stichprobe(QUANTI_TYPEN.filter((t) => t !== e.typ), 3)]);
      const ansatzOptionen = z.mischen([e.ansatz, ...e.falscheAnsaetze.slice(0, 3)]);
      const schaetzOptionen = z.mischen([e.schaetzung[0], ...e.schaetzung[1].slice(0, 3)]);
      if (new Set(ansatzOptionen).size < ansatzOptionen.length || new Set(schaetzOptionen).size < schaetzOptionen.length) continue;
      return {
        generator: "quanti",
        seed,
        schwierigkeit,
        gruppe: "quanti",
        methodeId,
        frage: e.frage,
        daten: { typ: e.typ, text: e.text, frage: e.frage },
        optionen,
        loesung: optionen.indexOf(richtigeOption),
        loesungsweg: [
          { schritt: 1, text: e.weg[0] },
          { schritt: 2, text: `Ansatz sofort klar → Runde 1: ${e.ansatz}.` },
          ...e.weg.slice(1).map((t) => ({ schritt: 2, text: t })),
          { schritt: 4, text: `Schätzen & Ausschliessen: Ergebnis liegt ${e.schaetzung[0]}.` },
        ],
        drills: [
          { schritt: 1, frage: "Typ zuordnen: Welcher der 7 Aufgabentypen ist das?", optionen: typOptionen, loesung: typOptionen.indexOf(e.typ), erklaerung: e.weg[0] },
          { schritt: 2, frage: "Runde 1: Welcher Ansatz führt direkt zum Ziel?", optionen: ansatzOptionen, loesung: ansatzOptionen.indexOf(e.ansatz), erklaerung: e.weg.slice(1).join(" ") },
          { schritt: 3, frage: "Du findest nach 2 Minuten keinen Weg. Was tust du?", optionen: ["Markieren und weiter (Runde 2)", "Weiterrechnen, bis es klappt", "Leer lassen und nie mehr anschauen"], loesung: 0, erklaerung: "Nach ~2 Min. ohne Weg markieren und weiter; in Runde 2 kommst du zurück. Am Schluss trotzdem ankreuzen." },
          { schritt: 4, frage: "Schätzen: Wo liegt das Ergebnis?", optionen: schaetzOptionen, loesung: schaetzOptionen.indexOf(e.schaetzung[0]), erklaerung: `Grössenordnung prüfen: ${e.schaetzung[0]}.` },
        ],
        zielSekunden: 150,
      };
    }
    throw new Error(`Quanti: keine gültige Aufgabe für Seed ${seed}`);
  },
  pruefen(a) {
    return grundpruefung(a);
  },
};
