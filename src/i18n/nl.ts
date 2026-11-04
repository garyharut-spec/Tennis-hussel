import type { Messages } from './types.ts';

export const nl: Messages = {
  appTitle: 'Hussel',
  tab_setup: 'Instellingen',
  tab_players: 'Spelers',
  tab_now: 'Nu',
  tab_schedule: 'Schema',
  tab_stats: 'Statistieken',
  playerCount: (n) => (n === 1 ? '1 speler' : `${n} spelers`),
};
