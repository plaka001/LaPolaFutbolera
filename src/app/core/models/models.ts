// Modelos de dominio: alias cómodos sobre los tipos generados de la BD.
import { Tables, Enums } from './database.types';

export type Profile = Tables<'profiles'>;
export type Competition = Tables<'competitions'>;
export type Match = Tables<'matches'>;
export type Polla = Tables<'pollas'>;
export type PollaMember = Tables<'polla_members'>;
export type Prediction = Tables<'predictions'>;
export type RoundStanding = Tables<'round_standings'>;
export type AppNotification = Tables<'notifications'>;
export type PushSubscriptionRow = Tables<'push_subscriptions'>;

export type PrizeType = Enums<'prize_type'>;
export type PrizeDistribution = Enums<'prize_distribution'>;
export type PollaStatus = Enums<'polla_status'>;
export type MemberRole = Enums<'member_role'>;
export type MatchStatus = Enums<'match_status'>;

// Forma del jsonb `pollas.scoring_rules` (ver ESPECIFICACIONES §9).
export interface ScoringRules {
  result: { group: number; knockout: number };
  home_goals: { group: number; knockout: number };
  away_goals: { group: number; knockout: number };
  goal_diff: { group: number; knockout: number };
  joker_multiplier: number;
}
