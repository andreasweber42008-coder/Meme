import { Zufall } from "@/lib/zufall";
import { zahl } from "./quanti";
import { grundpruefung, type EinzelGenerator, type Option } from "./typen";

/** Diagramme und Tabellen: Aussagen werden programmatisch geprüft – genau eine ist ableitbar (bzw. genau eine nicht). */
export type DiagrammArt = "saeulen" | "linien" | "tabelle" | "zwei-achsen" | "log" | "anteile";

export interface Reihe {
  name: string;
  werte: number[];
  achse?: "links" | "rechts";
}

export interface DiagrammDaten {
  art: DiagrammArt;
  titel: string;
  beschreibung: string;
  xTitel: string;
  yTitel: string;
  einheit: string;
  y2Titel?: string;
  y2Einheit?: string;
  kategorien: string[];
  reihen: Reihe[];
  /** I–III-Format */
  aussagen?: string[];
  frageArt: "ableitbar" | "nicht-ableitbar" | "kombi";
}

interface Aussage {
  text: string;
  /** true = aus der Darstellung ableitbar */
  ableitbar: boolean;
  denkfehler?: string;
  schritt?: number;
}

/* Schritte der Methode «Diagramme und Tabellen: ableiten statt interpretieren» */
const S_FRAGE = 1;
const S_DARSTELLUNG = 2;
const S_ACHSEN = 3;
const S_WERTE = 4;
const S_PRUEFEN = 5;

const pct = (x: number) => `${zahl(x, 0)} %`;

interface Szenario {
  daten: Omit<DiagrammDaten, "frageArt" | "aussagen">;
  aussagen: Aussage[];
}

function maxIndex(w: number[]) {
  return w.reduce((b, x, i) => (x > w[b] ? i : b), 0);
}

function steigend(w: number[]) {
  return w.every((x, i) => i === 0 || x > w[i - 1]);
}

/* ------------------------------------------------------------------ Szenarien */

