import './style.css';
import { renderApp } from './app.ts';

const root = document.querySelector<HTMLDivElement>('#app');
if (root) {
  renderApp(root);
}
