export type Language = 'en' | 'nl';

export interface Messages {
  appTitle: string;

  setup_courts_invalid: string;
  setup_start_label: string;
  setup_end_label: string;
  setup_end_before_start: string;
  setup_beginner_threshold_label: string;
  setup_save_default_label: string;

  players_add_invalid_level: string;
  players_sort_name: string;
  players_delete_button: string;
  players_empty_state: string;
  players_duplicate_prompt: (name: string) => string;
  players_initial_placeholder: string;
  players_confirm_button: string;
  players_cancel_button: string;


  schedule_lock_button: string;
  schedule_unlock_button: string;
  schedule_regenerate_button: string;
  schedule_undo_button: string;
  schedule_locked_notice: string;
  schedule_replan_banner: string;
  schedule_replan_button: string;
  schedule_generate_banner: string;
  schedule_generate_button: string;
  schedule_swap_hint: string;
  schedule_empty_grid: string;
  schedule_no_courts_message: string;

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

  rounds_played_count: (n: number) => string;
  round_tag_now: string;
  round_tag_next: string;
  round_resting_label: string;
  round_resting_empty: string;
  court_label: (n: number) => string;
  menu_button_label: string;
  menu_players: string;
  menu_stats: string;
  settings_button_label: string;
  close_button_label: string;
  back_button_label: string;
  add_player_label: string;
  add_player_placeholder: string;
  add_player_new_level_placeholder: string;
  add_player_button: string;
  players_present_heading: (n: number) => string;
  players_mark_left_button: string;
  players_sort_toggle_name: string;
  players_sort_toggle_level: string;
  player_edit_label: string;
  settings_title: string;
  settings_courts_label: string;
  settings_courts_count: (n: number) => string;
  settings_courts_hint: string;
  settings_add_court_label: string;
  settings_round_minutes_label: string;
  settings_done_button: string;
  header_next_changeover: string;
}
