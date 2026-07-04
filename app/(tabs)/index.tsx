import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/ui/components/placeholder-screen';

export default function LogScreen(): ReactElement {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('screens.log.title')} subtitle={t('common.comingSoon')} />;
}
