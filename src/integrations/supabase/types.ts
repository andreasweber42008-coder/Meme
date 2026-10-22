// Von Hand gepflegt, bis Lovable Cloud die Typen generiert. Muss zu supabase/migrations passen.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profil: {
        Row: { id: string; anzeigename: string | null; einstellungen: Json; erstellt_am: string; geaendert_am: string };
        Insert: { id: string; anzeigename?: string | null; einstellungen?: Json };
        Update: { anzeigename?: string | null; einstellungen?: Json };
        Relationships: [];
      };
      dokumente: {
        Row: {
          user_id: string;
          sammlung: string;
          id: string;
          daten: Json;
          geloescht: boolean;
          geaendert_am: string;
          server_am: string;
        };
        Insert: { sammlung: string; id: string; daten: Json; geloescht?: boolean; geaendert_am: string };
        Update: { daten?: Json; geloescht?: boolean; geaendert_am?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      registrierung_offen: { Args: Record<string, never>; Returns: boolean };
      dokumente_speichern: { Args: { eintraege: Json }; Returns: number };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
