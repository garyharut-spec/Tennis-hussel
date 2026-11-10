import { t } from './i18n/index.ts';
import type { Explanation } from './types.ts';

/** Returns the translated text, or null for codes we no longer know (e.g. from older saved sessions). */
export function explainText(explanation: Explanation): string | null {
  switch (explanation.code) {
    case 'ODD_BEGINNERS':
      return t('explain_ODD_BEGINNERS', Number(explanation.params?.['n'] ?? 0));
    case 'BEGINNERS_SAME_TEAM':
      return t('explain_BEGINNERS_SAME_TEAM');
    case 'TEAM_IMBALANCE':
      return t('explain_TEAM_IMBALANCE');
    case 'REPEAT_PARTNER':
      return t('explain_REPEAT_PARTNER');
    case 'REPEAT_OPPONENT':
      return t('explain_REPEAT_OPPONENT');
    case 'SAME_COURT_AS_LAST_ROUND':
      return t('explain_SAME_COURT_AS_LAST_ROUND');
    case 'SINGLES_GAME':
      return t('explain_SINGLES_GAME');
    default:
      return null;
  }
}
