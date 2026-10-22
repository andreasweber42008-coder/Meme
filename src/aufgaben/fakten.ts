import { Zufall } from "@/lib/zufall";

/** Fakten lernen: 15 Fälle in 5 Dreiergruppen (ähnliche Namen, gleiche Altersstufe, gemeinsames Berufsthema). */
export type Geschlecht = "m" | "w";
export type MerkmalArt = "stimmung" | "zivilstand" | "station";

export interface Fall {
  id: number;
  gruppe: number;
  name: string;
  alter: number;
  geschlecht: Geschlecht;
  beruf: string;
  merkmal: string;
  merkmalArt: MerkmalArt;
  diagnose: string;
}

export interface FaktenFrage {
  frage: string;
  optionen: string[];
  loesung: number;
  /** Fall, nach dem gefragt wird */
  fall: number;
  feld: "alter" | "beruf" | "merkmal" | "name" | "diagnose";
  denkfehler: Array<{ text: string; schritt: number } | null>;
}

export interface FaktenSet {
  seed: string;
  faelle: Fall[];
  fragen: FaktenFrage[];
}

const NAMEN: string[][] = [
  ["Tanaka", "Yamamoto", "Takahashi", "Nakamura", "Kobayashi"],
  ["Järvinen", "Korhonen", "Koskinen", "Virtanen", "Mäkinen"],
  ["Ferrari", "Fontana", "Moretti", "Romano", "Ricci"],
  ["Kowalski", "Nowak", "Wiśniewski", "Lewandowski", "Kamiński"],
  ["Papadopoulos", "Nikolaidis", "Georgiou", "Dimitriou", "Konstantinou"],
  ["Jansen", "de Vries", "van Dijk", "Bakker", "Visser"],
  ["García", "Fernández", "González", "Rodríguez", "Martínez"],
  ["Brunner", "Huber", "Gerber", "Steiner", "Baumann"],
  ["O'Brien", "O'Connor", "Murphy", "Kelly", "Walsh"],
  ["Lindqvist", "Lindberg", "Lundgren", "Bergström", "Sandberg"],
];

const BERUFE: Array<Array<[string, string]>> = [
  [["Gärtner", "Gärtnerin"], ["Wildhüter", "Wildhüterin"], ["Förster", "Försterin"], ["Landwirt", "Landwirtin"], ["Imker", "Imkerin"]],
  [["Architekt", "Architektin"], ["Bauzeichner", "Bauzeichnerin"], ["Maurer", "Maurerin"], ["Zimmermann", "Zimmerin"], ["Installateur", "Installateurin"]],
  [["Anwalt", "Anwältin"], ["Richter", "Richterin"], ["Notar", "Notarin"], ["Polizist", "Polizistin"], ["Gefängniswärter", "Gefängniswärterin"]],
  [["Lehrer", "Lehrerin"], ["Dozent", "Dozentin"], ["Bibliothekar", "Bibliothekarin"], ["Schulleiter", "Schulleiterin"], ["Kindergärtner", "Kindergärtnerin"]],
  [["Koch", "Köchin"], ["Bäcker", "Bäckerin"], ["Metzger", "Metzgerin"], ["Kellner", "Kellnerin"], ["Konditor", "Konditorin"]],
  [["Maler", "Malerin"], ["Musiker", "Musikerin"], ["Fotograf", "Fotografin"], ["Schauspieler", "Schauspielerin"], ["Bildhauer", "Bildhauerin"]],
  [["Elektriker", "Elektrikerin"], ["Mechaniker", "Mechanikerin"], ["Informatiker", "Informatikerin"], ["Ingenieur", "Ingenieurin"], ["Physiker", "Physikerin"]],
  [["Verkäufer", "Verkäuferin"], ["Händler", "Händlerin"], ["Handelsvertreter", "Handelsvertreterin"], ["Bankangestellter", "Bankangestellte"], ["Buchhalter", "Buchhalterin"]],
  [["Pilot", "Pilotin"], ["Lokführer", "Lokführerin"], ["Chauffeur", "Chauffeuse"], ["Kapitän", "Kapitänin"], ["Fluglotse", "Fluglotsin"]],
];

