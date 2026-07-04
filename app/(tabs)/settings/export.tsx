import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/ui/components/placeholder-screen';

export default function ExportScreen(): ReactElement {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen title={t('screens.settings.export.title')} subtitle={t('common.comingSoon')} />
  );
}
