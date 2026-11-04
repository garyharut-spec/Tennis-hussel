import { getLanguage, onLanguageChange, setLanguage, t, type Language } from './i18n/index.ts';

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

  function renderStaticText(): void {
    title.textContent = t('appTitle');
    for (const tab of TABS) {
      const button = nav.querySelector<HTMLButtonElement>(`[data-tab="${tab}"]`);
      if (button) button.textContent = t(TAB_LABEL_KEYS[tab]);
    }
    renderContent();
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

  function renderContent(): void {
    content.textContent = t(TAB_LABEL_KEYS[activeTab]);
  }

  nav.innerHTML = TABS.map((tab) => `<button type="button" data-tab="${tab}" class="tab-button"></button>`).join('');

  nav.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-tab]');
    if (!button) return;
    activeTab = button.dataset['tab'] as Tab;
    updateActiveTab();
    renderContent();
  });

  for (const button of langButtons) {
    button.addEventListener('click', () => {
      setLanguage(button.dataset['lang'] as Language);
    });
  }

  const unsubscribe = onLanguageChange(() => {
    renderStaticText();
    updateActiveLanguage();
  });

  renderStaticText();
  updateActiveTab();
  updateActiveLanguage();

  return unsubscribe;
}
