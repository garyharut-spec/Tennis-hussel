import { t } from './i18n/index.ts';
import type { Explanation } from './types.ts';

export function explainText(explanation: Explanation): string {
  switch (explanation.code) {
    case 'ODD_BEGINNERS':
      return t('explain_ODD_BEGINNERS', Number(explanation.params?.['n'] ?? 0));
    case 'FOUR_BEGINNERS':
      return t('explain_FOUR_BEGINNERS');
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
    default:
      return explanation.code;
  }
}
