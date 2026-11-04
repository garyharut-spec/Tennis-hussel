import { getLanguage, onLanguageChange, setLanguage, t, type Language } from './i18n/index.ts';
import { renderNow } from './screens/now.ts';
import { renderPlayers } from './screens/players.ts';
import { renderSchedule } from './screens/schedule.ts';
import { renderSetup } from './screens/setup.ts';

export const TABS = ['setup', 'players', 'now', 'schedule', 'stats'] as const;
export type Tab = (typeof TABS)[number];

const TAB_LABEL_KEYS = {
  setup: 'tab_setup',
  players: 'tab_players',
  now: 'tab_now',
  schedule: 'tab_schedule',
  stats: 'tab_stats',
} as const;

export function renderApp(root: HTMLElement): () => void {
  let activeTab: Tab = 'now';
  let screenCleanup: (() => void) | undefined;

  root.innerHTML = `
    <header class="app-header">
      <h1></h1>
      <div class="lang-toggle">
        <button type="button" data-lang="en" class="lang-button">EN</button>
        <button type="button" data-lang="nl" class="lang-button">NL</button>
      </div>
    </header>
    <nav class="tab-nav"></nav>
    <main class="tab-content"></main>
  `;

  const title = root.querySelector('h1') as HTMLElement;
  const nav = root.querySelector('.tab-nav') as HTMLElement;
  const content = root.querySelector('.tab-content') as HTMLElement;
  const langButtons = root.querySelectorAll<HTMLButtonElement>('[data-lang]');

  function renderScreen(): void {
    screenCleanup?.();
    screenCleanup = undefined;
    content.innerHTML = '';
    if (activeTab === 'setup') {
      screenCleanup = renderSetup(content);
    } else if (activeTab === 'players') {
      screenCleanup = renderPlayers(content);
    } else if (activeTab === 'now') {
      screenCleanup = renderNow(content);
    } else if (activeTab === 'schedule') {
      screenCleanup = renderSchedule(content);
    } else {
      content.textContent = t(TAB_LABEL_KEYS[activeTab]);
    }
  }

  function renderStaticText(): void {
    title.textContent = t('appTitle');
    for (const tab of TABS) {
      const button = nav.querySelector<HTMLButtonElement>(`[data-tab="${tab}"]`);
      if (button) button.textContent = t(TAB_LABEL_KEYS[tab]);
    }
    renderScreen();
  }

  function updateActiveTab(): void {
    for (const button of nav.querySelectorAll<HTMLButtonElement>('[data-tab]')) {
      button.classList.toggle('active', button.dataset['tab'] === activeTab);
    }
  }

  function updateActiveLanguage(): void {
    const language = getLanguage();
    for (const button of langButtons) {
      button.classList.toggle('active', button.dataset['lang'] === language);
    }
  }

  nav.innerHTML = TABS.map((tab) => `<button type="button" data-tab="${tab}" class="tab-button"></button>`).join('');

  nav.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-tab]');
    if (!button) return;
    activeTab = button.dataset['tab'] as Tab;
    updateActiveTab();
    renderScreen();
  });

  for (const button of langButtons) {
    button.addEventListener('click', () => {
      setLanguage(button.dataset['lang'] as Language);
    });
  }

  const unsubscribeLanguage = onLanguageChange(() => {
    renderStaticText();
    updateActiveLanguage();
  });

  renderStaticText();
  updateActiveTab();
  updateActiveLanguage();

  return () => {
    screenCleanup?.();
    unsubscribeLanguage();
  };
}
