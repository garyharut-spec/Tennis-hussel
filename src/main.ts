import './style.css';
import { renderApp } from './app.ts';
import { applyTheme } from './preferences.ts';

applyTheme();

const root = document.querySelector<HTMLDivElement>('#app');
if (root) {
  renderApp(root);
}

// Only in production builds: in dev a cache-first worker would keep serving stale files.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // offline support is a nice-to-have; ignore registration failures
    });
  });
}
