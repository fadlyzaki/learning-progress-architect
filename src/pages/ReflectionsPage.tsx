import type { ReactNode } from 'react';
import { AlertCircle, ArrowRight, BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { PageLoadingState, PageMessageState } from '../components/PageStates';
import { useAppData } from '../hooks/useAppData';
import { usePreferences } from '../lib/preferences';

export function ReflectionsPage() {
  const { data, loading, error, refetch } = useAppData();
  const { formatDate, t } = usePreferences();

  if (loading) {
    return <PageLoadingState rows={3} />;
  }

  if (!data) {
    return (
      <PageMessageState
        title={t('reflections.title')}
        body={error ?? t('reflections.subtitle')}
        actionLabel={t('common.retry')}
        onAction={() => void refetch()}
        tone="warning"
      />
    );
  }

  const reflections = data.sessions.filter((session) => session.completed_at && (session.reflection || session.confusion));

  return (
    <div className="space-y-8 font-sans">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
          {t('reflections.title')}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">
          {t('reflections.subtitle')}
        </p>
      </div>

      {reflections.length > 0 ? (
        <div className="space-y-5">
          {reflections.map((session) => {
            const task = data.tasks.find((item) => item.id === session.task_id);

            return (
              <Card key={session.id} className="app-card-supporting">
                <CardHeader className="pb-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <Badge variant="outline">
                        {session.completed_at ? formatDate(session.completed_at) : t('common.unknownDate')}
                      </Badge>
                      <CardTitle className="mt-4 text-2xl text-[var(--text-primary)]">
                        {task?.title ?? t('reflections.taskFallback')}
                      </CardTitle>
                      <CardDescription className="mt-2 text-base leading-relaxed">
                        {t('reflections.duration', { count: Math.round(session.duration_seconds / 60) })}
                      </CardDescription>
                    </div>
                    {session.confidence ? (
                      <Badge variant="info">{t('reflections.confidenceValue', { count: session.confidence })}</Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 pt-0 lg:grid-cols-2">
                  <ReflectionBlock
                    icon={<BookOpen className="h-4 w-4 text-[var(--accent-blue)]" />}
                    title={t('reflections.summary')}
                    body={session.reflection ?? t('reflections.summaryEmpty')}
                  />
                  <ReflectionBlock
                    icon={<AlertCircle className="h-4 w-4 text-[var(--accent-amber)]" />}
                    title={t('reflections.blockers')}
                    body={session.confusion ?? t('reflections.blockersEmpty')}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <PageMessageState
          title={t('reflections.empty')}
          body={t('reflections.subtitle')}
          actionLabel={t('nav.today')}
          actionTo="/app"
        />
      )}
    </div>
  );
}

function ReflectionBlock({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]/72 p-5">
      <div className="flex items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {icon}
        {title}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[var(--text-primary)]">{body}</p>
      <div className="mt-4 inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <ArrowRight className="h-3.5 w-3.5" />
        {title}
      </div>
    </div>
  );
}
