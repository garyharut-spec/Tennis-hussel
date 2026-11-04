import type { Messages } from './types.ts';

export const nl: Messages = {
  appTitle: 'Hussel',
  tab_setup: 'Instellingen',
  tab_players: 'Spelers',
  tab_now: 'Nu',
  tab_schedule: 'Schema',
  tab_stats: 'Statistieken',
  playerCount: (n) => (n === 1 ? '1 speler' : `${n} spelers`),

  setup_courts_label: 'Banen',
  setup_courts_invalid: 'Voer baannummers in, gescheiden door komma’s, bijv. 1,2,3,4',
  setup_start_label: 'Starttijd',
  setup_end_label: 'Eindtijd',
  setup_end_before_start: 'Eindtijd moet na de starttijd liggen',
  setup_game_minutes_label: 'Speeltijd (minuten)',
  setup_gap_minutes_label: 'Pauze (minuten)',
  setup_beginner_threshold_label: 'Beginnersgrens',
  setup_save_default_label: 'Opslaan als standaard',

  players_add_name_placeholder: 'Naam',
  players_add_level_placeholder: 'Niveau',
  players_add_button: 'Toevoegen',
  players_add_invalid_level: 'Voer een niveau in van 1,0 tot 9,0',
  players_sort_label: 'Sorteren op',
  players_sort_name: 'Naam',
  players_sort_level: 'Niveau',
  players_present_label: 'Aanwezig',
  players_delete_button: 'Verwijderen',
  players_beginner_marker: 'Beginner',
  players_present_count: (n) => (n === 1 ? '1 aanwezig' : `${n} aanwezig`),
  players_empty_state: 'Nog geen spelers',
  players_duplicate_prompt: (name) =>
    `Er is al een speler met de naam "${name}". Voer voor beiden een achterletter in.`,
  players_initial_placeholder: 'Achterletter',
  players_confirm_button: 'Bevestigen',
  players_cancel_button: 'Annuleren',
};
