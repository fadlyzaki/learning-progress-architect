import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ExternalLink, HelpCircle, Lightbulb, Loader2, MessageSquare, Pause, Play } from 'lucide-react';
import { useAppMeta } from '../components/AppMeta';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { InlineStateMessage, PageLoadingState, PageMessageState } from '../components/PageStates';
import { useAppData } from '../hooks/useAppData';
import { usePreferences } from '../lib/preferences';
import { ApiError, apiFetch } from '../lib/api';

export function SessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useAppData();
  const { t } = usePreferences();
  const taskId = Number(id);
  const task = data?.tasks.find((item) => item.id === taskId) ?? null;
  useAppMeta({
    title: task?.title ?? t('common.session'),
    description: task?.description ?? t('session.completeHint'),
  });
  const goal = task ? data?.goals.find((item) => item.id === task.goal_id) ?? null : null;
  const taskResourceLinks = task ? data?.task_resources.filter((item) => item.task_id === task.id) ?? [] : [];
  const taskResources = taskResourceLinks
    .map((link) => data?.resources.find((resource) => resource.id === link.resource_id) ?? null)
    .filter((resource): resource is NonNullable<typeof resource> => Boolean(resource));
  const openSession = task
    ? data?.sessions.find((session) => session.task_id === task.id && session.completed_at === null) ?? null
    : null;

  const [isActive, setIsActive] = useState(Boolean(openSession));
  const [hasStarted, setHasStarted] = useState(Boolean(openSession));
  const [time, setTime] = useState(openSession?.duration_seconds ?? 0);
  const [starting, setStarting] = useState(false);
  const [scratchNotes, setScratchNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setTime(openSession?.duration_seconds ?? 0);
    setHasStarted(Boolean(openSession));
    setIsActive(Boolean(openSession));
  }, [openSession?.duration_seconds, openSession?.id]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const interval = window.setInterval(() => {
      setTime((currentTime) => currentTime + 1);
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isActive]);

  const formatTime = (seconds: number) => {
    const wholeSeconds = Math.max(0, seconds);
    const displaySeconds = `0${wholeSeconds % 60}`.slice(-2);
    const minutes = Math.floor(wholeSeconds / 60);
    const displayMinutes = `0${minutes % 60}`.slice(-2);
    const displayHours = `0${Math.floor(wholeSeconds / 3600)}`.slice(-2);
    return `${displayHours}:${displayMinutes}:${displaySeconds}`;
  };

  const sessionState = isActive
    ? 'in_progress'
    : hasStarted
      ? 'paused'
      : 'not_started';

  const canComplete = hasStarted || time > 0;

  const handleToggle = async () => {
    if (!task) {
      return;
    }

    if (!hasStarted) {
      setStarting(true);
      setErrorMessage(null);

      try {
        await apiFetch(`/api/tasks/${task.id}/start`, {
          method: 'POST',
        });

        setHasStarted(true);
        setIsActive(true);
      } catch (startError) {
        console.error(startError);
        setErrorMessage(startError instanceof ApiError ? startError.message : t('session.startFailed'));
      } finally {
        setStarting(false);
      }

      return;
    }

    setIsActive((current) => !current);
  };

  const handleComplete = () => {
    if (!task || !canComplete) {
      return;
    }

    navigate(`/app/comprehension/${task.id}`, {
      state: {
        durationSeconds: time,
      },
    });
  };

  if (loading) {
    return <PageLoadingState rows={2} />;
  }

  if (!data || !task) {
    return (
      <PageMessageState
        title={t('session.notFound')}
        body={error ?? t('session.notFound')}
        actionLabel={t('nav.today')}
        actionTo="/app"
        tone="warning"
      />
    );
  }

  const sessionObjectives = [
    t('session.objectiveGoal', { goal: goal?.title ?? task.title }),
    t('session.objectiveTask', { task: task.title }),
    taskResources[0]
      ? t('session.objectiveMaterials', { resource: taskResources[0].title })
      : t('session.objectiveNoMaterials'),
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8 font-sans">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="warning">{t('session.badge')}</Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
            {task.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">
            {task.description}
          </p>
          {goal && (
            <p className="mt-3 text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              {t('common.goalLabel', { goal: goal.title })}
            </p>
          )}
        </div>

        <Card className="app-card-primary min-w-[19rem]">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  {t('session.stateLabel')}
                </div>
                <CardTitle className="mt-3 text-2xl text-[var(--text-primary)]">
                  {t(`session.state.${sessionState}`)}
                </CardTitle>
                <CardDescription className="mt-2 text-sm leading-relaxed">
                  {t(`session.stateBody.${sessionState}`)}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="font-mono text-3xl font-semibold tracking-[0.08em] text-[var(--accent-amber)]">
                  {formatTime(time)}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <Button
              variant={isActive || !hasStarted ? 'accent' : 'outline'}
              size="lg"
              className="w-full gap-2"
              onClick={() => void handleToggle()}
              disabled={starting}
            >
              {starting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('auth.working')}
                </>
              ) : isActive ? (
                <>
                  <Pause className="h-4 w-4" />
                  {t('session.pauseNow')}
                </>
              ) : hasStarted ? (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  {t('session.resumeNow')}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  {t('session.startNow')}
                </>
              )}
            </Button>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              {canComplete ? t('session.completeHint') : t('session.completeDisabled')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.92fr]">
        <div className="space-y-6">
          <Card className="app-card-supporting">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-[var(--text-primary)]">{t('session.objectives')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-3 text-[var(--text-primary)]">
                {sessionObjectives.map((objective) => (
                  <li key={objective} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/72 px-4 py-3">
                    {objective}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="app-card-supporting">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-[var(--text-primary)]">{t('session.materials')}</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                {t('session.materialsBody')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {taskResources.length > 0 ? (
                taskResources.map((resource) => (
                  <div key={resource.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/78 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-medium text-[var(--text-primary)]">{resource.title}</div>
                        <div className="mt-2 text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                          {t(`resourceType.${resource.type}`)}
                        </div>
                      </div>
                    </div>
                    {resource.reference && (
                      <div className="mt-3">
                        {getReferenceUrl(resource.reference) ? (
                          <a
                            href={getReferenceUrl(resource.reference) ?? undefined}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm break-all text-[var(--accent-blue)] underline decoration-[var(--accent-blue)]/40 underline-offset-4 transition-colors hover:text-[var(--text-primary)]"
                          >
                            <span>{resource.reference}</span>
                            <ExternalLink className="h-4 w-4 shrink-0" />
                          </a>
                        ) : (
                          <div className="text-sm break-all text-[var(--text-secondary)]">{resource.reference}</div>
                        )}
                      </div>
                    )}
                    {resource.notes && (
                      <div className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{resource.notes}</div>
                    )}
                    {getReferenceUrl(resource.reference ?? null) && (
                      <div className="mt-3">
                        <a
                          href={getReferenceUrl(resource.reference ?? null) ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:text-[var(--accent-blue)]"
                        >
                          {t('session.openMaterial')}
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/72 px-4 py-4 text-sm leading-relaxed text-[var(--text-muted)]">
                  {t('session.materialsEmpty')}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="app-card-supporting">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-[var(--text-primary)]">{t('session.notesScratch')}</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                {t('session.notesScratchBody')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <textarea
                className="app-field h-52"
                placeholder={t('session.notesPlaceholder')}
                value={scratchNotes}
                onChange={(event) => setScratchNotes(event.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {errorMessage && (
            <div className="space-y-3">
              <InlineStateMessage title={t('session.startFailed')} body={errorMessage} tone="danger" />
              <Button variant="danger" className="w-full" onClick={() => void handleToggle()}>
                {t('session.retryStart')}
              </Button>
            </div>
          )}

          <Card className="app-card-muted">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-[var(--text-primary)]">{t('session.quickActions')}</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                {t('session.quickActionsBody')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <UnavailablePrompt icon={<Lightbulb className="h-4 w-4 text-amber-400" />} label={t('session.actionExplain')} unavailable={t('session.actionUnavailable')} />
              <UnavailablePrompt icon={<HelpCircle className="h-4 w-4 text-[var(--accent-blue)]" />} label={t('session.actionExample')} unavailable={t('session.actionUnavailable')} />
              <UnavailablePrompt icon={<MessageSquare className="h-4 w-4 text-green-500" />} label={t('session.actionAnalogy')} unavailable={t('session.actionUnavailable')} />
              <UnavailablePrompt icon={<AlertTriangle className="h-4 w-4 text-red-400" />} label={t('session.actionConfused')} unavailable={t('session.actionUnavailable')} />
            </CardContent>
          </Card>

          <Button
            variant="accent"
            size="lg"
            className="w-full gap-2 py-6 text-base"
            onClick={handleComplete}
            disabled={!canComplete}
          >
            <CheckCircle2 className="h-5 w-5" />
            {t('session.complete')}
          </Button>

          {!canComplete && (
            <p className="text-center text-sm leading-relaxed text-[var(--text-muted)]">
              {t('session.completeDisabled')}
            </p>
          )}

          <Link to="/app" className="block">
            <Button variant="ghost" className="w-full">
              {t('nav.today')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function getReferenceUrl(reference: string | null) {
  if (!reference) {
    return null;
  }

  const trimmed = reference.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    if (/^www\./i.test(trimmed)) {
      return `https://${trimmed}`;
    }

    if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
      return `https://${trimmed}`;
    }

    return null;
  }
}

function UnavailablePrompt({
  icon,
  label,
  unavailable,
}: {
  icon: ReactNode;
  label: string;
  unavailable: string;
}) {
  return (
    <div
      aria-disabled="true"
      className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/72 px-4 py-3 text-left opacity-76"
    >
      <div className="flex items-center gap-3 text-sm text-[var(--text-primary)]">
        {icon}
        <span>{label}</span>
      </div>
      <Badge variant="outline">{unavailable}</Badge>
    </div>
  );
}
