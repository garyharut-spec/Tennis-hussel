import { escapeHtml } from '../escape.ts';
import { randomId } from '../id.ts';
import { getLanguage, onLanguageChange, t } from '../i18n/index.ts';
import { formatDecimal, parseDecimal } from '../i18n/number.ts';
import { isBeginner, parseLevel } from '../level.ts';
import { displayName, hasNameClash } from '../members.ts';
import { ensureSession } from '../session.ts';
import { isPresent, presentCount, setPresent } from '../attendance.ts';
import { getData, onDataChange, updateData } from '../store.ts';
import type { Member } from '../types.ts';

type SortKey = 'name' | 'level';

interface PendingDuplicate {
  firstName: string;
  level: number;
  existingMemberId: string;
}

export function renderPlayers(root: HTMLElement): () => void {
  let sortKey: SortKey = 'name';
  let pendingDuplicate: PendingDuplicate | null = null;

  function sortedRoster(): Member[] {
    const roster = [...getData().roster];
    if (sortKey === 'level') {
      roster.sort((a, b) => a.level - b.level || a.firstName.localeCompare(b.firstName));
    } else {
      roster.sort((a, b) => displayName(a).localeCompare(displayName(b)));
    }
    return roster;
  }

  function render(): void {
    const data = getData();
    const session = ensureSession(data);
    const language = getLanguage();
    const roster = sortedRoster();

    root.innerHTML = `
      <form class="quick-add">
        <input type="text" name="name" placeholder="${t('players_add_name_placeholder')}" autocomplete="off" />
        <input type="text" name="level" placeholder="${t('players_add_level_placeholder')}" inputmode="decimal" />
        <button type="submit">${t('players_add_button')}</button>
      </form>
      <p class="field-error" data-error="add" hidden>${t('players_add_invalid_level')}</p>

      <div class="duplicate-prompt" hidden></div>

      <div class="sort-controls">
        <label>
          ${t('players_sort_label')}
          <select name="sort">
            <option value="name">${t('players_sort_name')}</option>
            <option value="level">${t('players_sort_level')}</option>
          </select>
        </label>
        <span class="present-count">${t('players_present_count', presentCount(session))}</span>
      </div>

      <ul class="roster">
        ${
          roster.length === 0
            ? `<li class="empty-state">${t('players_empty_state')}</li>`
            : roster
                .map((member) => {
                  const beginner = isBeginner(member.level, session.config.beginnerThreshold);
                  const present = isPresent(session, member.id);
                  return `
              <li class="roster-row${beginner ? ' beginner' : ''}" data-member-id="${member.id}">
                <span class="roster-name">${escapeHtml(displayName(member))}${beginner ? ` <span class="beginner-tag">${t('players_beginner_marker')}</span>` : ''}</span>
                <input type="text" class="level-input" value="${formatDecimal(member.level, language)}" data-member-id="${member.id}" />
                <label class="present-toggle">
                  <input type="checkbox" class="present-checkbox" data-member-id="${member.id}" ${present ? 'checked' : ''} />
                  ${t('players_present_label')}
                </label>
                <button type="button" class="delete-button" data-member-id="${member.id}">${t('players_delete_button')}</button>
              </li>`;
                })
                .join('')
        }
      </ul>
    `;

    const addForm = root.querySelector('.quick-add') as HTMLFormElement;
    const nameInput = addForm.elements.namedItem('name') as HTMLInputElement;
    const levelInput = addForm.elements.namedItem('level') as HTMLInputElement;
    const addError = root.querySelector('[data-error="add"]') as HTMLElement;
    const duplicatePrompt = root.querySelector('.duplicate-prompt') as HTMLElement;
    const sortSelect = root.querySelector('select[name="sort"]') as HTMLSelectElement;
    sortSelect.value = sortKey;

    if (pendingDuplicate) {
      renderDuplicatePrompt(duplicatePrompt, pendingDuplicate);
    }

    addForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const firstName = nameInput.value.trim();
      const level = parseLevel(levelInput.value);
      if (!firstName || level === null) {
        addError.hidden = false;
        return;
      }
      addError.hidden = true;

      const clash = getData().roster.find((m) => !m.lastInitial && hasNameClash([m], firstName));
      if (clash) {
        pendingDuplicate = { firstName, level, existingMemberId: clash.id };
        render();
        return;
      }

      updateData((d) => {
        d.roster.push({ id: randomId(), firstName, level });
      });
      nameInput.value = '';
      levelInput.value = '';
      nameInput.focus();
    });

    function renderDuplicatePrompt(container: HTMLElement, pending: PendingDuplicate): void {
      container.hidden = false;
      container.innerHTML = `
        <p>${escapeHtml(t('players_duplicate_prompt', pending.firstName))}</p>
        <label>${t('players_initial_placeholder')} (${escapeHtml(pending.firstName)})
          <input type="text" name="newInitial" maxlength="1" />
        </label>
        <label>${t('players_initial_placeholder')} (${escapeHtml(pending.firstName)}, ${t('players_sort_name').toLowerCase()} 2)
          <input type="text" name="existingInitial" maxlength="1" />
        </label>
        <button type="button" data-action="confirm">${t('players_confirm_button')}</button>
        <button type="button" data-action="cancel">${t('players_cancel_button')}</button>
      `;
      const newInitialInput = container.querySelector('[name="newInitial"]') as HTMLInputElement;
      const existingInitialInput = container.querySelector('[name="existingInitial"]') as HTMLInputElement;

      container.querySelector('[data-action="confirm"]')!.addEventListener('click', () => {
        const newInitial = newInitialInput.value.trim();
        const existingInitial = existingInitialInput.value.trim();
        if (!newInitial || !existingInitial) return;
        updateData((d) => {
          const existing = d.roster.find((m) => m.id === pending.existingMemberId);
          if (existing) existing.lastInitial = existingInitial;
          d.roster.push({ id: randomId(), firstName: pending.firstName, level: pending.level, lastInitial: newInitial });
        });
        pendingDuplicate = null;
        nameInput.value = '';
        levelInput.value = '';
      });

      container.querySelector('[data-action="cancel"]')!.addEventListener('click', () => {
        pendingDuplicate = null;
        render();
      });
    }

    sortSelect.addEventListener('change', () => {
      sortKey = sortSelect.value as SortKey;
      render();
    });

    root.querySelectorAll<HTMLInputElement>('.level-input').forEach((input) => {
      input.addEventListener('change', () => {
        const memberId = input.dataset['memberId']!;
        const value = parseDecimal(input.value);
        const level = value === null ? null : parseLevel(String(value));
        if (level === null) {
          render();
          return;
        }
        updateData((d) => {
          const member = d.roster.find((m) => m.id === memberId);
          if (member) member.level = level;
        });
      });
    });

    root.querySelectorAll<HTMLInputElement>('.present-checkbox').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const memberId = checkbox.dataset['memberId']!;
        updateData((d) => {
          const s = ensureSession(d);
          setPresent(s, memberId, checkbox.checked);
        });
      });
    });

    root.querySelectorAll<HTMLButtonElement>('.delete-button').forEach((button) => {
      button.addEventListener('click', () => {
        const memberId = button.dataset['memberId']!;
        updateData((d) => {
          d.roster = d.roster.filter((m) => m.id !== memberId);
          if (d.currentSession) {
            d.currentSession.attendance = d.currentSession.attendance.filter((a) => a.memberId !== memberId);
          }
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
