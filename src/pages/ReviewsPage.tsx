import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, RefreshCw, Play, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAppData } from '../hooks/useAppData';
import { usePreferences } from '../lib/preferences';

export function ReviewsPage() {
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
    return <p className="text-[var(--text-muted)]">{error ?? 'Unable to load reviews.'}</p>;
  }

  const now = new Date();
  const dueReviews = data.reviews.filter((review) => review.status === 'pending' && new Date(review.due_date) <= now);
  const upcomingReviews = data.reviews.filter((review) => review.status === 'pending' && new Date(review.due_date) > now);
  const weakAreas = data.sessions
    .filter((session) => session.completed_at && session.confidence !== null)
    .sort((left, right) => (left.confidence ?? 0) - (right.confidence ?? 0))
    .slice(0, 3);

  return (
    <div className="space-y-8 font-sans">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-mono font-bold uppercase tracking-tight text-[var(--text-primary)]">
            {t('reviews.title')}
          </h1>
          <p className="mt-2 font-serif italic text-[var(--text-secondary)]">
            {t('reviews.subtitle')}
          </p>
        </div>
        <div className="text-right">
          <Badge variant="destructive" className="font-mono tracking-widest uppercase text-xs">
            {t('reviews.dueNow', { count: dueReviews.length })}
          </Badge>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-[var(--bg-soft)]">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-amber-500" />
                {t('reviews.dueTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dueReviews.length > 0 ? (
                dueReviews.map((review) => {
                  const task = data.tasks.find((item) => item.id === review.task_id);
                  return (
                    <div key={review.id} className="flex flex-col justify-between gap-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-void)] p-4 sm:flex-row sm:items-center">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={review.priority === 'high' ? 'destructive' : review.priority === 'medium' ? 'warning' : 'secondary'} className="text-[10px] uppercase font-mono tracking-wider">
                            {t('reviews.priority', { priority: t(`priority.${review.priority}`) })}
                          </Badge>
                          <span className="text-xs font-mono text-[var(--text-muted)]">
                            {t('common.dueLabel', { date: formatDate(review.due_date) })}
                          </span>
                        </div>
                        <h4 className="font-medium text-[var(--text-primary)]">{task?.title ?? t('reviews.taskReview')}</h4>
                      </div>
                      <Link to={`/app/session/${review.task_id}`}>
                        <Button variant="outline" className="shrink-0 gap-2">
                          <Play className="w-4 h-4 fill-current" /> {t('reviews.startReview')}
                        </Button>
                      </Link>
                    </div>
                  );
                })
              ) : (
                <p className="text-[var(--text-muted)]">{t('reviews.noneDue')}</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-soft)]">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                {t('reviews.upcomingTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingReviews.length > 0 ? (
                upcomingReviews.slice(0, 5).map((review) => {
                  const task = data.tasks.find((item) => item.id === review.task_id);
                  return (
                    <div key={review.id} className="flex flex-col justify-between gap-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-void)] p-4 opacity-70 sm:flex-row sm:items-center">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-[var(--text-muted)]">
                            {t('common.dueLabel', { date: formatDate(review.due_date) })}
                          </span>
                        </div>
                        <h4 className="font-medium text-[var(--text-secondary)]">{task?.title ?? t('reviews.taskReview')}</h4>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-[var(--text-muted)]">{t('reviews.noneUpcoming')}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-[var(--bg-soft)] border-red-900/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                {t('reviews.weakAreas')}
              </CardTitle>
              <CardDescription>{t('reviews.weakAreasBody')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {weakAreas.length > 0 ? (
                  weakAreas.map((session) => {
                    const task = data.tasks.find((item) => item.id === session.task_id);
                    return (
                      <li key={session.id} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-[var(--text-primary)]">{task?.title ?? 'Task'}</span>
                        <Badge variant={(session.confidence ?? 0) <= 2 ? 'destructive' : 'warning'} className="text-[10px]">
                          {t('reviews.score', { score: session.confidence ?? 0 })}
                        </Badge>
                      </li>
                    );
                  })
                ) : (
                  <li className="text-sm text-[var(--text-muted)]">{t('reviews.noWeakAreas')}</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
