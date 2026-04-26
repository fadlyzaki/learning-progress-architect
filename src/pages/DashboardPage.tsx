import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, Layers3, Play, Sparkles, Target } from 'lucide-react';
import { useAppMeta } from '../components/AppMeta';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { PageIntro, PageLoadingState, PageMessageState } from '../components/PageStates';
import { PrimaryActionPanel, SecondaryActionHint } from '../components/PrimaryActionPanel';
import { useAppData } from '../hooks/useAppData';
import { usePreferences } from '../lib/preferences';

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
}

export function DashboardPage() {
  const { data, loading, error, refetch } = useAppData();
  const { t } = usePreferences();
  useAppMeta({
    title: t('nav.today'),
    description: t('dashboard.body'),
  });

  if (loading) {
    return <PageLoadingState variant="dashboard" rows={2} />;
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageIntro eyebrow={t('dashboard.kicker')} title={t('nav.today')} />
        <PageMessageState
          eyebrow={t('dashboard.kicker')}
          title={t('nav.today')}
          body={error ?? t('dashboard.emptyBody')}
          actionLabel={t('common.retry')}
          onAction={() => void refetch()}
          tone="warning"
        />
      </div>
    );
  }

  const activeGoal = data.goals[0];

  if (!activeGoal) {
    return (
      <div className="space-y-8 font-sans">
        <div>
          <div className="mb-3 text-[11px] font-mono font-semibold uppercase tracking-[0.24em] text-[var(--accent-amber)]">
            {t('dashboard.emptyKicker')}
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
            {t('dashboard.emptyTitle', { name: data.user.name })}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">
            {t('dashboard.emptyBody')}
          </p>
        </div>
        <PageMessageState
          title={t('dashboard.emptyAction')}
          body={t('dashboard.emptyCard')}
          actionLabel={t('dashboard.emptyAction')}
          actionTo="/onboarding"
        />
      </div>
    );
  }

  const tasks = data.tasks.filter((task) => task.goal_id === activeGoal.id);
  const goalResources = data.resources.filter((resource) => resource.goal_id === activeGoal.id);
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
  const latestNote = data.notes[0] ?? null;

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 text-[11px] font-mono font-semibold uppercase tracking-[0.24em] text-[var(--accent-amber)]">
            {t('dashboard.kicker')}
          </div>
          <h1 className="break-words text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
            {t('dashboard.title', { name: data.user.name })}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">
            {t('dashboard.body')}
          </p>
        </div>

        <Card className="app-card-muted max-w-sm">
          <CardHeader className="pb-4">
            <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
              {t('dashboard.currentFocus')}
            </div>
            <CardTitle className="break-words text-xl text-[var(--text-primary)]">{activeGoal.title}</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {t('dashboard.currentFocusBody')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex items-center justify-between gap-3">
              <Badge variant="outline">{t(`status.${activeGoal.status}`)}</Badge>
              <span className="text-sm text-[var(--text-muted)]">
                {t('dashboard.tasksCount', { completed: completedTasks, total: tasks.length })}
              </span>
            </div>
            <Progress value={progress} indicatorClassName="bg-[var(--accent-amber)]" />
          </CardContent>
        </Card>
      </div>

      <PrimaryActionPanel
        eyebrow={t('dashboard.nextFocus')}
        title={nextTask?.title ?? t('dashboard.caughtUp')}
        description={nextTask?.description ?? t('dashboard.caughtUpBody')}
        meta={
          nextEvent ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm text-[var(--text-secondary)]">
              <Clock className="h-4 w-4 text-[var(--accent-amber)]" />
              <span>{t('common.minutes', { count: nextEvent.duration })}</span>
            </div>
          ) : (
            <Badge variant="outline">{t(`status.${activeGoal.status}`)}</Badge>
          )
        }
        insight={
          <span>
            {t('dashboard.nextFocusBody')} {nextTask ? t('dashboard.highLeverage', { goal: activeGoal.title }) : t('dashboard.openRoadmapSecondary')}
          </span>
        }
        actions={
          <>
            {nextTask ? (
              <Link to={`/app/session/${nextTask.id}`} className="w-full sm:w-auto">
                <Button variant="accent" size="lg" className="w-full gap-2 sm:w-auto">
                  <Play className="h-4 w-4 fill-current" />
                  {t('dashboard.startSession')}
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/app/roadmap" className="w-full sm:w-auto">
                  <Button variant="accent" size="lg" className="w-full sm:w-auto">
                    {t('dashboard.openRoadmap')}
                  </Button>
                </Link>
                {activeGoal.status === 'completed' && activeGoal.level !== 'Advanced' && (
                  <Link to={`/onboarding?goal=${encodeURIComponent(activeGoal.title)}&level=${activeGoal.level === 'Beginner' ? 'Intermediate' : 'Advanced'}`} className="w-full sm:w-auto">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto">
                      {t('roadmap.continueLevel', { level: activeGoal.level === 'Beginner' ? 'Intermediate' : 'Advanced' })}
                    </Button>
                  </Link>
                )}
              </>
            )}

            {nextTask && (
              <Link to="/app/roadmap" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  {t('dashboard.openRoadmap')}
                </Button>
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <Card className="app-card-supporting">
          <CardHeader className="pb-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  {t('dashboard.currentRoadmap')}
                </div>
                <CardTitle className="mt-3 break-words text-2xl text-[var(--text-primary)]">{activeGoal.title}</CardTitle>
                <CardDescription className="mt-2 text-base leading-relaxed">
                  {t('dashboard.tasksCount', { completed: completedTasks, total: tasks.length })}
                </CardDescription>
              </div>
              <Link to="/app/roadmap" className="hidden sm:block">
                <Button variant="ghost" className="gap-2 text-[var(--text-primary)]">
                  {t('dashboard.openRoadmapLink')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <Progress value={progress} indicatorClassName="bg-[var(--accent-blue)]" />
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="app-list-row-quiet rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-base font-medium text-[var(--text-primary)]">{task.title}</p>
                    <p className="mt-2 break-words text-sm leading-relaxed text-[var(--text-secondary)]">
                      {task.description}
                    </p>
                  </div>
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-green-500" />
                  ) : (
                    <Badge variant={task.status === 'in_progress' ? 'info' : 'outline'}>
                      {t(`status.${task.status}`)}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="app-card-muted">
            <CardHeader className="pb-4">
              <div className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                <Layers3 className="h-4 w-4" />
                {t('dashboard.notePreview')}
              </div>
              <CardTitle className="mt-3 text-xl text-[var(--text-primary)]">
                {latestNote?.topic ?? t('dashboard.planNotes')}
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {t('dashboard.notePreviewBody')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--text-secondary)]">
                {latestNote ? truncate(latestNote.content, 240) : t('dashboard.noNotes')}
              </p>
              <SecondaryActionHint>{t('dashboard.moreNotes')}</SecondaryActionHint>
            </CardContent>
          </Card>

          <Card className="app-card-muted">
            <CardHeader className="pb-4">
              <div className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                <Sparkles className="h-4 w-4" />
                {t('dashboard.signalPanel')}
              </div>
              <CardTitle className="mt-3 text-xl text-[var(--text-primary)]">{t('dashboard.signalPanel')}</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {t('dashboard.signalPanelBody')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <SignalRow
                icon={<Target className="h-4 w-4 text-[var(--accent-blue)]" />}
                label={t('dashboard.resourceSignal')}
                value={t('dashboard.resourceSignalValue', { count: goalResources.length })}
              />
              <SignalRow
                icon={<Clock className="h-4 w-4 text-[var(--accent-amber)]" />}
                label={t('dashboard.studyTime')}
                value={t('common.minutes', { count: studyMinutes })}
              />
              <SignalRow
                icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
                label={t('dashboard.tasksCompleted')}
                value={String(completedTasks)}
              />
              <SignalRow
                icon={<Sparkles className="h-4 w-4 text-[var(--accent-blue)]" />}
                label={t('dashboard.averageConfidence')}
                value={`${avgConfidence}%`}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SignalRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/72 px-4 py-3">
      <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-sm font-medium text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
