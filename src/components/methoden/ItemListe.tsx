import { itemHerkunft, itemText, type Herkunft, type Item } from "@/content/schema";
import { HerkunftBadge } from "./Badges";

/** Liste von Sätzen; zeigt die Herkunft nur, wenn sie von der Methode abweicht. */
export function ItemListe({ items, standard, leer }: { items: Item[]; standard: Herkunft; leer?: string }) {
  if (items.length === 0) return leer ? <p className="text-sm italic text-muted-foreground">{leer}</p> : null;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => {
        const h = itemHerkunft(item, standard);
        return (
          <li key={i} className="flex gap-2 text-sm leading-relaxed">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
            <span>
              {itemText(item)}
              {h !== standard && <HerkunftBadge herkunft={h} className="ml-1.5 align-middle" />}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
