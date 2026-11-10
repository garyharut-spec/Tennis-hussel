import { isPresent, leavesAt, setPresent } from '../attendance.ts';
import { escapeHtml } from '../escape.ts';
import { randomId } from '../id.ts';
import { getLanguage, onLanguageChange, t } from '../i18n/index.ts';
import { formatDecimal } from '../i18n/number.ts';
import { parseLevel } from '../level.ts';
import { displayName } from '../members.ts';
import { roundsPlayedBefore } from '../roundsPlayed.ts';
import { changeLeave, firstReplanIndex, upcomingRoundStarts } from '../schedule.ts';
import { ensureSession } from '../session.ts';
import { getData, onDataChange, updateData } from '../store.ts';
import { playerCardHtml } from '../ui/playerCard.ts';
import type { AppData, Member } from '../types.ts';

/** Level given to a new player when none is typed (9 = beginner). */
const DEFAULT_NEW_LEVEL = 9;

/** "Exit" icon (door with arrow) for the mark-as-left button. */
const EXIT_ICON =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>';

/** Splits "Anna B." into first name + last initial; returns null for an empty name. */
function parseName(text: string): { firstName: string; lastInitial?: string } | null {
  const trimmed = text.trim();
  const match = /^(.+?)\s+(\p{L})\.?$/u.exec(trimmed);
  if (match) return { firstName: match[1]!, lastInitial: match[2]! };
  return trimmed ? { firstName: trimmed } : null;
}

/** Edit (cog) and mark-as-left buttons, shown in the top-right corner of a player card. */
function cardActions(memberId: string, leaving?: string): string {
  const id = escapeHtml(memberId);
  const note = leaving ? `<span class="leave-note">${escapeHtml(t('players_leaving_badge', leaving))}</span>` : '';
  return `${note}<span class="card-actions">
    <button type="button" class="card-cog" aria-label="${escapeHtml(t('player_edit_label'))}" data-member-id="${id}">⚙</button>
    <button type="button" class="mark-left-button" aria-label="${escapeHtml(t('players_mark_left_button'))}" title="${escapeHtml(t('players_mark_left_button'))}" data-member-id="${id}">${EXIT_ICON}</button>
  </span>`;
}

/** Pop-out listing the upcoming round start times; picking one means the player skips that round and all later ones. */
function leaveDialogHtml(memberId: string, starts: string[], current: string | undefined): string {
  return `<div class="leave-backdrop">
    <div class="leave-dialog" role="dialog" aria-modal="true" aria-labelledby="leave-title" data-member-id="${escapeHtml(memberId)}">
      <h3 id="leave-title">${escapeHtml(t('players_leaving_title'))}</h3>
      <div class="leave-times">
        ${starts.map((s) => `<button type="button" class="leave-time${s === current ? ' selected' : ''}" data-leave-time="${s}">${s}</button>`).join('')}
      </div>
      ${current ? `<button type="button" class="leave-clear" data-leave-clear>${escapeHtml(t('players_leaving_cancel'))}</button>` : ''}
      <button type="button" class="leave-cancel" data-leave-cancel>${escapeHtml(t('players_cancel_button'))}</button>
    </div>
  </div>`;
}

interface PendingDuplicate {
  firstName: string;
  level: number;
  existingMemberId: string;
}

