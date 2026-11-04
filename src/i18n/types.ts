export type Language = 'en' | 'nl';

export interface Messages {
  appTitle: string;
  tab_setup: string;
  tab_players: string;
  tab_now: string;
  tab_schedule: string;
  tab_stats: string;
  playerCount: (n: number) => string;

  setup_courts_label: string;
  setup_courts_invalid: string;
  setup_start_label: string;
  setup_end_label: string;
  setup_end_before_start: string;
  setup_game_minutes_label: string;
  setup_gap_minutes_label: string;
  setup_beginner_threshold_label: string;
  setup_save_default_label: string;

  players_add_name_placeholder: string;
  players_add_level_placeholder: string;
  players_add_button: string;
  players_add_invalid_level: string;
  players_sort_label: string;
  players_sort_name: string;
  players_sort_level: string;
  players_present_label: string;
  players_delete_button: string;
  players_beginner_marker: string;
  players_present_count: (n: number) => string;
  players_empty_state: string;
  players_duplicate_prompt: (name: string) => string;
  players_initial_placeholder: string;
  players_confirm_button: string;
  players_cancel_button: string;

  now_sitting_out_label: string;
  now_no_round: string;
  now_time_remaining_label: string;
  round_heading: (n: number) => string;

  schedule_round_select_label: string;
  schedule_lock_button: string;
  schedule_unlock_button: string;
  schedule_regenerate_button: string;
  schedule_undo_button: string;
  schedule_notes_placeholder: string;
  schedule_locked_notice: string;
  schedule_replan_banner: string;
  schedule_replan_button: string;
  schedule_swap_hint: string;
  schedule_swap_cancel: string;
  schedule_empty_grid: string;

  explain_ODD_BEGINNERS: (n: number) => string;
  explain_FOUR_BEGINNERS: string;
  explain_BEGINNERS_SAME_TEAM: string;
  explain_TEAM_IMBALANCE: string;
  explain_REPEAT_PARTNER: string;
  explain_REPEAT_OPPONENT: string;
  explain_SAME_COURT_AS_LAST_ROUND: string;

  now_sound_toggle_label: string;
  now_wall_mode_label: string;

  stats_games_played_heading: string;
  stats_games_count: (n: number) => string;
  stats_no_players: string;
  stats_history_heading: string;
  stats_history_players_count: (n: number) => string;
  stats_no_history: string;
  stats_close_session_button: string;
  stats_close_confirm_message: string;
  stats_close_confirm_button: string;
  stats_close_cancel_button: string;
  stats_export_button: string;
  stats_import_button: string;
  stats_import_error: string;
  stats_backup_reminder: string;
}
