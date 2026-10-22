import type { Herkunft, Methode } from "@/content/schema";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const HERKUNFT_LABEL: Record<Herkunft, string> = {
  milan: "Milan",
  ncwiki: "NCWiki",
  ergaenzung: "Ergänzung",
  anpassung: "EMS-Anpassung",
  "test-info": "Test-Info",
};

const HERKUNFT_FARBE: Record<Herkunft, string> = {
  milan: "border-herkunft-milan/40 bg-herkunft-milan/10 text-herkunft-milan",
  ncwiki: "border-herkunft-ncwiki/40 bg-herkunft-ncwiki/10 text-herkunft-ncwiki",
  ergaenzung: "border-herkunft-ergaenzung/40 bg-herkunft-ergaenzung/10 text-herkunft-ergaenzung",
  anpassung: "border-herkunft-anpassung/40 bg-herkunft-anpassung/10 text-herkunft-anpassung",
  "test-info": "border-foreground/20 bg-muted text-foreground",
};

export function HerkunftBadge({ herkunft, className }: { herkunft: Herkunft; className?: string }) {
  return <Badge className={cn(HERKUNFT_FARBE[herkunft], className)}>{HERKUNFT_LABEL[herkunft]}</Badge>;
}

const STATUS: Record<Methode["ems"]["status"], { label: string; klasse: string }> = {
  "gilt-direkt": { label: "gilt direkt", klasse: "border-primary/40 bg-primary/10 text-primary" },
  anpassen: { label: "anpassen", klasse: "border-accent/50 bg-accent/15 text-foreground" },
  "nur-tms": { label: "nur TMS", klasse: "border-destructive/40 bg-destructive/10 text-destructive" },
};

export function EmsBadge({ status }: { status: Methode["ems"]["status"] }) {
  const s = STATUS[status];
  return <Badge className={s.klasse}>EMS: {s.label}</Badge>;
}

const ART_LABEL: Record<Methode["art"], string> = {
  einheit: "Lern-Einheit · 8 Stufen",
  plan: "steuert den Lernplan",
  querschnitt: "gilt für alle Gruppen",
  lernkarte: "Lernkarte",
};

export function ArtBadge({ art }: { art: Methode["art"] }) {
  return <Badge className="border-border bg-background text-muted-foreground">{ART_LABEL[art]}</Badge>;
}
