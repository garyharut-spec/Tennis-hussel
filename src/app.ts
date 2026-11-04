export const TABS = ['setup', 'players', 'now', 'schedule', 'stats'] as const;
export type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  setup: 'Setup',
  players: 'Players',
  now: 'Now',
  schedule: 'Schedule',
  stats: 'Stats',
};

export function renderApp(root: HTMLElement): void {
  let activeTab: Tab = 'now';

  root.innerHTML = `
    <header class="app-header">
      <h1>Hussel</h1>
    </header>
    <nav class="tab-nav"></nav>
    <main class="tab-content"></main>
  `;

  const nav = root.querySelector('.tab-nav') as HTMLElement;
  const content = root.querySelector('.tab-content') as HTMLElement;

  function updateActiveTab(): void {
    for (const button of nav.querySelectorAll<HTMLButtonElement>('[data-tab]')) {
      button.classList.toggle('active', button.dataset['tab'] === activeTab);
    }
  }

  function renderContent(): void {
    content.textContent = TAB_LABELS[activeTab];
  }

  nav.innerHTML = TABS.map(
    (tab) => `<button type="button" data-tab="${tab}" class="tab-button">${TAB_LABELS[tab]}</button>`,
  ).join('');

  nav.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-tab]');
    if (!button) return;
    activeTab = button.dataset['tab'] as Tab;
    updateActiveTab();
    renderContent();
  });

  updateActiveTab();
  renderContent();
}
