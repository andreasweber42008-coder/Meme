import { BarChart3, Box, Calculator, FileText, FlaskConical, Grid3x3, Shapes, UserRound, ZoomIn, type LucideIcon } from "lucide-react";
import type { AufgabenGruppe } from "@/daten/modelle";

/** Ein Symbol pro Aufgabengruppe – gleich im Tagespfad, im Training und in der Statistik */
export const GRUPPEN_ICON: Record<AufgabenGruppe, LucideIcon> = {
  "muster-zuordnen": ZoomIn,
  "med-nat": FlaskConical,
  "objekte-im-raum": Box,
  quanti: Calculator,
  "figuren-lernen": Shapes,
  "fakten-lernen": UserRound,
  textverstaendnis: FileText,
  "diagramme-tabellen": BarChart3,
  konz: Grid3x3,
};
