import type { Messages } from './types.ts';

export const en: Messages = {
  appTitle: 'Hussel',
  tab_setup: 'Setup',
  tab_players: 'Players',
  tab_now: 'Now',
  tab_schedule: 'Schedule',
  tab_stats: 'Stats',
  playerCount: (n) => (n === 1 ? '1 player' : `${n} players`),
};
