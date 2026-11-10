import { onLanguageChange, t } from '../i18n/index.ts';
import { isSoundEnabled, isWallMode, setSoundEnabled, setWallMode } from '../preferences.ts';
import { renderStats } from './stats.ts';

export interface MenuOptions {
  showPlayersEntry: boolean;
  onPlayers: () => void;
  onClose: () => void;
}

/** The ☰ menu: players (narrow screens), display toggles, then stats, backup and close session. */
export function renderMenu(root: HTMLElement, options: MenuOptions): () => void {
  let statsCleanup: (() => void) | undefined;

  function render(): void {
    statsCleanup?.();
    root.innerHTML = `
      <div class="menu">
        <div class="menu-header">
          <h2>${t('menu_button_label')}</h2>
          <button type="button" class="menu-close">${t('close_button_label')}</button>
        </div>
        ${options.showPlayersEntry ? `<button type="button" class="menu-players">${t('menu_players')}</button>` : ''}
        <div class="now-toggles">
          <label><input type="checkbox" class="sound-toggle" ${isSoundEnabled() ? 'checked' : ''} /> ${t('now_sound_toggle_label')}</label>
          <label><input type="checkbox" class="wall-toggle" ${isWallMode() ? 'checked' : ''} /> ${t('now_wall_mode_label')}</label>
        </div>
        <h3>${t('menu_stats')}</h3>
        <div class="menu-stats-section"></div>
      </div>`;

    root.querySelector('.menu-close')!.addEventListener('click', options.onClose);
    root.querySelector('.menu-players')?.addEventListener('click', options.onPlayers);
    (root.querySelector('.sound-toggle') as HTMLInputElement).addEventListener('change', (e) => {
      setSoundEnabled((e.target as HTMLInputElement).checked);
    });
    (root.querySelector('.wall-toggle') as HTMLInputElement).addEventListener('change', (e) => {
      setWallMode((e.target as HTMLInputElement).checked);
    });
    statsCleanup = renderStats(root.querySelector('.menu-stats-section') as HTMLElement);
  }

  render();
  const unsubscribeLanguage = onLanguageChange(render);
  return () => {
    statsCleanup?.();
    unsubscribeLanguage();
  };
}
