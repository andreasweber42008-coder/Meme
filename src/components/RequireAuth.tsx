import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, laedt, passwortWiederherstellung } = useAuth();
  const ort = useLocation();
  if (laedt)
    return (
      <div className="flex min-h-dvh items-center justify-center" aria-busy="true">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  if (!session) return <Navigate to="/login" replace state={{ von: ort.pathname }} />;
  if (passwortWiederherstellung && ort.pathname !== "/passwort-neu") return <Navigate to="/passwort-neu" replace />;
  return <>{children}</>;
}
