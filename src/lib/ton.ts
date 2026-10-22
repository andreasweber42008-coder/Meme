/** Kurze Klänge per Web Audio – keine Audiodateien nötig, funktioniert offline. */
let ctx: AudioContext | null = null;
let an = true;

export function tonEinstellen(aktiv: boolean) {
  an = aktiv;
}

function noten(folge: Array<[number, number, number?]>, typ: OscillatorType = "sine", lautstaerke = 0.12) {
  if (!an || typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    let t = ctx.currentTime;
    for (const [freq, dauer, pause = 0] of folge) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = typ;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(lautstaerke, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + dauer + 0.02);
      t += dauer + pause;
    }
  } catch {
    /* Ton ist Zusatz – Fehler ignorieren */
  }
}

export const ton = {
  richtig: () => noten([[784, 0.09], [1175, 0.16]], "triangle"),
  falsch: () => noten([[220, 0.18], [196, 0.22]], "sawtooth", 0.05),
  tipp: () => noten([[660, 0.05]], "sine", 0.06),
  fertig: () => noten([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.25]], "triangle"),
  feiern: () => noten([[523, 0.12], [523, 0.08, 0.04], [784, 0.12], [1047, 0.3], [988, 0.1], [1047, 0.35]], "square", 0.06),
  zeit: () => noten([[880, 0.12, 0.1], [880, 0.12, 0.1], [880, 0.3]], "sine", 0.1),
};
