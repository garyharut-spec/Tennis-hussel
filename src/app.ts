import { playChangeoverAlert } from './changeoverAlert.ts';
import { getLanguage, onLanguageChange, setLanguage, t, type Language } from './i18n/index.ts';
import { getEffectiveTheme, isSoundEnabled, isWallMode, setTheme } from './preferences.ts';
import { roundStatus, timeGridFor } from './schedule.ts';
import { renderMenu } from './screens/menu.ts';
import { renderPlayerPanel } from './screens/playerPanel.ts';
import { renderRounds } from './screens/rounds.ts';
import { renderSettings } from './screens/settings.ts';
import { ensureSession } from './session.ts';
import { getData, onDataChange } from './store.ts';
import { releaseWakeLock, requestWakeLock } from './wakeLock.ts';

type Overlay = 'settings' | 'menu';

export function renderApp(root: HTMLElement): () => void {
  let overlayCleanup: (() => void) | undefined;
  let lastSeconds: number | null = null;

  root.innerHTML = `
    <header class="app-header">
      <button type="button" class="menu-toggle">☰</button>
      <h1></h1>
      <span class="countdown"></span>
      <div class="lang-toggle">
        <button type="button" data-lang="en" class="lang-button">EN</button>
        <button type="button" data-lang="nl" class="lang-button">NL</button>
      </div>
      <button type="button" class="cog-button">⚙</button>
      <button type="button" class="theme-button"></button>
    </header>
    <div class="layout" data-mobile-view="rounds">
      <aside class="player-aside">
        <button type="button" class="back-button"></button>
        <div class="player-panel"></div>
      </aside>
      <main class="rounds-main"></main>
    </div>
    <div class="overlay" hidden><div class="overlay-body"></div></div>
  `;

  const title = root.querySelector('h1') as HTMLElement;
  const countdown = root.querySelector('.countdown') as HTMLElement;
  const menuToggle = root.querySelector('.menu-toggle') as HTMLButtonElement;
  const cogButton = root.querySelector('.cog-button') as HTMLButtonElement;
  const themeButton = root.querySelector('.theme-button') as HTMLButtonElement;
  const backButton = root.querySelector('.back-button') as HTMLButtonElement;
  const layout = root.querySelector('.layout') as HTMLElement;
  const overlay = root.querySelector('.overlay') as HTMLElement;
  const overlayBody = root.querySelector('.overlay-body') as HTMLElement;
  const langButtons = root.querySelectorAll<HTMLButtonElement>('[data-lang]');

  const cleanups = [
    renderPlayerPanel(root.querySelector('.player-panel') as HTMLElement),
    renderRounds(root.querySelector('.rounds-main') as HTMLElement),
  ];

  function closeOverlay(): void {
    overlayCleanup?.();
    overlayCleanup = undefined;
    overlayBody.innerHTML = '';
    overlay.hidden = true;
  }

  function openOverlay(kind: Overlay): void {
    closeOverlay();
    overlay.hidden = false;
    overlayCleanup =
      kind === 'settings'
        ? renderSettings(overlayBody, closeOverlay)
        : renderMenu(overlayBody, {
            onClose: closeOverlay,
          });
  }

  function updateCountdown(): void {
    const session = ensureSession(getData());
    const now = new Date();
    const slot = timeGridFor(session).find((s) => roundStatus(session, s.index, now) === 'now');
    if (!slot) {
      countdown.textContent = '';
      lastSeconds = null;
      return;
    }
    const [h, m] = slot.end.split(':').map(Number);
    const end = new Date(now);
    end.setHours(h ?? 0, m ?? 0, 0, 0);
    const total = Math.max(0, Math.round((end.getTime() - now.getTime()) / 1000));
    if (isSoundEnabled() && lastSeconds !== null && lastSeconds > 0 && total === 0) playChangeoverAlert();
    lastSeconds = total;
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    countdown.textContent = `${t('header_next_changeover')}: ${mm}:${ss}`;
  }

  function renderStaticText(): void {
    title.textContent = t('appTitle');
    menuToggle.setAttribute('aria-label', t('menu_button_label'));
    cogButton.setAttribute('aria-label', t('settings_button_label'));
    const dark = getEffectiveTheme() === 'dark';
    themeButton.textContent = dark ? '☀' : '☾';
    themeButton.setAttribute('aria-label', t(dark ? 'theme_switch_to_light' : 'theme_switch_to_dark'));
    backButton.textContent = `← ${t('back_button_label')}`;
    const language = getLanguage();
    for (const button of langButtons) button.classList.toggle('active', button.dataset['lang'] === language);
    updateCountdown();
  }

  menuToggle.addEventListener('click', () => openOverlay('menu'));
  cogButton.addEventListener('click', () => openOverlay('settings'));
  themeButton.addEventListener('click', () => {
    setTheme(getEffectiveTheme() === 'dark' ? 'light' : 'dark');
    renderStaticText();
  });
  backButton.addEventListener('click', () => {
    layout.dataset['mobileView'] = 'rounds';
  });
  for (const button of langButtons) {
    button.addEventListener('click', () => setLanguage(button.dataset['lang'] as Language));
  }

  const unsubscribeLanguage = onLanguageChange(renderStaticText);
  const unsubscribeData = onDataChange(updateCountdown);
  const timer = setInterval(updateCountdown, 1000);

  renderStaticText();
  if (isWallMode()) document.body.classList.add('wall-mode');
  void requestWakeLock();

  return () => {
    clearInterval(timer);
    unsubscribeLanguage();
    unsubscribeData();
    closeOverlay();
    for (const cleanup of cleanups) cleanup();
    releaseWakeLock();
  };
}
