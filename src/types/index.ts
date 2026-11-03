export type PitchType = 'Standard' | 'Green Top' | 'Dust Bowl' | 'Flat Track';

export type PlayerRole = 'Batter' | 'Bowler' | 'All-Rounder' | 'Wicketkeeper';

export type PlayerTier = 'Marquee' | 'Elite' | 'Capped' | 'Uncapped';

export interface PlayerCricketStats {
  matches: number;
  innings?: number;
  batting_runs: number;
  batting_avg: number;
  batting_strike_rate: number;
  fifties?: number;
  hundreds?: number;
  highest_score?: string;
  boundary_percent?: number;
  bowling_wickets: number;
  bowling_avg: number;
  bowling_strike_rate?: number;
  bowling_economy: number;
  best_bowling?: string;
}

export interface RawPlayer {
  id: number;
  display_name: string;
  country: string;
  role: PlayerRole;
  base_price: number;
  ipl_team_2026?: string;
  batting_style?: string;
  bowling_style?: string;
  specialization?: string;
  tier?: PlayerTier;
  age?: number;
  matches?: number;
  batting_runs: number;
  batting_avg: number;
  batting_strike_rate: number;
  fifties?: number;
  hundreds?: number;
  highest_score?: string;
  boundary_percent?: number;
  bowling_wickets: number;
  bowling_avg: number;
  bowling_strike_rate: number;
  bowling_economy: number;
  four_w?: number;
  five_w?: number;
  best_bowling?: string;
  career_highlight: string;
  t20i_stats?: PlayerCricketStats;
  overall_t20_stats?: PlayerCricketStats;
}

export interface AuctionPlayer extends RawPlayer {
  auction_player_id: number;
  auction_id: number;
  player_id: number;
  status: 'Available' | 'Sold' | 'Unsold';
  sold_price: number | null;
  auction_team_id: number | null;
  ai_rating: number;
  true_value: number;
}

export interface Franchise {
  id: number;
  name: string;
  short_name?: string;
  primary_color?: string;
  secondary_color?: string;
  owner_token?: string | null;
}

export interface AuctionTeam {
  id: number;
  auction_id: number;
  franchise_id: number;
  name: string;
  short_name?: string;
  primary_color?: string;
  owner_token?: string | null;
  purse: number;
  squad_size: number;
  is_finished: number;
  sudden_death_draws_left: number;
  sudden_death_needs: number;
  spent: number;
}

export interface AuctionSession {
  id: number;
  name: string;
  pitch_type: PitchType;
  min_squad_size: number;
  timer_seconds: number;
  sudden_death_active: number;
  date_created: string;
  status: 'In Progress' | 'Paused' | 'Completed';
  live_state?: string;
}

export interface FranchiseHistoryRecord {
  id: number;
  franchise_id: number;
  franchise_name?: string;
  auction_name: string;
  tbi_score: number;
  is_winner: number;
  total_spent: number;
  date: string;
  roster?: Array<{
    display_name: string;
    role: string;
    sold_price: number;
    ai_rating: number;
  }>;
}

export interface HallOfFameEntry {
  id: number;
  name: string;
  matches_played: number;
  trophies: number;
  avg_tbi: number;
  avg_spent: number;
}

export interface ReportCard {
  franchise_id: number;
  team_name: string;
  tbi_score: number;
  stars: number;
  spent: number;
  highlights: string[];
  drawbacks: string[];
  ai_verdict?: string;
}

export interface LiveHighlights {
  highest: {
    display_name: string;
    sold_price: number;
    team_name: string;
    team_color?: string;
    role?: string;
    tier?: string;
  } | null;
  steal: {
    display_name: string;
    sold_price: number;
    true_value: number;
    savings: number;
    team_name: string;
    team_color?: string;
  } | null;
  overpaid: {
    display_name: string;
    sold_price: number;
    true_value: number;
    premium: number;
    team_name: string;
    team_color?: string;
  } | null;
  recentSales?: Array<{
    player_id: number;
    display_name: string;
    role: string;
    tier?: string;
    status: 'Sold' | 'Unsold';
    sold_price?: number | null;
    true_value?: number;
    team_name?: string;
    team_color?: string;
  }>;
  totalSpent?: number;
  totalSold?: number;
  totalUnsold?: number;
  topSpender?: {
    name: string;
    spent: number;
    color: string;
  } | null;
}

export interface BroadcastState {
  player: AuctionPlayer | null;
  bid: number;
  time: number;
  locked: boolean;
  activeTeam: number | null;
}

export interface AiLiveAdviceResponse {
  recommendation: 'STRONG_BID' | 'CAUTIOUS_BID' | 'PASS_RECOMMENDED';
  target_max_bid: number;
  tactical_reasoning: string;
  pitch_synergy: string;
  squad_fit: string;
  isAiPowered: boolean;
  apiKeyNotice?: boolean;
}

export interface AiSquadAuditResponse {
  teamName: string;
  overallRating: number;
  keyStrength: string;
  criticalWeakness: string;
  impactPlayerRecommendation: string;
  championshipVerdict: string;
  isAiPowered: boolean;
  apiKeyNotice?: boolean;
}