const MERKMALE: Record<MerkmalArt, string[]> = {
  stimmung: ["nervös", "schüchtern", "kontaktfreudig", "ängstlich", "optimistisch", "gereizt", "gelassen", "misstrauisch", "gesprächig"],
  zivilstand: ["ledig", "verheiratet", "geschieden", "verwitwet"],
  station: ["in der Poliklinik", "in Quarantäne", "auf der Intensivstation", "in der Notaufnahme", "auf der Bettenstation"],
};

const DIAGNOSEN = [
  "Diabetes", "Nierensteine", "Gehirnerschütterung", "Blinddarmreizung", "Blutverlust", "Schleudertrauma", "Schädelbasisbruch",
  "Lungenentzündung", "Gallensteine", "Bandscheibenvorfall", "Herzinfarkt", "Mandelentzündung", "Gürtelrose", "Rippenbruch",
  "Magengeschwür", "Asthma", "Migräne", "Leistenbruch", "Bluthochdruck", "Sonnenstich", "Nierenentzündung", "Knöchelbruch",
];

const ALTER = [25, 35, 45, 50, 65];

/** Fall-Beschreibung wie in den Beispielaufgaben: «Lemke: ca. 35 Jahre, Gefängniswärterin, ledig – Schädelbasisbruch» */
export function fallText(f: Fall): string {
  return `${f.name}: ca. ${f.alter} Jahre, ${f.beruf}, ${f.merkmal} – ${f.diagnose}`;
}

export function erzeugeFaktenSet(seed: string, anzahlGruppen = 5, anzahlFragen = 18): FaktenSet {
  for (let versuch = 0; versuch < 50; versuch++) {
    const z = new Zufall(`fakten:${seed}:${anzahlGruppen}:${versuch}`);
    const namensGruppen = z.stichprobe(NAMEN, anzahlGruppen);
    const berufsGruppen = z.stichprobe(BERUFE, anzahlGruppen);
    const alter = z.stichprobe(ALTER, anzahlGruppen);
    const arten = z.stichprobe(["stimmung", "zivilstand", "station"] as const, 2);
    const diagnosen = z.mischen(DIAGNOSEN);
    const faelle: Fall[] = [];
    for (let g = 0; g < anzahlGruppen; g++) {
      const namen = z.stichprobe(namensGruppen[g], 3);
      const berufe = z.stichprobe(berufsGruppen[g], 3);
      // pro Gruppe mindestens eine Frau und ein Mann
      const geschlechter = z.mischen(["m", "w", z.chance(0.5) ? "m" : "w"] as Geschlecht[]);
      for (let i = 0; i < 3; i++) {
        const ges = geschlechter[i];
        faelle.push({
          id: faelle.length,
          gruppe: g,
          name: namen[i],
          alter: alter[g],
          geschlecht: ges,
          beruf: berufe[i][ges === "m" ? 0 : 1],
          ...(() => {
            const art = z.waehle(arten);
            return { merkmal: z.waehle(MERKMALE[art]), merkmalArt: art };
          })(),
          // gelegentlich doppelte Diagnose (Milan: «mehrere mit Bluthochdruck»)
          diagnose: z.chance(0.08) && faelle.length > 2 ? faelle[z.ganz(0, faelle.length - 1)].diagnose : diagnosen[faelle.length],
        });
      }
    }
    const fragen = fragenErzeugen(faelle, z, anzahlFragen);
    if (fragen.length === anzahlFragen) return { seed, faelle, fragen };
  }
  throw new Error(`Fakten: kein gültiges Set für ${seed}`);
}

interface Bedingung {
  nom: string;
  gen: string;
  nutzt: Array<FaktenFrage["feld"] | "geschlecht">;
  passt: (f: Fall) => boolean;
}

const ADJEKTIV = new Set([...MERKMALE.stimmung, ...MERKMALE.zivilstand]);

