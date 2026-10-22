import roh from "./methoden.json";
import videosRoh from "./videos.json";
import type { Entscheidung, Methode, MethodenDatei, OffeneFrage, UntertestId } from "./schema";

export const methodenDatei = roh as MethodenDatei;
export const METHODEN: Methode[] = methodenDatei.methoden;

export interface Video {
  videoId: string;
  typ: "video" | "short";
  titel: string;
  datum: string | null;
  notizen: boolean;
  untertests: UntertestId[];
}
export const VIDEOS = videosRoh.videos as Video[];

export function methodeById(id: string): Methode | undefined {
  return METHODEN.find((m) => m.id === id);
}

export function methodenFuer(untertest: UntertestId): Methode[] {
  return METHODEN.filter((m) => m.untertest === untertest);
}

export function entscheidung(id: string): Entscheidung | undefined {
  return methodenDatei.entscheidungen.find((e) => e.id === id);
}

export function offeneFrage(id: string): OffeneFrage | undefined {
  return methodenDatei.offeneFragen.find((f) => f.id === id);
}

export function videosFuer(untertest: UntertestId): Video[] {
  return VIDEOS.filter((v) => v.untertests.includes(untertest));
}
