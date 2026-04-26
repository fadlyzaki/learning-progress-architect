import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, BookOpen, CheckCircle2, ExternalLink, HelpCircle, Lightbulb, Loader2, MessageSquare, Pause, Play, Sparkles, X } from 'lucide-react';
import { useAppMeta } from '../components/AppMeta';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { MarkdownContent } from '../components/ui/MarkdownContent';
import { InlineStateMessage, PageLoadingState, PageMessageState } from '../components/PageStates';
import { useAppData } from '../hooks/useAppData';
import { usePreferences } from '../lib/preferences';
import { ApiError, apiFetch, requestQuickAction, type QuickActionResponse } from '../lib/api';
import type { QuickActionKind, QuickActionRecord } from '../types';

type SessionQuickAction = {
  kind: QuickActionKind;
  label: string;
  icon: ReactNode;
};

const EMPTY_QUICK_ACTION_STATE: Record<QuickActionKind, QuickActionRecord | null> = {
  explain: null,
  example: null,
  analogy: null,
  confused: null,
};

const SESSION_QUICK_ACTIONS: SessionQuickAction[] = [
  {
    kind: 'explain',
    label: 'session.actionExplain',
    icon: <Lightbulb className="h-4 w-4 text-amber-400" />,
  },
  {
    kind: 'example',
    label: 'session.actionExample',
    icon: <HelpCircle className="h-4 w-4 text-[var(--accent-blue)]" />,
  },
  {
    kind: 'analogy',
    label: 'session.actionAnalogy',
    icon: <MessageSquare className="h-4 w-4 text-green-500" />,
  },
  {
    kind: 'confused',
    label: 'session.actionConfused',
    icon: <AlertTriangle className="h-4 w-4 text-red-400" />,
  },
];

