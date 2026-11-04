import './style.css';
import { renderApp } from './app.ts';

const root = document.querySelector<HTMLDivElement>('#app');
if (root) {
  renderApp(root);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // offline support is a nice-to-have; ignore registration failures
    });
  });
}
