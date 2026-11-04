import { getLanguage, onLanguageChange, t } from '../i18n/index.ts';
import { formatDecimal, parseDecimal } from '../i18n/number.ts';
import { ensureSession } from '../session.ts';
import { getData, onDataChange, updateData } from '../store.ts';

function parseCourts(input: string): number[] | null {
  const parts = input
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0) return null;
  const courts: number[] = [];
  for (const part of parts) {
    if (!/^-?\d+$/.test(part)) return null;
    courts.push(Number(part));
  }
  return courts;
}

export function renderSetup(root: HTMLElement): () => void {
  function render(): void {
    const data = getData();
    const session = ensureSession(data);
    const config = session.config;
    const language = getLanguage();

    root.innerHTML = `
      <form class="setup-form">
        <label>
          ${t('setup_courts_label')}
          <input type="text" name="courts" value="${config.courts.join(',')}" />
        </label>
        <p class="field-error" data-error="courts" hidden>${t('setup_courts_invalid')}</p>

        <label>
          ${t('setup_start_label')}
          <input type="time" name="start" value="${config.start}" />
        </label>

        <label>
          ${t('setup_end_label')}
          <input type="time" name="end" value="${config.end}" />
        </label>
        <p class="field-error" data-error="time" hidden>${t('setup_end_before_start')}</p>

        <label>
          ${t('setup_game_minutes_label')}
          <input type="number" name="gameMinutes" min="1" step="1" value="${config.gameMinutes}" />
        </label>

        <label>
          ${t('setup_gap_minutes_label')}
          <input type="number" name="gapMinutes" min="0" step="1" value="${config.gapMinutes}" />
        </label>

        <label>
          ${t('setup_beginner_threshold_label')}
          <input type="text" name="beginnerThreshold" value="${formatDecimal(config.beginnerThreshold, language)}" />
        </label>

        <label class="save-default">
          <input type="checkbox" name="saveAsDefault" checked />
          ${t('setup_save_default_label')}
        </label>
      </form>
    `;

    const form = root.querySelector('form') as HTMLFormElement;
    const courtsInput = form.elements.namedItem('courts') as HTMLInputElement;
    const startInput = form.elements.namedItem('start') as HTMLInputElement;
    const endInput = form.elements.namedItem('end') as HTMLInputElement;
    const gameMinutesInput = form.elements.namedItem('gameMinutes') as HTMLInputElement;
    const gapMinutesInput = form.elements.namedItem('gapMinutes') as HTMLInputElement;
    const thresholdInput = form.elements.namedItem('beginnerThreshold') as HTMLInputElement;
    const saveAsDefaultInput = form.elements.namedItem('saveAsDefault') as HTMLInputElement;
    const courtsError = root.querySelector('[data-error="courts"]') as HTMLElement;
    const timeError = root.querySelector('[data-error="time"]') as HTMLElement;

    function commit(apply: (config: typeof session.config) => boolean): void {
      updateData((d) => {
        const s = ensureSession(d);
        const ok = apply(s.config);
        if (ok && saveAsDefaultInput.checked) {
          d.defaults = { ...s.config };
        }
      });
    }

    courtsInput.addEventListener('change', () => {
      const courts = parseCourts(courtsInput.value);
      courtsError.hidden = courts !== null;
      if (courts === null) return;
      commit((c) => {
        c.courts = courts;
        return true;
      });
    });

    function commitTimes(): void {
      const valid = startInput.value < endInput.value;
      timeError.hidden = valid;
      if (!valid) return;
      commit((c) => {
        c.start = startInput.value;
        c.end = endInput.value;
        return true;
      });
    }
    startInput.addEventListener('change', commitTimes);
    endInput.addEventListener('change', commitTimes);

    gameMinutesInput.addEventListener('change', () => {
      commit((c) => {
        c.gameMinutes = Number(gameMinutesInput.value);
        return true;
      });
    });

    gapMinutesInput.addEventListener('change', () => {
      commit((c) => {
        c.gapMinutes = Number(gapMinutesInput.value);
        return true;
      });
    });

    thresholdInput.addEventListener('change', () => {
      const value = parseDecimal(thresholdInput.value);
      if (value === null) return;
      commit((c) => {
        c.beginnerThreshold = value;
        return true;
      });
    });
  }

  render();
  const unsubscribeLanguage = onLanguageChange(render);
  const unsubscribeData = onDataChange(render);

  return () => {
    unsubscribeLanguage();
    unsubscribeData();
  };
}
