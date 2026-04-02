import { BookOpen, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAppData } from '../hooks/useAppData';
import { usePreferences } from '../lib/preferences';

export function ReflectionsPage() {
  const { data, loading, error } = useAppData();
  const { formatDate, t } = usePreferences();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-[var(--text-muted)]">{error ?? 'Unable to load reflections.'}</p>;
  }

  const reflections = data.sessions.filter((session) => session.completed_at && (session.reflection || session.confusion));

  return (
    <div className="space-y-8 font-sans">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-mono font-bold uppercase tracking-tight text-[var(--text-primary)]">
            {t('reflections.title')}
          </h1>
          <p className="mt-2 font-serif italic text-[var(--text-secondary)]">
            {t('reflections.subtitle')}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {reflections.length > 0 ? (
          reflections.map((session) => {
            const task = data.tasks.find((item) => item.id === session.task_id);
            return (
              <Card key={session.id} className="bg-[var(--bg-soft)]">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="outline" className="mb-2 border-[var(--border-strong)] text-[10px] font-mono uppercase tracking-widest text-[var(--text-secondary)]">
                        {session.completed_at ? formatDate(session.completed_at) : t('common.unknownDate')}
                      </Badge>
                      <CardTitle className="text-xl text-[var(--text-primary)]">{task?.title ?? t('reflections.taskFallback')}</CardTitle>
                      <CardDescription className="mt-1 text-[var(--text-secondary)]">
                        {t('reflections.duration', { count: Math.round(session.duration_seconds / 60) })}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <h4 className="flex items-center gap-2 text-sm font-mono uppercase tracking-widest text-[var(--text-muted)]">
                      <BookOpen className="w-4 h-4 text-blue-400" /> {t('reflections.summary')}
                    </h4>
                    <p className="text-sm leading-relaxed text-[var(--text-primary)]">
                      {session.reflection ?? t('reflections.summaryEmpty')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="flex items-center gap-2 text-sm font-mono uppercase tracking-widest text-[var(--text-muted)]">
                      <AlertCircle className="w-4 h-4 text-amber-400" /> {t('reflections.blockers')}
                    </h4>
                    <p className="text-sm leading-relaxed text-[var(--text-primary)]">
                      {session.confusion ?? t('reflections.blockersEmpty')}
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-[var(--border-color)] pt-4">
                    <h4 className="flex items-center gap-2 text-sm font-mono uppercase tracking-widest text-[var(--text-muted)]">
                      <ArrowRight className="w-4 h-4 text-green-400" /> {t('reflections.confidence')}
                    </h4>
                    <p className="text-sm leading-relaxed text-[var(--text-primary)]">
                      {session.confidence
                        ? t('reflections.confidenceValue', { count: session.confidence })
                        : t('reflections.confidenceEmpty')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="bg-[var(--bg-soft)]">
            <CardContent className="py-10 text-[var(--text-muted)]">
              {t('reflections.empty')}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