function bedingungen(f: Fall): Bedingung[] {
  const b: Bedingung[] = [
    { nom: `Die Person mit ${f.diagnose}`, gen: `der Person mit ${f.diagnose}`, nutzt: ["diagnose"], passt: (x) => x.diagnose === f.diagnose },
    { nom: `Die Person mit dem Namen ${f.name}`, gen: `der Person mit dem Namen ${f.name}`, nutzt: ["name"], passt: (x) => x.name === f.name },
    {
      nom: f.geschlecht === "m" ? `Der ca. ${f.alter}-jährige Patient` : `Die ca. ${f.alter}-jährige Patientin`,
      gen: f.geschlecht === "m" ? `des ca. ${f.alter}-jährigen Patienten` : `der ca. ${f.alter}-jährigen Patientin`,
      nutzt: ["alter", "geschlecht"],
      passt: (x) => x.alter === f.alter && x.geschlecht === f.geschlecht,
    },
    {
      nom: f.geschlecht === "m" ? `Der Patient mit ${f.diagnose}` : `Die Patientin mit ${f.diagnose}`,
      gen: f.geschlecht === "m" ? `des Patienten mit ${f.diagnose}` : `der Patientin mit ${f.diagnose}`,
      nutzt: ["diagnose", "geschlecht"],
      passt: (x) => x.diagnose === f.diagnose && x.geschlecht === f.geschlecht,
    },
  ];
  if (ADJEKTIV.has(f.merkmal))
    b.push({ nom: `Die ${f.merkmal}e Person mit ${f.diagnose}`, gen: `der ${f.merkmal}en Person mit ${f.diagnose}`, nutzt: ["merkmal", "diagnose"], passt: (x) => x.merkmal === f.merkmal && x.diagnose === f.diagnose });
  else
    b.push({ nom: `Die Person ${f.merkmal} mit ${f.diagnose}`, gen: `der Person ${f.merkmal} mit ${f.diagnose}`, nutzt: ["merkmal", "diagnose"], passt: (x) => x.merkmal === f.merkmal && x.diagnose === f.diagnose });
  // Beruf als Bedingung (wie «Die Anwältin ist …»); Genitiv nur bei weiblichen Formen sicher
  b.push({ nom: `${f.geschlecht === "m" ? "Der" : "Die"} ${f.beruf}`, gen: f.geschlecht === "w" ? `der ${f.beruf}` : "", nutzt: ["beruf", "geschlecht"], passt: (x) => x.beruf === f.beruf });
  return b;
}

const FELD_WERT = (feld: FaktenFrage["feld"], x: Fall) =>
  feld === "alter" ? `ca. ${x.alter} Jahre alt` : feld === "beruf" ? x.beruf : feld === "merkmal" ? x.merkmal : feld === "name" ? x.name : x.diagnose;

