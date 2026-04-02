import { Activity, Clock, Target, CheckCircle2, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { useAppData } from '../hooks/useAppData';
import { usePreferences } from '../lib/preferences';

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
    return <p className="text-[var(--text-muted)]">{error ?? 'Unable to load progress.'}</p>;
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
  const recentSessions = completedSessions.slice(0, 5);

  return (
    <div className="space-y-8 font-sans">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-mono font-bold uppercase tracking-tight text-[var(--text-primary)]">
            {t('progress.title')}
          </h1>
          <p className="mt-2 font-serif italic text-[var(--text-secondary)]">
            {t('progress.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card className="bg-[var(--bg-soft)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)]">{t('progress.totalStudyTime')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-bold text-[var(--text-primary)]">{totalStudyMinutes}m</div>
            <div className="text-sm text-green-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {t('progress.totalStudyTimeBody')}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-soft)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)]">{t('progress.tasksCompleted')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-bold text-[var(--text-primary)]">{completedTasks.length}</div>
            <div className="mt-1 text-sm text-[var(--text-secondary)]">{t('progress.tasksCompletedBody', { count: data.goals.length })}</div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-soft)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)]">{t('progress.currentStreak')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-bold text-amber-500">{t('progress.days', { count: streak })}</div>
            <div className="mt-1 text-sm text-[var(--text-secondary)]">{t('progress.currentStreakBody')}</div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-soft)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-[var(--text-muted)]">{t('progress.averageConfidence')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-bold text-blue-400">{averageConfidence}%</div>
            <div className="mt-1 text-sm text-[var(--text-secondary)]">{t('progress.averageConfidenceBody')}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-[var(--bg-soft)]">
          <CardHeader>
            <CardTitle className="text-xl">{t('progress.activeGoal')}</CardTitle>
            <CardDescription>{activeGoal?.title ?? t('progress.noActiveGoal')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {activeGoal ? (
              <>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[var(--text-secondary)]">{t('progress.overallCompletion')}</span>
                    <span className="font-mono text-[var(--text-primary)]">
                      {Math.round(
                        ((data.tasks.filter((task) => task.goal_id === activeGoal.id && task.status === 'completed').length /
                          Math.max(data.tasks.filter((task) => task.goal_id === activeGoal.id).length, 1)) *
                          100),
                      )}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      (data.tasks.filter((task) => task.goal_id === activeGoal.id && task.status === 'completed').length /
                        Math.max(data.tasks.filter((task) => task.goal_id === activeGoal.id).length, 1)) *
                      100
                    }
                    indicatorClassName="bg-amber-500"
                  />
                </div>

                <div className="space-y-4 border-t border-[var(--border-color)] pt-4">
                  <h4 className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">{t('progress.taskStatus')}</h4>
                  <div className="space-y-3">
                    {data.tasks
                      .filter((task) => task.goal_id === activeGoal.id)
                      .map((task) => (
                        <div key={task.id} className="flex items-center gap-3">
                          {task.status === 'completed' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <Activity className="w-4 h-4 text-amber-500" />
                          )}
                          <span className="flex-1 text-sm text-[var(--text-primary)]">{task.title}</span>
                          <Badge
                            variant={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'warning' : 'secondary'}
                            className="text-[10px]"
                          >
                            {t(`status.${task.status}`)}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-[var(--text-muted)]">{t('progress.unlock')}</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-soft)]">
          <CardHeader>
            <CardTitle className="text-xl">{t('progress.recentActivity')}</CardTitle>
            <CardDescription>{t('progress.recentActivityBody')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-4 before:absolute before:inset-0 before:ml-2 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:via-[var(--border-color)] before:to-transparent">
              {recentSessions.length > 0 ? (
                recentSessions.map((session) => {
                  const task = data.tasks.find((item) => item.id === session.task_id);
                  return (
                    <div key={session.id} className="relative flex items-center justify-between group">
                      <div className="z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-[var(--bg-void)] bg-amber-500 shadow" />
                      <div className="w-[calc(100%-2rem)] rounded-lg border border-[var(--border-color)] bg-[var(--bg-void)] p-4">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="border-[var(--border-strong)] text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">
                            {t('common.session')}
                          </Badge>
                          <span className="text-xs font-mono text-[var(--text-muted)]">
                            {session.completed_at ? formatDate(session.completed_at) : t('common.today')}
                          </span>
                        </div>
                        <h4 className="text-sm font-medium text-[var(--text-primary)]">{task?.title ?? 'Task'}</h4>
                        <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <Clock className="w-3 h-3" /> {t('common.minutes', { count: Math.round(session.duration_seconds / 60) })}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-[var(--text-muted)]">{t('progress.noActivity')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
