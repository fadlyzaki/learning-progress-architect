import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, Play, Sparkles } from 'lucide-react';
import { useAppMeta } from '../components/AppMeta';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { PageIntro, PageLoadingState, PageMessageState } from '../components/PageStates';
import { PrimaryActionPanel } from '../components/PrimaryActionPanel';
import { useAppData } from '../hooks/useAppData';
import { usePreferences } from '../lib/preferences';
import { apiFetch } from '../lib/api';

export function RoadmapPage() {
  const { data, loading, error, refetch } = useAppData();
  const { t } = usePreferences();
  const navigate = useNavigate();
  const [relearningTask, setRelearningTask] = useState<number | null>(null);
  useAppMeta({
    title: t('roadmap.title'),
    description: data?.goals[0]
      ? t('roadmap.subtitle', { goal: data.goals[0].title })
      : t('roadmap.empty'),
  });

  if (loading) {
    return <PageLoadingState variant="detail" rows={3} />;
  }

  const activeGoal = data?.goals[0] ?? null;

  if (!data || !activeGoal) {
    return (
      <div className="space-y-6">
        <PageIntro title={t('roadmap.title')} body={error ?? t('roadmap.empty')} />
        <PageMessageState
          eyebrow={t('roadmap.activeGoal')}
          title={t('roadmap.title')}
          body={error ?? t('roadmap.empty')}
          actionLabel={error ? t('common.retry') : t('dashboard.emptyAction')}
          onAction={error ? () => void refetch() : undefined}
          actionTo={error ? undefined : '/onboarding'}
        />
      </div>
    );
  }

  const tasks = data.tasks.filter((task) => task.goal_id === activeGoal.id);
  const nextTask = tasks.find((task) => task.status !== 'completed') ?? null;
  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const progressPercentage = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const handleRelearn = async (taskId: number) => {
    if (relearningTask) return;
    setRelearningTask(taskId);
    try {
      await apiFetch(`/api/tasks/${taskId}/relearn`, { method: 'POST' });
      await refetch();
      navigate(`/app/session/${taskId}`);
    } catch (err) {
      console.error(err);
    } finally {
      setRelearningTask(null);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      <PageIntro
        eyebrow={t('roadmap.activeGoal')}
        title={t('roadmap.title')}
        body={t('roadmap.subtitle', { goal: activeGoal.title })}
        actions={
          <Card className="app-card-muted max-w-sm">
            <CardHeader className="pb-4">
              <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                {t('roadmap.progress')}
              </div>
              <CardTitle className="line-clamp-2 text-xl text-[var(--text-primary)]">{activeGoal.title}</CardTitle>
              <CardDescription className="line-clamp-2 text-sm leading-relaxed">
                {t('dashboard.tasksCount', { completed: completedTasks, total: tasks.length })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <Progress value={progressPercentage} indicatorClassName="bg-[var(--accent-amber)]" />
              <div className="text-sm text-[var(--text-muted)]">{progressPercentage}%</div>
            </CardContent>
          </Card>
        }
      />

      <PrimaryActionPanel
        eyebrow={t('roadmap.nextStep')}
        title={nextTask?.title ?? t('roadmap.caughtUpTitle')}
        description={nextTask?.description ?? t('roadmap.caughtUpBody')}
        meta={<Badge variant={nextTask ? 'warning' : 'success'}>{nextTask ? t('roadmap.recommended') : t('status.completed')}</Badge>}
        insight={<span>{t('roadmap.nextStepBody')}</span>}
        actions={
          nextTask ? (
            <>
              <Link to={`/app/session/${nextTask.id}`} className="w-full sm:w-auto">
                <Button variant="accent" size="lg" className="w-full gap-2 sm:w-auto">
                  <Play className="h-4 w-4 fill-current" />
                  {t('dashboard.startSession')}
                </Button>
              </Link>
              <Link to="/app" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  {t('nav.today')}
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/app/reviews" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  {t('nav.reviews')}
                </Button>
              </Link>
              {activeGoal.status === 'completed' && activeGoal.level !== 'Advanced' && (
                <Link to={`/onboarding?goal=${encodeURIComponent(activeGoal.title)}&level=${activeGoal.level === 'Beginner' ? 'Intermediate' : 'Advanced'}`} className="w-full sm:w-auto">
                  <Button variant="accent" size="lg" className="w-full sm:w-auto">
                    {t('roadmap.continueLevel', { level: activeGoal.level === 'Beginner' ? 'Intermediate' : 'Advanced' })}
                  </Button>
                </Link>
              )}
            </>
          )
        }
      />

      <Card className="app-card-supporting">
        <CardHeader className="pb-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                <Sparkles className="h-4 w-4" />
                {t('roadmap.timelineTitle')}
              </div>
              <CardTitle className="mt-3 line-clamp-2 text-2xl text-[var(--text-primary)]">{activeGoal.title}</CardTitle>
              <CardDescription className="mt-2 max-w-2xl text-base leading-relaxed">
                {t('roadmap.timelineBody')}
              </CardDescription>
            </div>
            <div className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <span>{t('roadmap.progress')}</span>
              <Badge variant="outline">{progressPercentage}%</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {tasks.map((task, index) => {
            const resourceCount = data.task_resources.filter((item) => item.task_id === task.id).length;
            const isRecommended = nextTask?.id === task.id;
            const isDone = task.status === 'completed';

            return (
              <div
                key={task.id}
                className={`rounded-[1.35rem] p-4 transition-colors ${
                  isRecommended
                    ? 'border border-amber-500/35 bg-[var(--bg-card)] shadow-[0_0_22px_var(--glow-amber)]'
                    : 'app-list-row-quiet'
                }`}
              >
                <div className="flex gap-4">
                  <div className="flex flex-col items-center pt-1">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-card)]">
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-sm font-medium text-[var(--text-secondary)]">{index + 1}</span>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="line-clamp-2 text-lg font-medium text-[var(--text-primary)]">{task.title}</h3>
                          {isRecommended && <Badge variant="warning">{t('roadmap.recommended')}</Badge>}
                          {task.status === 'in_progress' && <Badge variant="info">{t('roadmap.inProgress')}</Badge>}
                          {isDone && <Badge variant="success">{t('status.completed')}</Badge>}
                        </div>
                        <p className="mt-3 line-clamp-3 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
                          {task.description}
                        </p>
                        {resourceCount > 0 && (
                          <p className="mt-3 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                            {t('roadmap.materials', { count: resourceCount })}
                          </p>
                        )}
                      </div>

                      {!isDone ? (
                        <Link to={`/app/session/${task.id}`} className="w-full sm:w-auto">
                          <Button
                            size="sm"
                            variant={isRecommended ? 'accent' : 'outline'}
                            className="w-full gap-2 sm:w-auto"
                          >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            {t('common.start')}
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                          disabled={relearningTask === task.id}
                          onClick={() => void handleRelearn(task.id)}
                        >
                          {relearningTask === task.id ? t('auth.working') : t('common.relearn')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <Link to="/app" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
            {t('nav.today')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
