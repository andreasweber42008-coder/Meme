// Von Hand gepflegt, bis Lovable Cloud die Typen generiert. Muss zu supabase/migrations passen.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profil: {
        Row: {
          id: string;
          anzeigename: string | null;
          einstellungen: Json;
          erstellt_am: string;
          geaendert_am: string;
        };
        Insert: {
          id: string;
          anzeigename?: string | null;
          einstellungen?: Json;
        };
        Update: {
          anzeigename?: string | null;
          einstellungen?: Json;
        };
        Relationships: [];
      };
      methoden_fortschritt: {
        Row: {
          user_id: string;
          methode_id: string;
          stufe: number;
          verstanden_am: string | null;
          beherrscht_am: string | null;
          naechste_wiederholung: string | null;
          stats: Json;
          erstellt_am: string;
          geaendert_am: string;
        };
        Insert: {
          user_id?: string;
          methode_id: string;
          stufe?: number;
          verstanden_am?: string | null;
          beherrscht_am?: string | null;
          naechste_wiederholung?: string | null;
          stats?: Json;
        };
        Update: {
          stufe?: number;
          verstanden_am?: string | null;
          beherrscht_am?: string | null;
          naechste_wiederholung?: string | null;
          stats?: Json;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      registrierung_offen: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
