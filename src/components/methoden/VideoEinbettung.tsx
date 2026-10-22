import { useState } from "react";
import { PlayCircle } from "lucide-react";

/** Lädt das Video erst auf Tippen – über youtube-nocookie.com, ohne Tracking vor dem Klick. */
export function VideoEinbettung({ videoId, titel }: { videoId: string; titel: string }) {
  const [aktiv, setAktiv] = useState(false);
  if (aktiv) {
    return (
      <div className="aspect-video overflow-hidden rounded-xl border-2 bg-black">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&autoplay=1`}
          title={titel}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setAktiv(true)}
      className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-muted/60 p-4 text-center hover:bg-muted"
    >
      <PlayCircle className="h-12 w-12 text-primary" />
      <span className="text-sm font-semibold">Video laden</span>
      <span className="line-clamp-2 text-xs text-muted-foreground">{titel}</span>
      <span className="text-[11px] text-muted-foreground">Wird von YouTube (youtube-nocookie.com) abgespielt.</span>
    </button>
  );
}