function fragenErzeugen(faelle: Fall[], z: Zufall, anzahl: number): FaktenFrage[] {
  const fragen: FaktenFrage[] = [];
  const genutzt = new Set<string>();
  const proFall = new Map<number, number>();
  const felder: FaktenFrage["feld"][] = ["alter", "beruf", "merkmal", "name", "diagnose"];
  const kandidaten = z.mischen(faelle);
  for (let runde = 0; runde < 600 && fragen.length < anzahl; runde++) {
    const f = kandidaten[runde % kandidaten.length];
    if ((proFall.get(f.id) ?? 0) >= 2) continue;
    const feld = felder[(fragen.length + runde) % felder.length];
    if (genutzt.has(`${feld}:${f.id}`)) continue;
    const brauchtGenitiv = feld === "name" || feld === "diagnose";
    const bed = bedingungen(f).filter((b) => !b.nutzt.includes(feld) && (!brauchtGenitiv || b.gen) && faelle.filter(b.passt).length === 1);
    if (!bed.length) continue;
    const b = z.waehle(bed);
    const richtig = FELD_WERT(feld, f);
    const gleicheGruppe = faelle.filter((x) => x.gruppe === f.gruppe && x.id !== f.id).map((x) => FELD_WERT(feld, x));
    const andere = z.mischen(faelle.filter((x) => x.gruppe !== f.gruppe).map((x) => FELD_WERT(feld, x)));
    let falsche: string[];
    if (feld === "alter") falsche = ALTER.map((a) => `ca. ${a} Jahre alt`).filter((w) => w !== richtig);
    else {
      falsche = [...new Set([...gleicheGruppe, ...andere].filter((w) => w !== richtig))].slice(0, 4);
      if (feld === "merkmal") for (const m of z.mischen(Object.values(MERKMALE).flat())) if (falsche.length < 4 && m !== richtig && !falsche.includes(m)) falsche.push(m);
    }
    if (falsche.length < 4) continue;
    const optionen = feld === "alter" ? ALTER.map((a) => `ca. ${a} Jahre alt`) : z.mischen([richtig, ...falsche.slice(0, 4)]);
    const loesung = optionen.indexOf(richtig);
    const frage =
      feld === "alter" || feld === "merkmal" ? `${b.nom} ist …` : feld === "beruf" ? `${b.nom} ist von Beruf:` : feld === "name" ? `Der Name ${b.gen} lautet:` : `Die Diagnose ${b.gen} lautet:`;
    const denkfehler = optionen.map((o, i) => {
      if (i === loesung) return null;
      const x = faelle.find((y) => FELD_WERT(feld, y) === o);
      if (x && x.gruppe === f.gruppe) return { text: `Mit ${x.name} aus derselben Gruppe verwechselt – die 3 Plätze im Raum klar trennen.`, schritt: 2 };
      if (feld === "alter") return { text: "Altersgruppe falsch zugeordnet – Altersgruppe erkennen → Raum wählen.", schritt: 4 };
      if (feld === "name" && x && NAMEN.some((n) => n.includes(x.name) && n.includes(f.name))) return { text: "Ähnliche Namen verwechselt – Namensteile verbildlichen.", schritt: 5 };
      return { text: "Kein starkes Bild gespeichert – absurd, übertrieben, emotional.", schritt: 5 };
    });
    genutzt.add(`${feld}:${f.id}`);
    proFall.set(f.id, (proFall.get(f.id) ?? 0) + 1);
    fragen.push({ frage, optionen, loesung, fall: f.id, feld, denkfehler });
  }
  return z.mischen(fragen);
}

/** Jede Frage muss genau eine Person treffen und genau eine passende Option haben. */
export function pruefeFaktenSet(set: FaktenSet): string[] {
  const p: string[] = [];
  if (set.faelle.length % 3 !== 0) p.push("Fallzahl nicht durch 3 teilbar");
  const gruppen = new Map<number, Fall[]>();
  for (const f of set.faelle) gruppen.set(f.gruppe, [...(gruppen.get(f.gruppe) ?? []), f]);
  for (const [g, l] of gruppen) {
    if (l.length !== 3) p.push(`Gruppe ${g}: ${l.length} Fälle`);
    if (new Set(l.map((f) => f.alter)).size !== 1) p.push(`Gruppe ${g}: unterschiedliches Alter`);
  }
  if (new Set(set.faelle.map((f) => f.name)).size !== set.faelle.length) p.push("doppelte Namen");
  for (const q of set.fragen) {
    if (q.optionen.length !== 5) p.push(`${q.frage}: ${q.optionen.length} Optionen`);
    if (new Set(q.optionen).size !== 5) p.push(`${q.frage}: doppelte Optionen`);
    const f = set.faelle[q.fall];
    const wert = q.feld === "alter" ? `ca. ${f.alter} Jahre alt` : q.feld === "beruf" ? f.beruf : q.feld === "merkmal" ? f.merkmal : q.feld === "name" ? f.name : f.diagnose;
    if (q.optionen[q.loesung] !== wert) p.push(`${q.frage}: Lösung passt nicht`);
  }
  return p;
}
