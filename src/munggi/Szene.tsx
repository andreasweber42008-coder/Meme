import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Hintergrund-Szenen für Munggi (aus dem Shop) */
export function Szene({ id, className, children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("relative overflow-hidden rounded-3xl border-2", className)}>
      <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {id === "alpen" ? (
          <g>
            <rect width={400} height={240} fill="#BDE0FE" />
            <circle cx={330} cy={50} r={22} fill="#FFE066" />
            <path d="M0 170 L70 80 L120 140 L190 50 L260 150 L310 100 L400 170 L400 240 L0 240 Z" fill="#8D99AE" />
            <path d="M190 50 L215 86 L200 80 L190 92 L178 80 L166 86 Z M70 80 L88 104 L70 98 L56 104 Z" fill="#fff" />
            <path d="M0 200 Q100 170 200 195 T400 190 L400 240 L0 240 Z" fill="#74C69D" />
          </g>
        ) : id === "bibliothek" ? (
          <g>
            <rect width={400} height={240} fill="#F3E3C3" />
            {[0, 1, 2].map((r) => (
              <g key={r}>
                <rect x={0} y={40 + r * 60} width={400} height={6} fill="#8B5E34" />
                {Array.from({ length: 18 }, (_, i) => (
                  <rect key={i} x={8 + i * 22} y={10 + r * 60} width={16} height={30} rx={2} fill={["#C92A2A", "#1971C2", "#2F9E44", "#F08C00", "#862E9C"][(i + r) % 5]} opacity={0.75} />
                ))}
              </g>
            ))}
            <rect x={0} y={200} width={400} height={40} fill="#A0703F" />
          </g>
        ) : id === "labor" ? (
          <g>
            <rect width={400} height={240} fill="#E7F5FF" />
            <rect x={0} y={170} width={400} height={70} fill="#ADB5BD" />
            <rect x={0} y={164} width={400} height={8} fill="#868E96" />
            <g transform="translate(40 96)">
              <rect x={10} y={40} width={40} height={30} rx={4} fill="#495057" />
              <rect x={24} y={0} width={10} height={44} fill="#343A40" transform="rotate(-15 29 22)" />
              <circle cx={22} cy={-2} r={8} fill="#212529" />
            </g>
            {[300, 330, 360].map((x, i) => (
              <g key={x}>
                <rect x={x} y={120} width={14} height={46} rx={7} fill="#fff" stroke="#868E96" />
                <rect x={x + 2} y={140 - i * 6} width={10} height={24 + i * 6} rx={5} fill={["#51CF66", "#4DABF7", "#FF922B"][i]} />
              </g>
            ))}
          </g>
        ) : id === "nacht" ? (
          <g>
            <rect width={400} height={240} fill="#1B263B" />
            {Array.from({ length: 30 }, (_, i) => (
              <circle key={i} cx={(i * 137) % 400} cy={(i * 53) % 150} r={i % 4 === 0 ? 2 : 1.2} fill="#fff" opacity={0.8} />
            ))}
            <circle cx={320} cy={50} r={20} fill="#F8F9FA" />
            <circle cx={330} cy={44} r={18} fill="#1B263B" />
            <path d="M0 190 Q100 160 200 185 T400 180 L400 240 L0 240 Z" fill="#2D3A4F" />
          </g>
        ) : (
          <g>
            <rect width={400} height={240} fill="hsl(var(--muted))" />
            <path d="M0 195 Q100 175 200 192 T400 188 L400 240 L0 240 Z" fill="hsl(var(--primary) / 0.18)" />
          </g>
        )}
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}
