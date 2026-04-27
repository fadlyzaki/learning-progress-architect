import type { ReactNode } from 'react';
import { Activity, CheckCircle2, Clock, Download, TrendingUp } from 'lucide-react';
import { useAppMeta } from '../components/AppMeta';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Progress } from '../components/ui/Progress';
import { PageIntro, PageLoadingState, PageMessageState } from '../components/PageStates';
import { useAppData } from '../hooks/useAppData';
import { usePreferences } from '../lib/preferences';
import { exportDataToMarkdown, downloadMarkdown } from '../lib/export';

function calculateStreak(sessionDates: string[]) {
  const uniqueDates = [...new Set(sessionDates.map((value) => value.slice(0, 10)))].sort().reverse();
  if (uniqueDates.length === 0) {
    return 0;
  }

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (const dateString of uniqueDates) {
    const currentDate = cursor.toISOString().slice(0, 10);
    if (dateString === currentDate) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    if (streak === 0) {
      cursor.setDate(cursor.getDate() - 1);
      if (dateString === cursor.toISOString().slice(0, 10)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
    }

    break;
  }

  return streak;
}

export function ProgressPage() {
  const { data, loading, error, refetch } = useAppData();
  const { formatDate, t } = usePreferences();
  useAppMeta({
    title: t('progress.title'),
    description: t('progress.subtitle'),
  });

  if (loading) {
    return <PageLoadingState variant="metrics" stats={4} rows={2} />;
  }

  if (!data) {
    return (
      <PageMessageState
        title={t('progress.title')}
        body={error ?? t('progress.subtitle')}
        actionLabel={t('common.retry')}
        onAction={() => void refetch()}
        tone="warning"
      />
    );
  }

  const activeGoal = data.goals[0] ?? null;
  const completedSessions = data.sessions.filter((session) => session.completed_at);
  const totalStudyMinutes = Math.round(
    completedSessions.reduce((sum, session) => sum + session.duration_seconds, 0) / 60,
  );
  const completedTasks = data.tasks.filter((task) => task.status === 'completed');
  const streak = calculateStreak(
    completedSessions
      .map((session) => session.completed_at)
      .filter((value): value is string => Boolean(value)),
  );
  const averageConfidence = completedSessions.length
    ? Math.round(
        (completedSessions.reduce((sum, session) => sum + (session.confidence ?? 0), 0) /
          completedSessions.length) *
          20,
      )
    : 0;
  const hasNoData = data.goals.length === 0 && completedSessions.length === 0;

  if (hasNoData) {
    return (
      <div className="space-y-8 font-sans">
        <PageIntro title={t('progress.title')} body={t('progress.subtitle')} />
        <PageMessageState
          eyebrow={t('progress.title')}
          title={t('progress.noActiveGoal')}
          body={t('progress.unlock')}
          actionLabel={t('dashboard.emptyAction')}
          actionTo="/onboarding"
        />
      </div>
    );
  }

  const recentSessions = completedSessions.slice(0, 5);
  const activeGoalTasks = activeGoal ? data.tasks.filter((task) => task.goal_id === activeGoal.id) : [];
  const activeGoalCompletion = activeGoalTasks.length
    ? (activeGoalTasks.filter((task) => task.status === 'completed').length / activeGoalTasks.length) * 100
    : 0;

  const handleExportMarkdown = () => {
    if (!data) return;
    const md = exportDataToMarkdown(data);
    const filename = `learning-progress-export-${new Date().toISOString().slice(0, 10)}.md`;
    downloadMarkdown(md, filename);
  };

  return (
    <div className="space-y-8 font-sans">
      <PageIntro 
        title={t('progress.title')} 
        body={t('progress.subtitle')} 
        actions={
          <Button variant="outline" onClick={handleExportMarkdown} className="gap-2">
            <Download className="h-4 w-4" />
            {t('progress.exportData')}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title={t('progress.totalStudyTime')} value={`${totalStudyMinutes}m`} body={t('progress.totalStudyTimeBody')} accent="text-green-500" icon={<TrendingUp className="h-4 w-4" />} />
        <MetricCard title={t('progress.tasksCompleted')} value={String(completedTasks.length)} body={t('progress.tasksCompletedBody', { count: data.goals.length })} />
        <MetricCard title={t('progress.currentStreak')} value={t('progress.days', { count: streak })} body={t('progress.currentStreakBody')} accent="text-[var(--accent-amber)]" />
        <MetricCard title={t('progress.averageConfidence')} value={`${averageConfidence}%`} body={t('progress.averageConfidenceBody')} accent="text-[var(--accent-blue)]" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.98fr]">
        <Card className="app-card-supporting">
          <CardHeader className="pb-5">
            <CardTitle className="text-2xl text-[var(--text-primary)]">{t('progress.activeGoal')}</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              {activeGoal?.title ?? t('progress.noActiveGoal')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-0">
            {activeGoal ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-[var(--text-secondary)]">{t('progress.overallCompletion')}</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {Math.round(activeGoalCompletion)}%
                    </span>
                  </div>
                  <Progress value={activeGoalCompletion} indicatorClassName="bg-[var(--accent-amber)]" />
                </div>

                <div className="space-y-3">
                  <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                    {t('progress.taskStatus')}
                  </div>
                  {activeGoalTasks.map((task) => (
                    <div key={task.id} className="app-list-row-quiet flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Activity className="h-4 w-4 text-[var(--accent-amber)]" />
                        )}
                        <span className="text-sm text-[var(--text-primary)]">{task.title}</span>
                      </div>
                      <Badge
                        variant={
                          task.status === 'completed'
                            ? 'success'
                            : task.status === 'in_progress'
                              ? 'warning'
                              : 'outline'
                        }
                      >
                        {t(`status.${task.status}`)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="app-list-row-quiet rounded-2xl px-4 py-4 text-sm text-[var(--text-muted)]">
                {t('progress.unlock')}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="app-card-muted">
          <CardHeader className="pb-5">
            <CardTitle className="text-2xl text-[var(--text-primary)]">{t('progress.recentActivity')}</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              {t('progress.recentActivityBody')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {recentSessions.length > 0 ? (
              recentSessions.map((session) => {
                const task = data.tasks.find((item) => item.id === session.task_id);
                return (
                  <div key={session.id} className="app-list-row rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {task?.title ?? t('common.session')}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {session.completed_at ? formatDate(session.completed_at) : t('common.today')}
                        </p>
                      </div>
                      <Badge variant="outline">{t('common.session')}</Badge>
                    </div>
                    <div className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Clock className="h-4 w-4" />
                      {t('common.minutes', { count: Math.round(session.duration_seconds / 60) })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="app-list-row-quiet rounded-2xl px-4 py-4 text-sm text-[var(--text-muted)]">
                {t('progress.noActivity')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  body,
  accent = 'text-[var(--text-primary)]',
  icon,
}: {
  title: string;
  value: string;
  body: string;
  accent?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="app-card-muted">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-mono font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={`text-3xl font-semibold tracking-tight ${accent}`}>{value}</div>
        <div className="mt-2 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          {icon}
          <span>{body}</span>
        </div>
      </CardContent>
    </Card>
  );
}
