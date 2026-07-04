import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/ui/components/placeholder-screen';

export default function HistoryListScreen(): ReactElement {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('screens.history.title')} subtitle={t('common.comingSoon')} />;
}
