export type Language = 'en' | 'nl';

export interface Messages {
  appTitle: string;
  tab_setup: string;
  tab_players: string;
  tab_now: string;
  tab_schedule: string;
  tab_stats: string;
  playerCount: (n: number) => string;
}