export function SessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useAppData();
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
  const persistedQuickActions = task
    ? data?.quick_actions.filter((item) => item.task_id === task.id) ?? []
    : [];

  const [isActive, setIsActive] = useState(Boolean(openSession));
  const [hasStarted, setHasStarted] = useState(Boolean(openSession));
  const [time, setTime] = useState(openSession?.duration_seconds ?? 0);
  const [starting, setStarting] = useState(false);
  const [scratchNotes, setScratchNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quickActionState, setQuickActionState] = useState<Record<QuickActionKind, QuickActionRecord | null>>(EMPTY_QUICK_ACTION_STATE);
  const [quickActionLoading, setQuickActionLoading] = useState<Record<QuickActionKind, boolean>>({
    explain: false,
    example: false,
    analogy: false,
    confused: false,
  });
  const [quickActionError, setQuickActionError] = useState<string | null>(null);
  const [selectedQuickAction, setSelectedQuickAction] = useState<QuickActionRecord | null>(null);
  const [generatingMaterials, setGeneratingMaterials] = useState(false);

  useEffect(() => {
    setTime(openSession?.duration_seconds ?? 0);
    setHasStarted(Boolean(openSession));
    setIsActive(Boolean(openSession));
  }, [openSession?.duration_seconds, openSession?.id]);

  useEffect(() => {
    setQuickActionState(buildQuickActionState(persistedQuickActions));
  }, [task?.id, data?.quick_actions]);

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

  useEffect(() => {
    if (!selectedQuickAction) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedQuickAction(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedQuickAction]);

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

  const handleQuickAction = async (action: QuickActionKind) => {
    if (!task || quickActionLoading[action]) {
      return;
    }

    const existingQuickAction = quickActionState[action];
    if (existingQuickAction) {
      setSelectedQuickAction(existingQuickAction);
      setQuickActionError(null);
      return;
    }

    setQuickActionError(null);
    setQuickActionLoading((current) => ({
      ...current,
      [action]: true,
    }));

    try {
      const response = await requestQuickAction(task.id, action);
      const nextQuickAction = toQuickActionRecord(task.id, response);
      setQuickActionState((current) => ({
        ...current,
        [action]: nextQuickAction,
      }));
      setSelectedQuickAction(nextQuickAction);
    } catch (requestError) {
      console.error(requestError);
      setQuickActionError(
        requestError instanceof ApiError
          ? requestError.message
          : t('session.quickActionsFailed'),
      );
    } finally {
      setQuickActionLoading((current) => ({
        ...current,
        [action]: false,
      }));
    }
  };

  const handleGenerateMaterials = async () => {
    if (!task || generatingMaterials) return;
    setGeneratingMaterials(true);
    setErrorMessage(null);
    try {
      await apiFetch(`/api/tasks/${task.id}/materials/generate`, { method: 'POST' });
      await refetch();
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof ApiError ? err.message : t('session.generateMaterialsFailed'));
    } finally {
      setGeneratingMaterials(false);
    }
  };

  if (loading) {
    return <PageLoadingState variant="detail" rows={2} />;
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
  const primarySupportTitle = taskResources.length > 0 ? t('session.materials') : t('session.objectives');
  const primarySupportBody = taskResources.length > 0 ? t('session.materialsBody') : t('session.studyBriefBody');
  const scratchWordCount = countWords(scratchNotes);

  return (
    <div className="mx-auto max-w-5xl space-y-8 font-sans">
      <div className="space-y-4">
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
      </div>
      <Card className="app-card-primary">
        <CardHeader className="pb-5">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                {t('session.stateLabel')}
              </div>
              <CardTitle className="mt-3 text-3xl text-[var(--text-primary)]">
                {t(`session.state.${sessionState}`)}
              </CardTitle>
              <CardDescription className="mt-3 max-w-2xl text-base leading-relaxed">
                {t(`session.stateBody.${sessionState}`)}
              </CardDescription>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <FlowStep
                  label={t('session.flowPrepare')}
                  active={!hasStarted}
                  complete={hasStarted}
                />
                <FlowStep
                  label={t('session.flowStudy')}
                  active={hasStarted}
                  complete={canComplete}
                />
                <FlowStep
                  label={t('session.flowReflect')}
                  active={canComplete && !isActive}
                />
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-amber-500/22 bg-[var(--bg-card)]/70 p-5 lg:text-right">
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">
                {t('session.flowTitle')}
              </div>
              <div className="mt-3 font-mono text-4xl font-semibold tracking-[0.08em] text-[var(--accent-amber)]">
                {formatTime(time)}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                {t('session.keepStudying')}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant={isActive || !hasStarted ? 'accent' : 'outline'}
              size="lg"
              className="w-full gap-2 sm:flex-1"
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

            <Button
              variant="accent"
              size="lg"
              className="w-full gap-2 sm:flex-1"
              onClick={handleComplete}
              disabled={!canComplete}
            >
              <CheckCircle2 className="h-5 w-5" />
              {t('session.complete')}
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <InlineStateMessage
              title={t('session.saveBoundaryTitle')}
              body={t('session.saveBoundaryBody')}
            />
            <InlineStateMessage
              title={t('session.nextStepTitle')}
              body={canComplete ? t('session.nextStepBody') : t('session.completeDisabled')}
            />
          </div>

          {!canComplete && (
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              {t('session.completeDisabled')}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="space-y-6 lg:col-span-2">
          <Card className="app-card-supporting">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl text-[var(--text-primary)]">{primarySupportTitle}</CardTitle>
                  <CardDescription className="mt-2 text-base leading-relaxed">
                    {primarySupportBody}
                  </CardDescription>
                </div>
                {taskResources.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{t('session.materialsCount', { count: taskResources.length })}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => void handleGenerateMaterials()} disabled={generatingMaterials}>
                       {generatingMaterials ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                       <span className="sr-only">{t('session.generateMaterials')}</span>
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => void handleGenerateMaterials()} disabled={generatingMaterials}>
                    {generatingMaterials ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    {t('session.generateMaterials')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {taskResources.length > 0 ? (
                <div className="space-y-2">
                  {taskResources.map((resource) => (
                    <div key={resource.id}>
                      <StudyMaterialCard resource={resource} />
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="space-y-3 text-[var(--text-primary)]">
                  {sessionObjectives.map((objective) => (
                    <li key={objective} className="app-list-row-quiet rounded-2xl px-4 py-3">
                      {objective}
                    </li>
                  ))}
                </ul>
              )}

              {taskResources.length > 0 ? (
                <div className="rounded-2xl border border-[var(--border-color)]/70 bg-[var(--bg-soft)]/46 p-4">
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    {t('session.objectives')}
                  </div>
                  <ul className="mt-2 space-y-2 text-sm text-[var(--text-secondary)]">
                    {sessionObjectives.map((objective) => (
                      <li key={objective} className="app-list-row-quiet rounded-xl px-3 py-2">
                        {objective}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {errorMessage && (
            <div className="space-y-3">
              <InlineStateMessage title={t('session.startFailed')} body={errorMessage} tone="danger" />
              <Button variant="danger" className="w-full" onClick={() => void handleToggle()}>
                {t('session.retryStart')}
              </Button>
            </div>
          )}

          <Card className="app-card-supporting">
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-xl text-[var(--text-primary)]">{t('session.notesScratch')}</CardTitle>
                    <Badge variant="outline">{t('session.scratchLocal')}</Badge>
                  </div>
                  <CardDescription className="mt-2 text-base leading-relaxed">
                    {t('session.notesScratchHint')}
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  {scratchWordCount > 0 ? t('session.notesScratchCount', { count: scratchWordCount }) : t('session.notesScratchEmpty')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-[1.4rem] border border-[var(--border-color)] bg-[var(--bg-card)]/70 p-3">
                <textarea
                  className="app-field h-52 border-transparent bg-transparent px-3 py-3 shadow-none"
                  placeholder={t('session.notesPlaceholder')}
                  value={scratchNotes}
                  onChange={(event) => setScratchNotes(event.target.value)}
                />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
                {t('session.scratchLocalBody')}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-1">
          <Card className="app-card-muted">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl text-[var(--text-primary)]">{t('session.quickActions')}</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                {t('session.quickActionsBody')}
              </CardDescription>
              <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                {t('session.quickActionsHelper')}
              </p>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {SESSION_QUICK_ACTIONS.map((action) => (
                <div key={action.kind}>
                  <QuickActionRow
                    icon={action.icon}
                    label={t(action.label)}
                    stateLabel={
                      quickActionLoading[action.kind]
                        ? t('session.actionLoading')
                        : quickActionState[action.kind]
                          ? t('session.actionGenerated')
                          : t('session.actionNotGenerated')
                    }
                    ctaLabel={quickActionState[action.kind] ? t('session.actionView') : t('session.actionGenerate')}
                    isLoading={quickActionLoading[action.kind]}
                    onClick={() => void handleQuickAction(action.kind)}
                  />
                </div>
              ))}
              {quickActionError && (
                <InlineStateMessage
                  title={t('session.quickActionsErrorTitle')}
                  body={quickActionError}
                  tone="danger"
                />
              )}
            </CardContent>
          </Card>

          <Link to="/app" className="block">
            <Button variant="ghost" className="w-full">
              {t('nav.today')}
            </Button>
          </Link>
        </div>
      </div>

      {selectedQuickAction ? (
        <QuickActionModal
          title={t(getQuickActionLabelKey(selectedQuickAction.action))}
          content={selectedQuickAction.content}
          onClose={() => setSelectedQuickAction(null)}
          closeLabel={t('session.quickActionModalClose')}
          kicker={t('session.quickActionModalKicker')}
        />
      ) : null}
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

function formatReferenceLabel(reference: string | null) {
  if (!reference) {
    return '';
  }

  const trimmed = reference.trim();
  if (!trimmed) {
    return '';
  }

  const normalized = getReferenceUrl(trimmed);
  if (!normalized) {
    return trimmed;
  }

  try {
    const url = new URL(normalized);
    const host = url.hostname.replace(/^www\./i, '');
    const path = url.pathname.replace(/\/$/, '');
    const readablePath = path && path !== '/'
      ? path
          .split('/')
          .filter(Boolean)
          .slice(0, 2)
          .join(' / ')
      : '';
    return readablePath ? `${host} · ${readablePath}` : host;
  } catch {
    return trimmed;
  }
}

function StudyMaterialCard({
  resource,
}: {
  resource: {
    id: number;
    title: string;
    type: string;
    reference: string | null;
    notes: string | null;
  };
}) {
  const { t } = usePreferences();
  const referenceUrl = getReferenceUrl(resource.reference);
  const referenceLabel = formatReferenceLabel(resource.reference);

  return (
    <div className="group relative overflow-hidden rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--bg-card)]/40 p-4 transition-all hover:bg-[var(--bg-card)]/80 hover:shadow-[0_4px_24px_-8px_var(--glow-amber)]">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-amber)]/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative flex flex-col gap-3">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--accent-amber)] transition-colors group-hover:border-[var(--accent-amber)]/30 group-hover:bg-[var(--accent-amber)]/10 shadow-inner">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">{resource.title}</h3>
              <Badge variant="outline" className="text-[var(--text-secondary)] group-hover:border-[var(--accent-amber)]/20 group-hover:text-[var(--accent-amber)]/80 transition-colors">{t(`resourceType.${resource.type}`)}</Badge>
            </div>
          </div>
        </div>

        {resource.notes ? (
          <div className="ml-14">
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{resource.notes}</p>
          </div>
        ) : null}

        {resource.reference ? (
          <div className="mt-2 ml-14 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2.5 transition-colors group-hover:border-[var(--accent-amber)]/30">
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                {referenceLabel}
              </div>
            </div>
            {referenceUrl ? (
              <a
                href={referenceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-1.5 text-xs font-medium text-[var(--accent-blue)] transition-colors hover:text-blue-400"
              >
                {t('session.openMaterial')}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <span className="text-xs text-[var(--text-secondary)]">{t('session.referenceUnavailable')}</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function QuickActionRow({
  icon,
  label,
  stateLabel,
  ctaLabel,
  isLoading,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  stateLabel: string;
  ctaLabel: string;
  isLoading: boolean;
  onClick: () => void;
}) {
  return (
    <div
      aria-disabled="true"
      className="app-list-row-quiet flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left opacity-76"
    >
      <div className="flex min-w-0 items-center gap-3 text-sm text-[var(--text-primary)]">
        <div className="shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="font-medium text-[var(--text-primary)]">{label}</div>
          <div className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{stateLabel}</div>
        </div>
      </div>
      <Button variant="outline" size="sm" className="min-w-24" onClick={onClick} disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {stateLabel}
          </>
        ) : (
          ctaLabel
        )}
      </Button>
    </div>
  );
}

function FlowStep({
  label,
  active,
  complete = false,
}: {
  label: string;
  active: boolean;
  complete?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        active
          ? 'border-amber-500/35 bg-amber-500/8'
          : complete
            ? 'border-green-500/25 bg-green-500/8'
            : 'border-[var(--border-color)] bg-[var(--bg-card)]/72'
      }`}
    >
      <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-3 h-1.5 rounded-full bg-[var(--border-color)]">
        <div
          className={`h-full rounded-full ${
            complete || active ? 'bg-[var(--accent-amber)]' : 'bg-transparent'
          }`}
          style={{ width: complete ? '100%' : active ? '58%' : '0%' }}
        />
      </div>
    </div>
  );
}

function countWords(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
}

function toQuickActionRecord(taskId: number, response: QuickActionResponse): QuickActionRecord {
  return {
    id: 0,
    user_id: '',
    task_id: taskId,
    action: response.action,
    content: response.content,
    created_at: response.updatedAt,
    updated_at: response.updatedAt,
  };
}

function buildQuickActionState(records: QuickActionRecord[]) {
  return {
    explain: records.find((item) => item.action === 'explain') ?? null,
    example: records.find((item) => item.action === 'example') ?? null,
    analogy: records.find((item) => item.action === 'analogy') ?? null,
    confused: records.find((item) => item.action === 'confused') ?? null,
  };
}

function QuickActionModal({
  title,
  content,
  onClose,
  closeLabel,
  kicker,
}: {
  title: string;
  content: string;
  onClose: () => void;
  closeLabel: string;
  kicker: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-8 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-action-title"
      onClick={onClose}
    >
      <div
        className="app-card-primary flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] p-6 md:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border-color)] pb-5">
          <div>
            <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.22em] text-[var(--accent-amber)]">
              {kicker}
            </div>
            <h2 id="quick-action-title" className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            aria-label={closeLabel}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-2">
          <div className="rounded-[1.25rem] border border-[var(--border-color)]/70 bg-[var(--bg-surface)] p-5 shadow-sm md:p-6">
            <MarkdownContent content={content} className="text-[15px] leading-relaxed text-[var(--text-secondary)] md:text-[16px] md:leading-[1.75]" />
          </div>
        </div>

        <div className="mt-6 flex shrink-0 justify-end border-t border-[var(--border-color)] pt-5">
          <Button variant="outline" onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function getQuickActionLabelKey(action: QuickActionKind) {
  switch (action) {
    case 'explain':
      return 'session.actionExplain';
    case 'example':
      return 'session.actionExample';
    case 'analogy':
      return 'session.actionAnalogy';
    case 'confused':
      return 'session.actionConfused';
  }
}
