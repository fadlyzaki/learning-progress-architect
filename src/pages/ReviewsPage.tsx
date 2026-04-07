import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, Play, RefreshCw, Sparkles } from 'lucide-react';
import { useAppMeta } from '../components/AppMeta';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PageLoadingState, PageMessageState } from '../components/PageStates';
import { PrimaryActionPanel } from '../components/PrimaryActionPanel';
import { useAppData } from '../hooks/useAppData';
import { usePreferences } from '../lib/preferences';

export function ReviewsPage() {
  const { data, loading, error, refetch } = useAppData();
  const { formatDate, t } = usePreferences();
  useAppMeta({
    title: t('reviews.title'),
    description: t('reviews.subtitle'),
  });

  if (loading) {
    return <PageLoadingState rows={3} />;
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
            {t('reviews.title')}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">
            {error ?? t('reviews.subtitle')}
          </p>
        </div>
        <PageMessageState
          title={t('reviews.title')}
          body={error ?? t('reviews.subtitle')}
          actionLabel={t('common.retry')}
          onAction={() => void refetch()}
          tone="warning"
        />
      </div>
    );
  }

  const now = new Date();
  const dueReviews = data.reviews.filter((review) => review.status === 'pending' && new Date(review.due_date) <= now);
  const upcomingReviews = data.reviews.filter((review) => review.status === 'pending' && new Date(review.due_date) > now);
  const primaryReview = dueReviews[0] ?? null;
  const queuedReviews = primaryReview ? dueReviews.slice(1) : dueReviews;
  const weakAreas = data.sessions
    .filter((session) => session.completed_at && session.confidence !== null)
    .sort((left, right) => (left.confidence ?? 0) - (right.confidence ?? 0))
    .slice(0, 3);

  const primaryTask = primaryReview ? data.tasks.find((item) => item.id === primaryReview.task_id) ?? null : null;

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 text-[11px] font-mono font-semibold uppercase tracking-[0.24em] text-[var(--accent-amber)]">
            {t('reviews.dueTitle')}
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
            {t('reviews.title')}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">
            {t('reviews.subtitle')}
          </p>
        </div>
        <Badge variant={dueReviews.length > 0 ? 'destructive' : 'outline'} className="self-start lg:self-auto">
          {t('reviews.dueNow', { count: dueReviews.length })}
        </Badge>
      </div>

      <PrimaryActionPanel
        eyebrow={t('reviews.priorityFocus')}
        title={primaryTask?.title ?? t('reviews.noPriorityTitle')}
        description={primaryTask ? t('reviews.priorityFocusBody') : t('reviews.noPriorityBody')}
        meta={
          primaryReview ? (
            <Badge variant={primaryReview.priority === 'high' ? 'destructive' : primaryReview.priority === 'medium' ? 'warning' : 'outline'}>
              {t('reviews.priority', { priority: t(`priority.${primaryReview.priority}`) })}
            </Badge>
          ) : (
            <Badge variant="success">{t('status.completed')}</Badge>
          )
        }
        insight={
          primaryReview ? (
            <span>{t('common.dueLabel', { date: formatDate(primaryReview.due_date) })}</span>
          ) : (
            <span>{t('reviews.noPriorityBody')}</span>
          )
        }
        actions={
          primaryReview ? (
            <>
              <Link to={`/app/session/${primaryReview.task_id}`} className="w-full sm:w-auto">
                <Button variant="accent" size="lg" className="w-full gap-2 sm:w-auto">
                  <Play className="h-4 w-4 fill-current" />
                  {t('reviews.startReview')}
                </Button>
              </Link>
              <Link to="/app/roadmap" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  {t('dashboard.openRoadmap')}
                </Button>
              </Link>
            </>
          ) : (
            <Link to="/app/roadmap" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                {t('dashboard.openRoadmap')}
              </Button>
            </Link>
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.92fr]">
        <Card className="app-card-supporting">
          <CardHeader className="pb-5">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
              <RefreshCw className="h-4 w-4" />
              {t('reviews.queueTitle')}
            </div>
            <CardTitle className="mt-3 text-2xl text-[var(--text-primary)]">{t('reviews.dueTitle')}</CardTitle>
            <CardDescription className="mt-2 text-base leading-relaxed">
              {t('reviews.queueBody')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {queuedReviews.length > 0 ? (
              queuedReviews.map((review) => {
                const task = data.tasks.find((item) => item.id === review.task_id);

                return (
                  <div key={review.id} className="rounded-[1.35rem] border border-[var(--border-color)] bg-[var(--bg-soft)] p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge variant={review.priority === 'high' ? 'destructive' : review.priority === 'medium' ? 'warning' : 'outline'}>
                            {t('reviews.priority', { priority: t(`priority.${review.priority}`) })}
                          </Badge>
                          <span className="text-xs text-[var(--text-muted)]">
                            {t('common.dueLabel', { date: formatDate(review.due_date) })}
                          </span>
                        </div>
                        <h3 className="text-lg font-medium text-[var(--text-primary)]">
                          {task?.title ?? t('reviews.taskReview')}
                        </h3>
                      </div>
                      <Link to={`/app/session/${review.task_id}`} className="w-full sm:w-auto">
                        <Button variant="outline" className="w-full gap-2 sm:w-auto">
                          <Play className="h-4 w-4 fill-current" />
                          {t('reviews.startReview')}
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <PageMessageState
                title={t('reviews.noneDue')}
                body={t('reviews.noneUpcoming')}
                actionLabel={t('dashboard.openRoadmap')}
                actionTo="/app/roadmap"
              />
            )}

            {upcomingReviews.length > 0 && (
              <div className="space-y-3 border-t border-[var(--border-color)] pt-5">
                <div className="flex items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  <ArrowRight className="h-4 w-4" />
                  {t('reviews.upcomingTitle')}
                </div>
                {upcomingReviews.slice(0, 5).map((review) => {
                  const task = data.tasks.find((item) => item.id === review.task_id);

                  return (
                    <div key={review.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/75 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{task?.title ?? t('reviews.taskReview')}</p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {t('common.dueLabel', { date: formatDate(review.due_date) })}
                        </p>
                      </div>
                      <Badge variant="outline">{t(`priority.${review.priority}`)}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="app-card-muted">
          <CardHeader className="pb-4">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
              <Sparkles className="h-4 w-4" />
              {t('reviews.weakAreas')}
            </div>
            <CardTitle className="mt-3 text-xl text-[var(--text-primary)]">{t('reviews.weakAreas')}</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {t('reviews.weakAreasBody')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {weakAreas.length > 0 ? (
              weakAreas.map((session) => {
                const task = data.tasks.find((item) => item.id === session.task_id);

                return (
                  <div key={session.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/72 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <span className="text-sm text-[var(--text-primary)]">{task?.title ?? t('reviews.taskReview')}</span>
                    </div>
                    <Badge variant={(session.confidence ?? 0) <= 2 ? 'destructive' : 'warning'}>
                      {t('reviews.score', { score: session.confidence ?? 0 })}
                    </Badge>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/72 px-4 py-4 text-sm text-[var(--text-muted)]">
                {t('reviews.noWeakAreas')}
              </div>
            )}

            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/72 px-4 py-4 text-sm text-[var(--text-muted)]">
              <div className="flex items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {t('reviews.noPriorityTitle')}
              </div>
              <p className="mt-2 leading-relaxed">{t('reviews.noPriorityBody')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
