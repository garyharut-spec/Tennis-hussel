import { isPresent, setPresent } from '../attendance.ts';
import { escapeHtml } from '../escape.ts';
import { randomId } from '../id.ts';
import { getLanguage, onLanguageChange, t } from '../i18n/index.ts';
import { formatDecimal } from '../i18n/number.ts';
import { parseLevel } from '../level.ts';
import { displayName } from '../members.ts';
import { roundsPlayedBefore } from '../roundsPlayed.ts';
import { firstReplanIndex } from '../schedule.ts';
import { ensureSession } from '../session.ts';
import { getData, onDataChange, updateData } from '../store.ts';
import { playerCardHtml } from '../ui/playerCard.ts';
import type { Member } from '../types.ts';

interface PendingDuplicate {
  firstName: string;
  level: number;
  existingMemberId: string;
}

/** The player list: "Add player" dropdown on top, then the present players. */
export function renderPlayerPanel(root: HTMLElement): () => void {
  let sortByLevel = false;
  let editingId: string | null = null;
  let pendingDuplicate: PendingDuplicate | null = null;
  let draftName = '';
  let draftLevel = '';
  let showError = false;

  const sameName = (m: Member, text: string) => displayName(m).toLowerCase() === text.trim().toLowerCase();

  function render(): void {
    const data = getData();
    const session = ensureSession(data);
    const language = getLanguage();
    const upcoming = firstReplanIndex(session);

    const saved = data.roster.filter((m) => !isPresent(session, m.id));
    const present = data.roster
      .filter((m) => isPresent(session, m.id))
      .sort((a, b) => (sortByLevel ? a.level - b.level || displayName(a).localeCompare(displayName(b)) : displayName(a).localeCompare(displayName(b))));
    const isNewName = draftName.trim() !== '' && !data.roster.some((m) => sameName(m, draftName));

    root.innerHTML = `
      <form class="add-player">
        <label class="add-player-label">${t('add_player_label')}
          <input type="text" name="name" list="saved-players" placeholder="${escapeHtml(t('add_player_placeholder'))}" autocomplete="off" value="${escapeHtml(draftName)}" />
        </label>
        <datalist id="saved-players">${saved.map((m) => `<option value="${escapeHtml(displayName(m))}"></option>`).join('')}</datalist>
        <input type="text" name="level" inputmode="decimal" placeholder="${escapeHtml(t('add_player_new_level_placeholder'))}" value="${escapeHtml(draftLevel)}" ${isNewName ? '' : 'hidden'} />
        <button type="submit">${t('add_player_button')}</button>
      </form>
      <p class="field-error" ${showError ? '' : 'hidden'}>${t('players_add_invalid_level')}</p>
      <div class="duplicate-prompt" hidden></div>

      <div class="present-header">
        <h2 class="present-heading">${t('players_present_heading', present.length)}</h2>
        <button type="button" class="sort-toggle">${sortByLevel ? t('players_sort_toggle_level') : t('players_sort_toggle_name')}</button>
      </div>
      <ul class="player-list">
        ${
          present.length === 0
            ? `<li class="empty-state">${t('players_empty_state')}</li>`
            : present
                .map(
                  (m) => `
          <li class="player-row" data-member-id="${escapeHtml(m.id)}">
            <div class="player-row-main">
              ${playerCardHtml(m.id, m, roundsPlayedBefore(session, m.id, upcoming))}
              <button type="button" class="card-cog" aria-label="${escapeHtml(t('player_edit_label'))}" data-member-id="${escapeHtml(m.id)}">⚙</button>
            </div>
            ${
              editingId === m.id
                ? `<div class="player-edit">
                    <input type="text" class="level-input" inputmode="decimal" value="${formatDecimal(m.level, language)}" data-member-id="${escapeHtml(m.id)}" />
                    <button type="button" class="mark-left-button" data-member-id="${escapeHtml(m.id)}">${t('players_mark_left_button')}</button>
                    <button type="button" class="delete-button" data-member-id="${escapeHtml(m.id)}">${t('players_delete_button')}</button>
                  </div>`
                : `<button type="button" class="mark-left-button" data-member-id="${escapeHtml(m.id)}">${t('players_mark_left_button')}</button>`
            }
          </li>`,
                )
                .join('')
        }
      </ul>`;

    const form = root.querySelector('form.add-player') as HTMLFormElement;
    const nameInput = form.elements.namedItem('name') as HTMLInputElement;
    const levelInput = form.elements.namedItem('level') as HTMLInputElement;
    const errorEl = root.querySelector('.field-error') as HTMLElement;
    const duplicateEl = root.querySelector('.duplicate-prompt') as HTMLElement;

    nameInput.addEventListener('input', () => {
      draftName = nameInput.value;
      levelInput.hidden = !(draftName.trim() !== '' && !getData().roster.some((m) => sameName(m, draftName)));
    });
    levelInput.addEventListener('input', () => {
      draftLevel = levelInput.value;
    });

    function clearDraft(): void {
      draftName = '';
      draftLevel = '';
      showError = false;
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = nameInput.value.trim();
      if (!text) return;
      const existing = getData().roster.find((m) => sameName(m, text));
      if (existing) {
        clearDraft();
        updateData((d) => setPresent(ensureSession(d), existing.id, true));
        return;
      }
      const level = parseLevel(levelInput.value);
      if (level === null) {
        draftName = text;
        draftLevel = levelInput.value;
        errorEl.hidden = false;
        showError = true;
        return;
      }
      const clash = getData().roster.find((m) => !m.lastInitial && m.firstName.trim().toLowerCase() === text.toLowerCase());
      if (clash) {
        pendingDuplicate = { firstName: text, level, existingMemberId: clash.id };
        renderDuplicatePrompt(pendingDuplicate);
        return;
      }
      clearDraft();
      const id = randomId();
      updateData((d) => {
        d.roster.push({ id, firstName: text, level });
        setPresent(ensureSession(d), id, true);
      });
    });

    function renderDuplicatePrompt(pending: PendingDuplicate): void {
      duplicateEl.hidden = false;
      duplicateEl.innerHTML = `
        <p>${escapeHtml(t('players_duplicate_prompt', pending.firstName))}</p>
        <label>${t('players_initial_placeholder')} (${escapeHtml(pending.firstName)})
          <input type="text" name="newInitial" maxlength="1" />
        </label>
        <label>${t('players_initial_placeholder')} (${escapeHtml(pending.firstName)}, ${t('players_sort_name').toLowerCase()} 2)
          <input type="text" name="existingInitial" maxlength="1" />
        </label>
        <button type="button" data-action="confirm">${t('players_confirm_button')}</button>
        <button type="button" data-action="cancel">${t('players_cancel_button')}</button>`;
      const newInitial = duplicateEl.querySelector('[name="newInitial"]') as HTMLInputElement;
      const existingInitial = duplicateEl.querySelector('[name="existingInitial"]') as HTMLInputElement;
      duplicateEl.querySelector('[data-action="confirm"]')!.addEventListener('click', () => {
        const a = newInitial.value.trim();
        const b = existingInitial.value.trim();
        if (!a || !b) return;
        const id = randomId();
        pendingDuplicate = null;
        clearDraft();
        updateData((d) => {
          const old = d.roster.find((m) => m.id === pending.existingMemberId);
          if (old) old.lastInitial = b;
          d.roster.push({ id, firstName: pending.firstName, level: pending.level, lastInitial: a });
          setPresent(ensureSession(d), id, true);
        });
      });
      duplicateEl.querySelector('[data-action="cancel"]')!.addEventListener('click', () => {
        pendingDuplicate = null;
        render();
      });
    }
    if (pendingDuplicate) renderDuplicatePrompt(pendingDuplicate);

    root.querySelector('.sort-toggle')!.addEventListener('click', () => {
      sortByLevel = !sortByLevel;
      render();
    });

    root.querySelectorAll<HTMLButtonElement>('.card-cog').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset['memberId']!;
        editingId = editingId === id ? null : id;
        render();
      });
    });

    root.querySelectorAll<HTMLButtonElement>('.mark-left-button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset['memberId']!;
        if (editingId === id) editingId = null;
        updateData((d) => setPresent(ensureSession(d), id, false));
      });
    });

    root.querySelectorAll<HTMLInputElement>('.level-input').forEach((input) => {
      input.addEventListener('change', () => {
        const level = parseLevel(input.value);
        if (level === null) {
          render();
          return;
        }
        const id = input.dataset['memberId']!;
        updateData((d) => {
          const m = d.roster.find((mm) => mm.id === id);
          if (m) m.level = level;
        });
      });
    });

    root.querySelectorAll<HTMLButtonElement>('.delete-button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset['memberId']!;
        editingId = null;
        updateData((d) => {
          d.roster = d.roster.filter((m) => m.id !== id);
          if (d.currentSession) d.currentSession.attendance = d.currentSession.attendance.filter((a) => a.memberId !== id);
        });
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
