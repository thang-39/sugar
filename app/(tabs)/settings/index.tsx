import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/ui/components/placeholder-screen';

export default function SettingsScreen(): ReactElement {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen title={t('screens.settings.index.title')} subtitle={t('common.comingSoon')} />
  );
}