const SZENARIEN: Array<(z: Zufall, s: number) => Szenario> = [
  // Säulen: Anzahl Fälle nach Altersgruppe in zwei Jahren
  (z) => {
    const kat = ["0–19", "20–39", "40–59", "60–79", "80+"];
    const a = kat.map(() => z.ganz(8, 60) * 10);
    const b = a.map((x) => Math.max(20, Math.round((x * z.bereich(0.6, 1.6)) / 10) * 10));
    const krankheit = z.waehle(["Grippefälle", "Notfalleintritte", "Knochenbrüche", "Hautinfektionen"]);
    const i = z.ganz(0, 4);
    let j = z.ganz(0, 4);
    if (j === i) j = (i + 2) % 5;
    const mb = maxIndex(b);
    const summeA = a.reduce((x, y) => x + y, 0);
    const summeB = b.reduce((x, y) => x + y, 0);
    const doppelt = a.findIndex((x, k) => b[k] >= 2 * x);
    return {
      daten: {
        art: "saeulen",
        titel: `${krankheit} in einer Region nach Altersgruppe`,
        beschreibung: "Absolute Anzahl Fälle pro Jahr (fiktive Daten).",
        xTitel: "Altersgruppe (Jahre)",
        yTitel: "Anzahl Fälle",
        einheit: "Fälle",
        kategorien: kat,
        reihen: [
          { name: "2015", werte: a },
          { name: "2025", werte: b },
        ],
      },
      aussagen: [
        { text: `2025 gab es in der Altersgruppe ${kat[i]} ${b[i] > b[j] ? "mehr" : "weniger"} Fälle als in der Altersgruppe ${kat[j]}.`, ableitbar: true },
        { text: `2025 gab es in der Altersgruppe ${kat[i]} ${b[i] > b[j] ? "weniger" : "mehr"} Fälle als in der Altersgruppe ${kat[j]}.`, ableitbar: false, denkfehler: "Säulen verwechselt oder Legende nicht beachtet.", schritt: S_ACHSEN },
        { text: `Den höchsten Wert 2025 hat die Altersgruppe ${kat[mb]}.`, ableitbar: true },
        { text: `Den höchsten Wert 2025 hat die Altersgruppe ${kat[(mb + 1) % 5]}.`, ableitbar: false, denkfehler: "Falsche Säule abgelesen.", schritt: S_ACHSEN },
        { text: `Insgesamt gab es 2025 ${summeB > summeA ? "mehr" : "weniger"} Fälle als 2015.`, ableitbar: true },
        { text: `Insgesamt gab es 2025 ${summeB > summeA ? "weniger" : "mehr"} Fälle als 2015.`, ableitbar: false, denkfehler: "Nicht alle Säulen zusammengezählt – nur einzelne verglichen.", schritt: S_PRUEFEN },
        { text: `Das Erkrankungsrisiko ist 2025 in der Altersgruppe ${kat[mb]} am höchsten.`, ableitbar: false, denkfehler: "Absolute Zahlen sind kein Risiko: Die Grösse der Altersgruppen ist unbekannt (fehlende Bezugsgrösse).", schritt: S_WERTE },
        { text: `Die Fälle nahmen zu, weil die Bevölkerung älter wurde.`, ableitbar: false, denkfehler: "Ursache interpretiert statt abgeleitet – die Grafik zeigt keine Gründe.", schritt: S_PRUEFEN },
        doppelt >= 0
          ? { text: `In der Altersgruppe ${kat[doppelt]} hat sich die Anzahl Fälle von 2015 bis 2025 mindestens verdoppelt.`, ableitbar: true }
          : { text: `In mindestens einer Altersgruppe hat sich die Anzahl Fälle von 2015 bis 2025 verdoppelt.`, ableitbar: false, denkfehler: "Gegenbeispiel nicht gesucht – in keiner Gruppe ist der Wert doppelt so hoch.", schritt: S_PRUEFEN },
        { text: `2035 wird es in der Altersgruppe ${kat[mb]} noch mehr Fälle geben.`, ableitbar: false, denkfehler: "Extrapoliert – über die Zukunft sagt die Grafik nichts.", schritt: S_PRUEFEN },
      ],
    };
  },
  // Linien: Verlauf einer Konzentration
  (z, s) => {
    const zeiten = ["0 h", "1 h", "2 h", "4 h", "6 h", "8 h", "12 h"];
    const peak = z.ganz(1, 3);
    const max = z.ganz(40, 90);
    const a = zeiten.map((_, k) => (k <= peak ? Math.round((max * (k + 0.2)) / (peak + 0.2)) : Math.round(max * Math.pow(0.7, k - peak))));
    const b = a.map((x, k) => Math.max(2, Math.round(x * (k <= peak ? 0.6 : 1.15 + 0.05 * k))));
    const mitte = Math.min(6, peak + 2);
    const schnittIdx = a.findIndex((x, k) => k > peak && b[k] > x);
    return {
      daten: {
        art: "linien",
        titel: "Wirkstoffkonzentration im Blut nach einer Tablette",
        beschreibung: "Zwei Darreichungsformen desselben Wirkstoffs (fiktive Daten).",
        xTitel: "Zeit nach Einnahme",
        yTitel: "Konzentration",
        einheit: "µg/l",
        kategorien: zeiten,
        reihen: [
          { name: "Normale Tablette", werte: a },
          { name: "Retard-Tablette", werte: b },
        ],
      },
      aussagen: [
        { text: `Die normale Tablette erreicht ihr Maximum nach ${zeiten[peak]}.`, ableitbar: true },
        { text: `Die normale Tablette erreicht ihr Maximum nach ${zeiten[Math.min(6, peak + 2)]}.`, ableitbar: false, denkfehler: "Zeitachse nicht genau gelesen – die Abstände sind nicht gleich.", schritt: S_ACHSEN },
        { text: `Nach ${zeiten[mitte]} ist die Konzentration der Retard-Tablette ${b[mitte] > a[mitte] ? "höher" : "tiefer"} als die der normalen Tablette.`, ableitbar: true },
        { text: `Nach ${zeiten[mitte]} ist die Konzentration der Retard-Tablette ${b[mitte] > a[mitte] ? "tiefer" : "höher"} als die der normalen Tablette.`, ableitbar: false, denkfehler: "Kurven verwechselt.", schritt: S_ACHSEN },
        { text: "Die Retard-Tablette wirkt länger.", ableitbar: false, denkfehler: "Wirkung interpretiert – gezeigt ist nur die Konzentration.", schritt: S_PRUEFEN },
        { text: "Die Konzentration der normalen Tablette sinkt nach dem Maximum gleichmässig um denselben Betrag pro Stunde.", ableitbar: false, denkfehler: "Prozentuale Abnahme mit gleichmässiger Abnahme verwechselt; Zeitachse ungleich.", schritt: S_ACHSEN },
        schnittIdx > 0
          ? { text: `Spätestens nach ${zeiten[schnittIdx]} liegt die Retard-Tablette über der normalen Tablette.`, ableitbar: true }
          : { text: "Die beiden Kurven schneiden sich nach dem Maximum.", ableitbar: false, denkfehler: "Schnittpunkt behauptet, ohne ihn in der Grafik zu prüfen.", schritt: S_PRUEFEN },
        { text: "Nach 24 Stunden ist kein Wirkstoff mehr im Blut.", ableitbar: false, denkfehler: "Ausserhalb des dargestellten Bereichs – nicht ableitbar.", schritt: S_PRUEFEN },
        { text: `Die höchste gemessene Konzentration beträgt deutlich mehr als ${zahl(max * (s >= 4 ? 1.1 : 1.4), 0)} µg/l.`, ableitbar: false, denkfehler: "Vage Formulierung («deutlich mehr») – nicht exakt ablesbar und hier sogar falsch.", schritt: S_PRUEFEN },
      ],
    };
  },
  // Tabelle: Anteile in Prozent (relativ) – Prozentpunkte vs. Prozent, fehlende Grundgesamtheit
  (z) => {
    const gruppen = ["Obligatorische Schule", "Sekundarstufe II", "Tertiärstufe"];
    const j1 = gruppen.map(() => z.ganz(15, 40));
    const j2 = j1.map((x) => Math.max(5, x - z.ganz(1, 12)));
    const k = z.ganz(0, 2);
    const relRueckgang = ((j1[k] - j2[k]) / j1[k]) * 100;
    const pp = j1[k] - j2[k];
    const thema = z.waehle(["Raucherinnen und Raucher", "Personen mit Übergewicht", "Personen ohne Sport"]);
    return {
      daten: {
        art: "tabelle",
        titel: `Anteil ${thema} nach Bildungsabschluss`,
        beschreibung: "Anteil in Prozent der jeweiligen Gruppe (fiktive Daten).",
        xTitel: "Bildungsabschluss",
        yTitel: "Anteil",
        einheit: "%",
        kategorien: gruppen,
        reihen: [
          { name: "2007", werte: j1 },
          { name: "2022", werte: j2 },
        ],
      },
      aussagen: [
        { text: `In der Gruppe «${gruppen[k]}» sank der Anteil von 2007 bis 2022 um ${zahl(pp, 0)} Prozentpunkte.`, ableitbar: true },
        { text: `In der Gruppe «${gruppen[k]}» sank der Anteil von 2007 bis 2022 um ${zahl(pp, 0)} %.`, ableitbar: Math.abs(relRueckgang - pp) < 0.5, denkfehler: "Prozentpunkte mit Prozent verwechselt.", schritt: S_WERTE },
        { text: `In der Gruppe «${gruppen[k]}» sank der Anteil von 2007 bis 2022 um rund ${zahl(relRueckgang, 0)} %.`, ableitbar: true },
        { text: `2022 gab es in der Gruppe «${gruppen[maxIndex(j2)]}» die meisten ${thema}.`, ableitbar: false, denkfehler: "Anteil mit Anzahl verwechselt – die Gruppengrössen sind unbekannt (relativ vs. absolut).", schritt: S_WERTE },
        { text: `2022 war der Anteil in der Gruppe «${gruppen[maxIndex(j2)]}» am höchsten.`, ableitbar: true },
        { text: `Mehr Bildung führt zu ${thema.includes("Sport") ? "mehr Sport" : "weniger Rauchen"}.`, ableitbar: false, denkfehler: "Kausalität interpretiert – die Tabelle zeigt nur Anteile.", schritt: S_PRUEFEN },
        { text: `Insgesamt sank der Anteil in der Bevölkerung um ${zahl(j1.reduce((a, b) => a + b, 0) / 3 - j2.reduce((a, b) => a + b, 0) / 3, 1)} Prozentpunkte.`, ableitbar: false, denkfehler: "Ungewichteten Durchschnitt gebildet – ohne Gruppengrössen nicht ableitbar.", schritt: S_WERTE },
        { text: `In allen Gruppen sank der Anteil von 2007 bis 2022.`, ableitbar: j1.every((x, i) => j2[i] < x) },
      ],
    };
  },
  // Zwei Achsen: Temperatur und Fallzahlen
  (z) => {
    const monate = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug"];
    const voll = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August"];
    const temp = monate.map((_, i) => Math.round(2 + 22 * Math.sin((Math.PI * (i + 0.5)) / 15) + z.bereich(-2, 2)));
    const faelle = monate.map((_, i) => Math.round(400 - i * 35 + z.bereich(-30, 30)));
    const hoechsterMonat = maxIndex(temp);
    return {
      daten: {
        art: "zwei-achsen",
        titel: "Durchschnittstemperatur und Atemwegsinfekte pro Monat",
        beschreibung: "Linke Achse: Temperatur in °C, rechte Achse: Anzahl Fälle (fiktive Daten).",
        xTitel: "Monat",
        yTitel: "Temperatur",
        einheit: "°C",
        y2Titel: "Atemwegsinfekte",
        y2Einheit: "Fälle",
        kategorien: monate,
        reihen: [
          { name: "Temperatur (°C)", werte: temp, achse: "links" },
          { name: "Atemwegsinfekte (Fälle)", werte: faelle, achse: "rechts" },
        ],
      },
      aussagen: [
        { text: `Die höchste Durchschnittstemperatur wurde im ${voll[hoechsterMonat]} gemessen.`, ableitbar: true },
        { text: `Im ${voll[hoechsterMonat]} gab es mehr Atemwegsinfekte als Grad Celsius.`, ableitbar: false, denkfehler: "Zwei Achsen mit verschiedenen Einheiten direkt verglichen.", schritt: S_ACHSEN },
        { text: "Steigende Temperaturen verursachen weniger Atemwegsinfekte.", ableitbar: false, denkfehler: "Zusammenhang ist keine Ursache – Kausalität interpretiert.", schritt: S_PRUEFEN },
        { text: `Im ${voll[0]} gab es ${faelle[0] > faelle[7] ? "mehr" : "weniger"} Atemwegsinfekte als im ${voll[7]}.`, ableitbar: true },
        { text: `Im ${voll[0]} gab es ${faelle[0] > faelle[7] ? "weniger" : "mehr"} Atemwegsinfekte als im ${voll[7]}.`, ableitbar: false, denkfehler: "Falsche Achse oder Kurve abgelesen.", schritt: S_ACHSEN },
        { text: "Die Temperatur steigt von Monat zu Monat an.", ableitbar: steigend(temp) },
        { text: "Im September gibt es wieder mehr Atemwegsinfekte.", ableitbar: false, denkfehler: "Ausserhalb des dargestellten Zeitraums.", schritt: S_PRUEFEN },
      ],
    };
  },
  // Logarithmische Achse: Bakterienwachstum
  (z) => {
    const zeit = ["0 h", "2 h", "4 h", "6 h", "8 h", "10 h"];
    const start = 10 ** z.ganz(2, 3);
    const fa = z.waehle([10, 4]);
    const a = zeit.map((_, i) => start * fa ** i);
    const b = zeit.map((_, i) => start * (i < 3 ? fa ** i : fa ** 2 * 2 ** (i - 2)));
    return {
      daten: {
        art: "log",
        titel: "Bakterienzahl in zwei Nährlösungen",
        beschreibung: "Logarithmische y-Achse (fiktive Daten).",
        xTitel: "Zeit",
        yTitel: "Bakterien pro ml",
        einheit: "pro ml",
        kategorien: zeit,
        reihen: [
          { name: "Nährlösung A", werte: a },
          { name: "Nährlösung B", werte: b },
        ],
      },
      aussagen: [
        { text: `In Nährlösung A vervielfacht sich die Bakterienzahl alle 2 Stunden um den Faktor ${fa}.`, ableitbar: true },
        { text: "In Nährlösung A nimmt die Bakterienzahl alle 2 Stunden um denselben Betrag zu.", ableitbar: false, denkfehler: "Logarithmische Achse übersehen – gleiche Abstände bedeuten gleiche Faktoren, nicht gleiche Beträge.", schritt: S_ACHSEN },
        { text: "Bis 4 h verlaufen beide Nährlösungen gleich.", ableitbar: true },
        { text: `Nach 10 h enthält Nährlösung A etwa doppelt so viele Bakterien wie Nährlösung B.`, ableitbar: false, denkfehler: "Auf der logarithmischen Achse Abstände wie auf einer linearen gelesen.", schritt: S_ACHSEN },
        { text: "Nährlösung B ist für die Bakterien schädlich.", ableitbar: false, denkfehler: "Interpretiert – die Grafik zeigt nur Zahlen, keine Gründe.", schritt: S_PRUEFEN },
        { text: "Ab 4 h wächst Nährlösung B langsamer als Nährlösung A.", ableitbar: true },
      ],
    };
  },
  // Gestapelte Anteile: Zusammensetzung je Gruppe (relativ)
  (z) => {
    const gruppen = ["Spital A", "Spital B", "Spital C", "Spital D"];
    const ambulant = gruppen.map(() => z.ganz(20, 60));
    const stationaer = ambulant.map((x) => z.ganz(15, Math.min(60, 95 - x)));
    const tages = ambulant.map((x, i) => 100 - x - stationaer[i]);
    const m = maxIndex(ambulant);
    return {
      daten: {
        art: "anteile",
        titel: "Behandlungsart nach Spital",
        beschreibung: "Anteile in Prozent aller Behandlungen eines Spitals (fiktive Daten).",
        xTitel: "Spital",
        yTitel: "Anteil",
        einheit: "%",
        kategorien: gruppen,
        reihen: [
          { name: "ambulant", werte: ambulant },
          { name: "stationär", werte: stationaer },
          { name: "Tagesklinik", werte: tages },
        ],
      },
      aussagen: [
        { text: `Den höchsten Anteil ambulanter Behandlungen hat ${gruppen[m]}.`, ableitbar: true },
        { text: `${gruppen[m]} behandelt die meisten Patientinnen und Patienten ambulant.`, ableitbar: false, denkfehler: "Anteil mit Anzahl verwechselt – die Gesamtzahlen der Spitäler fehlen.", schritt: S_WERTE },
        { text: `In ${gruppen[0]} beträgt der Anteil der Tagesklinik ${pct(tages[0])}.`, ableitbar: true },
        { text: `In ${gruppen[1]} ist der Anteil stationärer Behandlungen ${stationaer[1] > ambulant[1] ? "kleiner" : "grösser"} als der Anteil ambulanter.`, ableitbar: false, denkfehler: "Segmente der Säule verwechselt.", schritt: S_DARSTELLUNG },
        { text: `${gruppen[m]} hat die beste Behandlungsqualität.`, ableitbar: false, denkfehler: "Bewertung interpretiert – nicht dargestellt.", schritt: S_PRUEFEN },
        { text: `In allen Spitälern zusammen sind ${pct((ambulant.reduce((a, b) => a + b, 0)) / 4)} der Behandlungen ambulant.`, ableitbar: false, denkfehler: "Anteile gemittelt, ohne die Spitalgrössen zu kennen.", schritt: S_WERTE },
      ],
    };
  },
];