/** The player list: add-player dropdown on top, then the present players. */
export function renderPlayerPanel(root: HTMLElement): () => void {
  let sortByLevel = false;
  let editingId: string | null = null;
  let leavingId: string | null = null;
  let leaveHost: HTMLElement | null = null;
  let pendingDuplicate: PendingDuplicate | null = null;
  let draftName = '';
  let draftLevel = '';
  let showError = false;
  let focusNameAfterRender = false;
  let suppressRender = false;

  const sameName = (m: Member, text: string) => displayName(m).toLowerCase() === text.trim().toLowerCase();

  function render(): void {
    const data = getData();
    const session = ensureSession(data);
    const language = getLanguage();
    const upcoming = firstReplanIndex(session);
    const starts = upcomingRoundStarts(session);

    const saved = data.roster.filter((m) => !isPresent(session, m.id));
    const present = data.roster
      .filter((m) => isPresent(session, m.id))
      .sort((a, b) => (sortByLevel ? a.level - b.level || displayName(a).localeCompare(displayName(b)) : displayName(a).localeCompare(displayName(b))));
    const isNewName = draftName.trim() !== '' && !data.roster.some((m) => sameName(m, draftName));

    root.innerHTML = `
      <form class="add-player">
        <div class="add-player-field">
          <label class="add-player-label" for="add-player-name">${t('add_player_label')}</label>
          <div class="suggest-wrap">
            <input type="text" id="add-player-name" name="name" role="combobox" aria-expanded="false" aria-controls="saved-players" aria-autocomplete="list" placeholder="${escapeHtml(t('add_player_placeholder'))}" autocomplete="off" value="${escapeHtml(draftName)}" />
            <ul class="suggest-list" id="saved-players" role="listbox" hidden></ul>
          </div>
        </div>
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
              ${
                editingId === m.id
                  ? `<div class="player-card player-card-edit" data-player-id="${escapeHtml(m.id)}">
                      <input type="text" class="name-input" aria-label="${escapeHtml(t('player_name_label'))}" value="${escapeHtml(displayName(m))}" data-member-id="${escapeHtml(m.id)}" />
                      <span class="player-badge"><input type="text" class="level-input" inputmode="decimal" aria-label="${escapeHtml(t('player_level_label'))}" value="${formatDecimal(m.level, language)}" data-member-id="${escapeHtml(m.id)}" /> · ${escapeHtml(t('rounds_played_count', roundsPlayedBefore(session, m.id, upcoming)))}</span>
                      ${cardActions(m.id)}
                    </div>`
                  : playerCardHtml(m.id, m, roundsPlayedBefore(session, m.id, upcoming), cardActions(m.id, leavesAt(session, m.id)))
              }
            </div>
            ${
              editingId === m.id
                ? `<div class="player-edit">
                    <button type="button" class="delete-button" data-member-id="${escapeHtml(m.id)}">${t('players_delete_button')}</button>
                  </div>`
                : ''
            }
          </li>`,
                )
                .join('')
        }
      </ul>`;

    // The dialog lives on <body> so no stacking context in the page can paint over it.
    leaveHost?.remove();
    leaveHost = null;
    if (leavingId && starts.length > 0) {
      leaveHost = document.createElement('div');
      leaveHost.innerHTML = leaveDialogHtml(leavingId, starts, leavesAt(session, leavingId));
      document.body.append(leaveHost);
    }

    const form = root.querySelector('form.add-player') as HTMLFormElement;
    const nameInput = form.elements.namedItem('name') as HTMLInputElement;
    const levelInput = form.elements.namedItem('level') as HTMLInputElement;
    const errorEl = root.querySelector('.field-error') as HTMLElement;
    const duplicateEl = root.querySelector('.duplicate-prompt') as HTMLElement;

    const suggestEl = root.querySelector('.suggest-list') as HTMLUListElement;
    let activeIndex = -1;

    function closeSuggestions(): void {
      suggestEl.hidden = true;
      nameInput.setAttribute('aria-expanded', 'false');
      activeIndex = -1;
    }

    function openSuggestions(): void {
      const query = nameInput.value.trim().toLowerCase();
      const matches = saved.filter((m) => !query || displayName(m).toLowerCase().includes(query)).sort((a, b) => displayName(a).localeCompare(displayName(b)));
      activeIndex = -1;
      if (matches.length === 0) {
        suggestEl.innerHTML = '';
        closeSuggestions();
        return;
      }
      suggestEl.innerHTML = matches
        .map(
          (m) =>
            `<li class="suggest-option" role="option" data-member-id="${escapeHtml(m.id)}"><span class="suggest-name">${escapeHtml(displayName(m))}</span><span class="suggest-level">${formatDecimal(m.level, language)}</span></li>`,
        )
        .join('');
      suggestEl.hidden = false;
      nameInput.setAttribute('aria-expanded', 'true');
    }

    function addExisting(id: string): void {
      clearDraft();
      focusNameAfterRender = true;
      updateData((d) => setPresent(ensureSession(d), id, true));
    }

    function setActive(index: number): void {
      const options = [...suggestEl.querySelectorAll<HTMLElement>('.suggest-option')];
      options.forEach((o, i) => o.classList.toggle('active', i === index));
      activeIndex = index;
      options[index]?.scrollIntoView?.({ block: 'nearest' });
    }

    nameInput.addEventListener('input', () => {
      draftName = nameInput.value;
      levelInput.hidden = !(draftName.trim() !== '' && !getData().roster.some((m) => sameName(m, draftName)));
      openSuggestions();
    });
    nameInput.addEventListener('focus', openSuggestions);
    nameInput.addEventListener('blur', closeSuggestions);
    nameInput.addEventListener('keydown', (event) => {
      const count = suggestEl.querySelectorAll('.suggest-option').length;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (suggestEl.hidden) openSuggestions();
        else if (count > 0) setActive(event.key === 'ArrowDown' ? (activeIndex + 1) % count : (activeIndex - 1 + count) % count);
        event.preventDefault();
      } else if (event.key === 'Enter' && activeIndex >= 0 && !suggestEl.hidden) {
        const id = suggestEl.querySelectorAll<HTMLElement>('.suggest-option')[activeIndex]?.dataset['memberId'];
        event.preventDefault();
        if (id) addExisting(id);
      } else if (event.key === 'Escape') {
        closeSuggestions();
      }
    });
    // mousedown (not click) so the input keeps focus and doesn't blur-close the list first.
    suggestEl.addEventListener('mousedown', (event) => {
      event.preventDefault();
      const option = (event.target as HTMLElement).closest<HTMLElement>('.suggest-option');
      if (option?.dataset['memberId']) addExisting(option.dataset['memberId']);
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
        focusNameAfterRender = true;
        updateData((d) => setPresent(ensureSession(d), existing.id, true));
        return;
      }
      const levelText = levelInput.value.trim();
      const level = levelText === '' ? DEFAULT_NEW_LEVEL : parseLevel(levelText);
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
      focusNameAfterRender = true;
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
        focusNameAfterRender = true;
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
        if (starts.length === 0) {
          // No round left to choose from: the player simply leaves now.
          updateData((d) => setPresent(ensureSession(d), id, false));
          return;
        }
        leavingId = id;
        render();
      });
    });

    const dialog = leaveHost?.querySelector<HTMLElement>('.leave-dialog');
    if (leaveHost && dialog) {
      const close = () => {
        leavingId = null;
        render();
      };
      leaveHost.querySelector('.leave-backdrop')!.addEventListener('click', (event) => {
        if (event.target === event.currentTarget) close();
      });
      dialog.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close();
      });
      dialog.querySelectorAll<HTMLButtonElement>('[data-leave-time]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = leavingId!;
          const time = btn.dataset['leaveTime']!;
          leavingId = null;
          updateData((d) => changeLeave(d, ensureSession(d), id, time));
        });
      });
      dialog.querySelector('[data-leave-clear]')?.addEventListener('click', () => {
        const id = leavingId!;
        leavingId = null;
        updateData((d) => changeLeave(d, ensureSession(d), id, null));
      });
      dialog.querySelector('[data-leave-cancel]')!.addEventListener('click', close);
      dialog.querySelector<HTMLElement>('[data-leave-time]')?.focus();
    }

    // In-place edits don't re-render, so focus survives tapping from the name to the level field.
    function commitQuietly(change: (d: AppData) => void): void {
      suppressRender = true;
      try {
        updateData(change);
      } finally {
        suppressRender = false;
      }
    }

    root.querySelectorAll<HTMLInputElement>('.level-input').forEach((input) => {
      input.addEventListener('change', () => {
        const id = input.dataset['memberId']!;
        const member = getData().roster.find((m) => m.id === id);
        const level = parseLevel(input.value);
        if (level === null || !member) {
          input.value = member ? formatDecimal(member.level, getLanguage()) : input.value;
          return;
        }
        commitQuietly((d) => {
          const m = d.roster.find((mm) => mm.id === id);
          if (m) m.level = level;
        });
        input.value = formatDecimal(level, getLanguage());
      });
    });

    root.querySelectorAll<HTMLInputElement>('.name-input').forEach((input) => {
      input.addEventListener('change', () => {
        const id = input.dataset['memberId']!;
        const member = getData().roster.find((m) => m.id === id);
        const parsed = parseName(input.value);
        if (!parsed || !member) {
          if (member) input.value = displayName(member);
          return;
        }
        commitQuietly((d) => {
          const m = d.roster.find((mm) => mm.id === id);
          if (!m) return;
          m.firstName = parsed.firstName;
          if (parsed.lastInitial) m.lastInitial = parsed.lastInitial;
          else delete m.lastInitial;
        });
        input.value = displayName({ ...member, ...parsed });
      });
    });

    // Enter saves (blur fires the change handler above) and closes edit mode.
    root.querySelectorAll<HTMLInputElement>('.name-input, .level-input').forEach((input) => {
      input.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        input.blur();
        editingId = null;
        render();
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

    if (focusNameAfterRender) {
      focusNameAfterRender = false;
      nameInput.focus();
    }
  }

  render();
  const unsubscribeLanguage = onLanguageChange(render);
  const unsubscribeData = onDataChange(() => {
    if (!suppressRender) render();
  });
  return () => {
    leaveHost?.remove();
    leaveHost = null;
    unsubscribeLanguage();
    unsubscribeData();
  };
}
