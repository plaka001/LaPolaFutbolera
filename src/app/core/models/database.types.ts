// Tipos generados desde el esquema de Supabase (proyecto seqcwsszqxmuzcordkgn).
// Regenerar con: mcp generate_typescript_types  (o `supabase gen types`).
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      competitions: {
        Row: {
          api_league_id: number;
          country: string | null;
          created_at: string;
          id: string;
          logo_url: string | null;
          name: string;
          season: number;
        };
        Insert: {
          api_league_id: number;
          country?: string | null;
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name: string;
          season: number;
        };
        Update: {
          api_league_id?: number;
          country?: string | null;
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name?: string;
          season?: number;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          api_fixture_id: number | null;
          away_logo: string | null;
          away_score: number | null;
          away_score_live: number | null;
          away_team: string;
          competition_id: string | null;
          elapsed: number | null;
          home_logo: string | null;
          home_score: number | null;
          home_score_live: number | null;
          home_team: string;
          id: string;
          is_knockout: boolean;
          kickoff_at: string;
          locks_at: string | null;
          round: string | null;
          status: Database['public']['Enums']['match_status'];
          updated_at: string;
        };
        Insert: {
          api_fixture_id?: number | null;
          away_logo?: string | null;
          away_score?: number | null;
          away_score_live?: number | null;
          away_team: string;
          competition_id?: string | null;
          elapsed?: number | null;
          home_logo?: string | null;
          home_score?: number | null;
          home_score_live?: number | null;
          home_team: string;
          id?: string;
          is_knockout?: boolean;
          kickoff_at: string;
          locks_at?: string | null;
          round?: string | null;
          status?: Database['public']['Enums']['match_status'];
          updated_at?: string;
        };
        Update: {
          api_fixture_id?: number | null;
          away_logo?: string | null;
          away_score?: number | null;
          away_score_live?: number | null;
          away_team?: string;
          competition_id?: string | null;
          elapsed?: number | null;
          home_logo?: string | null;
          home_score?: number | null;
          home_score_live?: number | null;
          home_team?: string;
          id?: string;
          is_knockout?: boolean;
          kickoff_at?: string;
          locks_at?: string | null;
          round?: string | null;
          status?: Database['public']['Enums']['match_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'matches_competition_id_fkey';
            columns: ['competition_id'];
            isOneToOne: false;
            referencedRelation: 'competitions';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          data: Json | null;
          id: string;
          read: boolean;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          data?: Json | null;
          id?: string;
          read?: boolean;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          data?: Json | null;
          id?: string;
          read?: boolean;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      polla_members: {
        Row: {
          id: string;
          joined_at: string;
          nickname: string | null;
          paid: boolean;
          paid_amount: number | null;
          paid_at: string | null;
          polla_id: string;
          role: Database['public']['Enums']['member_role'];
          user_id: string;
        };
        Insert: {
          id?: string;
          joined_at?: string;
          nickname?: string | null;
          paid?: boolean;
          paid_amount?: number | null;
          paid_at?: string | null;
          polla_id: string;
          role?: Database['public']['Enums']['member_role'];
          user_id: string;
        };
        Update: {
          id?: string;
          joined_at?: string;
          nickname?: string | null;
          paid?: boolean;
          paid_amount?: number | null;
          paid_at?: string | null;
          polla_id?: string;
          role?: Database['public']['Enums']['member_role'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'polla_members_polla_id_fkey';
            columns: ['polla_id'];
            isOneToOne: false;
            referencedRelation: 'pollas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'polla_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      pollas: {
        Row: {
          competition_id: string | null;
          created_at: string;
          created_by: string;
          entry_fee: number | null;
          fixed_prize: string | null;
          id: string;
          invite_code: string;
          joker_enabled: boolean;
          name: string;
          payment_deadline: string | null;
          payment_qr_url: string | null;
          prize_distribution: Database['public']['Enums']['prize_distribution'];
          prize_type: Database['public']['Enums']['prize_type'];
          scoring_rules: Json;
          status: Database['public']['Enums']['polla_status'];
        };
        Insert: {
          competition_id?: string | null;
          created_at?: string;
          created_by: string;
          entry_fee?: number | null;
          fixed_prize?: string | null;
          id?: string;
          invite_code?: string;
          joker_enabled?: boolean;
          name: string;
          payment_deadline?: string | null;
          payment_qr_url?: string | null;
          prize_distribution?: Database['public']['Enums']['prize_distribution'];
          prize_type?: Database['public']['Enums']['prize_type'];
          scoring_rules?: Json;
          status?: Database['public']['Enums']['polla_status'];
        };
        Update: {
          competition_id?: string | null;
          created_at?: string;
          created_by?: string;
          entry_fee?: number | null;
          fixed_prize?: string | null;
          id?: string;
          invite_code?: string;
          joker_enabled?: boolean;
          name?: string;
          payment_deadline?: string | null;
          payment_qr_url?: string | null;
          prize_distribution?: Database['public']['Enums']['prize_distribution'];
          prize_type?: Database['public']['Enums']['prize_type'];
          scoring_rules?: Json;
          status?: Database['public']['Enums']['polla_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'pollas_competition_id_fkey';
            columns: ['competition_id'];
            isOneToOne: false;
            referencedRelation: 'competitions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pollas_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      predictions: {
        Row: {
          away_pred: number;
          created_at: string;
          home_pred: number;
          id: string;
          is_joker: boolean;
          match_id: string;
          points: number | null;
          polla_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          away_pred: number;
          created_at?: string;
          home_pred: number;
          id?: string;
          is_joker?: boolean;
          match_id: string;
          points?: number | null;
          polla_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          away_pred?: number;
          created_at?: string;
          home_pred?: number;
          id?: string;
          is_joker?: boolean;
          match_id?: string;
          points?: number | null;
          polla_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'predictions_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'predictions_polla_id_fkey';
            columns: ['polla_id'];
            isOneToOne: false;
            referencedRelation: 'pollas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'predictions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          nickname: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          nickname?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          nickname?: string | null;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          p256dh: string;
          user_id: string;
        };
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          p256dh: string;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      round_standings: {
        Row: {
          captured_at: string;
          id: string;
          points: number;
          polla_id: string;
          position: number;
          round: string;
          user_id: string;
        };
        Insert: {
          captured_at?: string;
          id?: string;
          points: number;
          polla_id: string;
          position: number;
          round: string;
          user_id: string;
        };
        Update: {
          captured_at?: string;
          id?: string;
          points?: number;
          polla_id?: string;
          position?: number;
          round?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'round_standings_polla_id_fkey';
            columns: ['polla_id'];
            isOneToOne: false;
            referencedRelation: 'pollas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'round_standings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_polla_admin: { Args: { p_polla: string }; Returns: boolean };
      is_polla_member: { Args: { p_polla: string }; Returns: boolean };
      join_polla: { Args: { p_code: string }; Returns: string };
      polla_preview: {
        Args: { p_code: string };
        Returns: {
          id: string;
          name: string;
          prize_type: Database['public']['Enums']['prize_type'];
          entry_fee: number | null;
          competition_name: string | null;
          competition_logo: string | null;
          members_count: number;
          admin_name: string | null;
        }[];
      };
      polla_standings: {
        Args: { p_polla: string };
        Returns: {
          user_id: string;
          display_name: string | null;
          nickname: string | null;
          avatar_url: string | null;
          points: number;
          exacts: number;
          results: number;
          played: number;
          movement: number;
        }[];
      };
      score_prediction: {
        Args: {
          p_away: number;
          p_away_pred: number;
          p_home: number;
          p_home_pred: number;
          p_is_joker: boolean;
          p_knockout: boolean;
          p_rules: Json;
        };
        Returns: number;
      };
      settle_match: { Args: { p_match: string }; Returns: undefined };
    };
    Enums: {
      match_status: 'scheduled' | 'live' | 'finished' | 'postponed';
      member_role: 'admin' | 'player';
      polla_status: 'draft' | 'active' | 'finished';
      prize_distribution: 'winner' | 'top3';
      prize_type: 'pozo' | 'fijo' | 'sin';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      match_status: ['scheduled', 'live', 'finished', 'postponed'],
      member_role: ['admin', 'player'],
      polla_status: ['draft', 'active', 'finished'],
      prize_distribution: ['winner', 'top3'],
      prize_type: ['pozo', 'fijo', 'sin'],
    },
  },
} as const;