/* ------------------------------------------------------------------ Generator */

const KOMBI = ["nur I", "nur II", "nur III", "I und II", "I und III", "II und III", "alle drei", "keine"] as const;
const KOMBI_MENGE: Record<(typeof KOMBI)[number], number[]> = {
  "nur I": [0],
  "nur II": [1],
  "nur III": [2],
  "I und II": [0, 1],
  "I und III": [0, 2],
  "II und III": [1, 2],
  "alle drei": [0, 1, 2],
  keine: [],
};

function kombiText(i: boolean, ii: boolean, iii: boolean) {
  const n = [i, ii, iii].filter(Boolean).length;
  if (n === 3) return "alle drei";
  if (n === 0) return "keine";
  if (n === 1) return i ? "nur I" : ii ? "nur II" : "nur III";
  return !iii ? "I und II" : !ii ? "I und III" : "II und III";
}

export const diagrammGenerator: EinzelGenerator<DiagrammDaten> = {
  id: "diagramme",
  erzeugen(seed, schwierigkeit, methodeId = "diatab-ableiten") {
    for (let versuch = 0; versuch < 60; versuch++) {
      const z = new Zufall(`diagramme:${seed}:${schwierigkeit}:${versuch}`);
      const sz = z.waehle(SZENARIEN)(z, schwierigkeit);
      const wahr = z.mischen(sz.aussagen.filter((a) => a.ableitbar));
      const falsch = z.mischen(sz.aussagen.filter((a) => !a.ableitbar && a.denkfehler));
      const frageArt: DiagrammDaten["frageArt"] = schwierigkeit >= 3 && z.chance(0.35) ? "kombi" : schwierigkeit >= 2 && z.chance(0.3) ? "nicht-ableitbar" : "ableitbar";
      let optionen: Option[];
      let loesung: number;
      let aussagen: string[] | undefined;
      let frage: string;
      if (frageArt === "ableitbar") {
        if (wahr.length < 1 || falsch.length < 4) continue;
        const r: Option = { text: wahr[0].text };
        optionen = z.mischen([r, ...falsch.slice(0, 4).map((f) => ({ text: f.text, denkfehler: f.denkfehler, schritt: f.schritt }))]);
        loesung = optionen.indexOf(r);
        frage = "Welche Aussage lässt sich aus der Darstellung ableiten?";
      } else if (frageArt === "nicht-ableitbar") {
        if (wahr.length < 4 || falsch.length < 1) continue;
        const r: Option = { text: falsch[0].text };
        optionen = z.mischen([r, ...wahr.slice(0, 4).map((w) => ({ text: w.text, denkfehler: "Die Frage verneint: Gesucht ist die Aussage, die sich NICHT ableiten lässt.", schritt: S_FRAGE }))]);
        loesung = optionen.indexOf(r);
        frage = "Welche Aussage lässt sich aus der Darstellung NICHT ableiten?";
      } else {
        const pool = z.mischen([...wahr.slice(0, 2), ...falsch.slice(0, 2)]).slice(0, 3);
        if (pool.length < 3) continue;
        aussagen = pool.map((p) => p.text);
        const richtigText = kombiText(pool[0].ableitbar, pool[1].ableitbar, pool[2].ableitbar);
        const andere = z.mischen(KOMBI.filter((k) => k !== richtigText)).slice(0, 4);
        const r: Option = { text: richtigText };
        optionen = z.mischen([
          r,
          ...andere.map((k) => {
            const behauptet = KOMBI_MENGE[k];
            const falschAufgenommen = pool.find((p, idx) => behauptet.includes(idx) && !p.ableitbar);
            const faelschlichGestrichen = pool.some((p, idx) => !behauptet.includes(idx) && p.ableitbar);
            return falschAufgenommen
              ? { text: k, denkfehler: falschAufgenommen.denkfehler ?? "Eine nicht ableitbare Aussage übernommen.", schritt: falschAufgenommen.schritt ?? S_PRUEFEN }
              : { text: k, denkfehler: faelschlichGestrichen ? "Eine ableitbare Aussage fälschlich gestrichen." : "Kombination falsch gelesen.", schritt: S_PRUEFEN };
          }),
        ]);
        loesung = optionen.indexOf(r);
        frage = "Welche der Aussagen I bis III lassen sich aus der Darstellung ableiten?";
      }
      const daten: DiagrammDaten = { ...sz.daten, frageArt, aussagen };
      const achsenFrage = daten.art === "log" ? "logarithmische y-Achse" : daten.art === "zwei-achsen" ? "zwei y-Achsen mit verschiedenen Einheiten" : daten.einheit === "%" ? "Anteile in Prozent (relativ)" : "absolute Werte auf einer linearen Achse";
      const achsenOptionen = z.mischen(["logarithmische y-Achse", "zwei y-Achsen mit verschiedenen Einheiten", "Anteile in Prozent (relativ)", "absolute Werte auf einer linearen Achse"]);
      const darstellung = daten.art === "tabelle" ? "Tabelle: Momentaufnahme (oft Prozent/Verhältnisse)" : daten.art === "linien" || daten.art === "log" || daten.art === "zwei-achsen" ? "Kurven: Entwicklung über die Zeit" : "Säulen: Unterschiede zwischen Gruppen";
      const darstellungOptionen = z.mischen(["Tabelle: Momentaufnahme (oft Prozent/Verhältnisse)", "Kurven: Entwicklung über die Zeit", "Säulen: Unterschiede zwischen Gruppen"]);
      const fragOptionen = ["nach einer ableitbaren Aussage", "nach einer NICHT ableitbaren Aussage", "nach einer Kombination der Aussagen I–III"];
      return {
        generator: "diagramme",
        seed,
        schwierigkeit,
        gruppe: "diagramme-tabellen",
        methodeId,
        frage,
        daten,
        optionen,
        loesung,
        loesungsweg: [
          { schritt: S_FRAGE, text: `Fragestellung: gesucht ist ${fragOptionen[frageArt === "ableitbar" ? 0 : frageArt === "nicht-ableitbar" ? 1 : 2]}.` },
          { schritt: S_DARSTELLUNG, text: `Darstellung einordnen: ${darstellung}.` },
          { schritt: S_ACHSEN, text: `Achsen-Checkliste: ${achsenFrage}; Einheit ${daten.einheit}${daten.y2Einheit ? ` bzw. ${daten.y2Einheit}` : ""}.` },
          { schritt: S_WERTE, text: daten.einheit === "%" ? "Werte: relativ – ohne Gruppengrössen keine Aussagen über Anzahlen." : "Werte: absolut – Aussagen über Risiken oder Anteile brauchen eine Bezugsgrösse." },
          ...optionen.map((o, i) => ({ schritt: o.schritt ?? S_PRUEFEN, text: `${"ABCDE"[i]}: ${i === loesung ? "richtig" : o.denkfehler}` })),
        ],
        drills: [
          { schritt: S_FRAGE, frage: "Wonach wird gefragt?", optionen: fragOptionen, loesung: frageArt === "ableitbar" ? 0 : frageArt === "nicht-ableitbar" ? 1 : 2, erklaerung: "Zuerst die Fragestellung genau lesen – richtig oder falsch, ableitbar oder nicht." },
          { schritt: S_DARSTELLUNG, frage: "Wie ordnest du die Darstellung ein?", optionen: darstellungOptionen, loesung: darstellungOptionen.indexOf(darstellung), erklaerung: `Darstellung: ${darstellung}.` },
          { schritt: S_ACHSEN, frage: "Achsen-Checkliste: Was fällt bei den Achsen auf?", optionen: achsenOptionen, loesung: achsenOptionen.indexOf(achsenFrage), erklaerung: `Achsen: ${achsenFrage}.` },
          {
            schritt: S_PRUEFEN,
            frage: `Steht das so in der Grafik? «${(falsch[0] ?? wahr[0]).text}»`,
            optionen: ["Ja, direkt ableitbar", "Nein, nicht ableitbar oder falsch"],
            loesung: (falsch[0] ?? wahr[0]).ableitbar ? 0 : 1,
            erklaerung: (falsch[0] ?? wahr[0]).ableitbar ? "Ja – das lässt sich direkt ablesen." : (falsch[0]?.denkfehler ?? ""),
          },
        ],
        zielSekunden: 150,
      };
    }
    throw new Error(`Diagramme: keine Aufgabe für Seed ${seed}`);
  },
  pruefen(a) {
    const p = grundpruefung(a);
    if (a.daten.frageArt === "kombi" && a.daten.aussagen?.length !== 3) p.push("Kombi ohne 3 Aussagen");
    for (const r of a.daten.reihen) if (r.werte.length !== a.daten.kategorien.length) p.push(`Reihe ${r.name}: falsche Länge`);
    if (a.daten.art === "anteile") a.daten.kategorien.forEach((_, i) => a.daten.reihen.reduce((s, r) => s + r.werte[i], 0) !== 100 && p.push("Anteile ergeben nicht 100 %"));
    return p;
  },
};
