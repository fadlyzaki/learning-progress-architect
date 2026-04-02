import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Clock, Loader2, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { useAppData } from '../hooks/useAppData';
import { usePreferences } from '../lib/preferences';

export function DashboardPage() {
  const { data, loading, error } = useAppData();
  const { t } = usePreferences();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-mono font-bold uppercase tracking-tight text-[var(--text-primary)]">{t('nav.today')}</h1>
        <p className="text-[var(--text-muted)]">{error ?? 'Sign in to view your learning workspace.'}</p>
      </div>
    );
  }

  const activeGoal = data.goals[0];
  const tasks = activeGoal ? data.tasks.filter((task) => task.goal_id === activeGoal.id) : [];
  const goalResources = activeGoal ? data.resources.filter((resource) => resource.goal_id === activeGoal.id) : [];
  const nextTask = tasks.find((task) => task.status !== 'completed') ?? null;
  const nextEvent = nextTask ? data.events.find((event) => event.task_id === nextTask.id) ?? null : null;
  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const progress = tasks.length ? (completedTasks / tasks.length) * 100 : 0;
  const completedSessions = data.sessions.filter((session) => session.completed_at);
  const studyMinutes = Math.round(
    completedSessions.reduce((sum, session) => sum + session.duration_seconds, 0) / 60,
  );
  const avgConfidence = completedSessions.length
    ? Math.round(
        (completedSessions.reduce((sum, session) => sum + (session.confidence ?? 0), 0) /
          completedSessions.length) *
          20,
      )
    : 0;

  if (!activeGoal) {
    return (
      <div className="space-y-8 font-sans">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-amber-500 mb-3">
            {t('dashboard.emptyKicker')}
          </div>
          <h1 className="text-3xl font-mono font-bold uppercase tracking-tight text-[var(--text-primary)]">
            {t('dashboard.emptyTitle', { name: data.user.name })}
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-[var(--text-secondary)]">
            {t('dashboard.emptyBody')}
          </p>
        </div>
        <Card className="bg-[var(--bg-soft)]">
          <CardContent className="py-10 flex flex-col items-start gap-4">
            <p className="max-w-xl text-[var(--text-secondary)]">
              {t('dashboard.emptyCard')}
            </p>
            <Link to="/onboarding">
              <Button variant="accent" className="font-mono uppercase tracking-wider">
                {t('dashboard.emptyAction')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-amber-500 mb-3">
            {t('dashboard.kicker')}
          </div>
          <h1 className="text-3xl font-mono font-bold uppercase tracking-tight text-[var(--text-primary)]">
            {t('dashboard.title', { name: data.user.name })}
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-[var(--text-secondary)]">
            {t('dashboard.body')}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-[var(--text-primary)]">{activeGoal.title}</span>
          <Badge variant="outline" className="ml-2 bg-[var(--bg-card)]">
            {t(`status.${activeGoal.status}`)}
          </Badge>
        </div>
      </div>

      <Card className="relative overflow-hidden border-amber-500/20 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-void)] shadow-[0_0_35px_var(--glow-amber)]">
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start gap-4">
            <div>
              <Badge variant="warning" className="mb-3 font-mono tracking-widest uppercase text-[10px]">
                {t('dashboard.recommended')}
              </Badge>
              <CardTitle className="text-2xl text-[var(--text-primary)]">
                {nextTask?.title ?? t('dashboard.caughtUp')}
              </CardTitle>
              <CardDescription className="mt-2 max-w-xl text-[var(--text-secondary)]">
                {nextTask?.description ?? t('dashboard.caughtUpBody')}
              </CardDescription>
            </div>
            {nextEvent && (
              <div className="flex items-center gap-2 rounded-md border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-1.5 text-[var(--text-secondary)]">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">{t('common.minutes', { count: nextEvent.duration })}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mt-4 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <AlertCircle className="w-4 h-4 text-blue-400" />
              <span>
                {t('dashboard.highLeverage', { goal: activeGoal.title })}{' '}
              </span>
            </div>
            {nextTask ? (
              <Link to={`/app/session/${nextTask.id}`} className="w-full sm:w-auto">
                <Button variant="accent" size="lg" className="w-full sm:w-auto font-mono uppercase tracking-wider gap-2">
                  <Play className="w-4 h-4 fill-current" />
                  {t('dashboard.startSession')}
                </Button>
              </Link>
            ) : (
              <Link to="/app/roadmap" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto font-mono uppercase tracking-wider">
                  {t('dashboard.openRoadmap')}
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-[var(--bg-soft)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">{t('dashboard.currentRoadmap')}</CardTitle>
            <Link to="/app/roadmap" className="flex items-center gap-1 text-sm font-medium text-amber-500 transition-colors hover:text-amber-400">
              {t('dashboard.openRoadmapLink')} <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-end mb-2">
                <span className="font-medium text-[var(--text-primary)]">{activeGoal.title}</span>
                <span className="text-sm text-[var(--text-muted)]">
                  {t('dashboard.tasksCount', { completed: completedTasks, total: tasks.length })}
                </span>
              </div>
              <Progress value={progress} indicatorClassName="bg-blue-500" />

              <div className="mt-6 space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : task.status === 'in_progress' ? (
                      <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)]" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                        {task.title}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{task.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-[var(--bg-soft)] border-red-900/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">{t('dashboard.planNotes')}</CardTitle>
              <CardDescription>{t('dashboard.planNotesBody')}</CardDescription>
            </CardHeader>
            <CardContent>
              {data.notes.length > 0 ? (
                <div className="space-y-3">
                  {data.notes.slice(0, 3).map((note) => (
                    <div key={note.id} className="flex flex-col gap-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{note.topic}</span>
                      <span className="whitespace-pre-line text-xs text-[var(--text-muted)]">{note.content}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">{t('dashboard.noNotes')}</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-soft)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t('dashboard.signalPanel')}</CardTitle>
              <CardDescription>{t('dashboard.signalPanelBody')}</CardDescription>
            </CardHeader>
            <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">{t('dashboard.resourceSignal')}</span>
            <span className="font-mono text-[var(--text-primary)]">
              {t('dashboard.resourceSignalValue', { count: goalResources.length })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-[var(--text-secondary)]">{t('dashboard.studyTime')}</span>
            <span className="font-mono text-[var(--text-primary)]">{t('common.minutes', { count: studyMinutes })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-secondary)]">{t('dashboard.tasksCompleted')}</span>
                  <span className="font-mono text-[var(--text-primary)]">{completedTasks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-secondary)]">{t('dashboard.averageConfidence')}</span>
                  <span className="font-mono text-green-400">{avgConfidence}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
