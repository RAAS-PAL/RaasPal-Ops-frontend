import { useTranslations } from 'next-intl';
import { AppSidebar } from '@/components/AppSidebar';
import { AppTopBar } from '@/components/AppTopBar';
import { EditRobotClient } from './EditRobotClient';

export default function EditRobotPage() {
  const t = useTranslations('robotForm');
  return (
    <main className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="flex min-h-dvh">
        <AppSidebar />
        <section className="flex min-w-0 flex-1 flex-col">
          <AppTopBar eyebrow={t('eyebrow')} title={t('editTitle')} />
          <EditRobotClient />
        </section>
      </div>
    </main>
  );
}
