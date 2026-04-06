import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { ApiError, apiFetch } from '../lib/api';
import { cn } from '../lib/utils';
import { InlineStateMessage } from '../components/PageStates';
import { usePreferences } from '../lib/preferences';
import type {
  LearningResourceInput,
  ResourceMode,
  ResourceType,
  WorkflowCreateResponse,
} from '../types';

const levels = ['Beginner', 'Intermediate', 'Advanced'] as const;
const styles = ['Practice-Heavy', 'Reading-Heavy', 'Visual', 'Mixed'] as const;
const resourceTypes: ResourceType[] = [
  'link',
  'course',
  'book',
  'article',
  'documentation',
  'notes',
  'video',
  'other',
];

const emptyResource = (): LearningResourceInput => ({
  title: '',
  type: 'link',
  reference: null,
  notes: null,
});

export function OnboardingPage() {
  const navigate = useNavigate();
  const { t } = usePreferences();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState<(typeof levels)[number]>('Intermediate');
  const [hours, setHours] = useState('10');
  const [targetDate, setTargetDate] = useState('');
  const [preferredStyle, setPreferredStyle] = useState<(typeof styles)[number]>('Practice-Heavy');
  const [resourceMode, setResourceMode] = useState<ResourceMode>('needs_plan');
  const [resources, setResources] = useState<LearningResourceInput[]>([emptyResource()]);

  const totalSteps = 4;

  const activeResources = resources.filter((resource) => resource.title.trim());

  const handleNext = async () => {
    setError(null);

    if (step === 1 && !goal.trim()) {
      setError(t('onboarding.goal'));
      return;
    }

    if (step === 2 && (!hours.trim() || Number(hours) < 1)) {
      setError(t('onboarding.hours'));
      return;
    }

    if (step === 4 && resourceMode === 'has_materials' && activeResources.length === 0) {
      setError(t('onboarding.resourceRequired'));
      return;
    }

    if (step < totalSteps) {
      setStep((currentStep) => currentStep + 1);
      return;
    }

    setIsGenerating(true);

    try {
      await apiFetch<WorkflowCreateResponse>('/api/agent/workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goal,
          level,
          hours: Number.parseInt(hours, 10) || 10,
          targetDate: targetDate || null,
          preferredStyle,
          resourceMode,
          resources: activeResources,
        }),
      });

      navigate('/app', { replace: true });
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof ApiError ? submitError.message : t('onboarding.errorPrefix'));
      setIsGenerating(false);
    }
  };

  const updateResource = (index: number, patch: Partial<LearningResourceInput>) => {
    setResources((current) =>
      current.map((resource, currentIndex) =>
        currentIndex === index
          ? {
              ...resource,
              ...patch,
            }
          : resource,
      ),
    );
  };

  const removeResource = (index: number) => {
    setResources((current) => (current.length === 1 ? [emptyResource()] : current.filter((_, currentIndex) => currentIndex !== index)));
  };

  return (
    <div className="app-shell flex min-h-screen flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-4xl">
        <div className="mb-8 flex items-center justify-between text-sm font-mono uppercase tracking-widest text-[var(--text-muted)]">
          <span>{t('common.stepOf', { step, total: totalSteps })}</span>
          <span className="text-[var(--accent-amber)]">{t('onboarding.setup')}</span>
        </div>

        <Card className="overflow-hidden bg-[var(--bg-panel)] shadow-[var(--shadow-panel)]">
          <div className="grid lg:grid-cols-[0.38fr_0.62fr]">
            <div className="border-b border-[var(--border-color)] bg-[var(--bg-surface)] p-6 md:p-8 lg:border-b-0 lg:border-r">
              <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-[var(--text-muted)]">
                {t('onboarding.northStar')}
              </div>
              <h2 className="mt-4 text-2xl font-mono uppercase tracking-tight text-[var(--text-primary)]">
                {step === 1 && t('onboarding.step1Title')}
                {step === 2 && t('onboarding.step2Title')}
                {step === 3 && t('onboarding.step3Title')}
                {step === 4 && t('onboarding.resourcesTitle')}
              </h2>
              <p className="mt-4 leading-relaxed text-[var(--text-secondary)]">
                {step === 1 && t('onboarding.step1Body')}
                {step === 2 && t('onboarding.step2Body')}
                {step === 3 && t('onboarding.step3Body')}
                {step === 4 && t('onboarding.resourcesBody')}
              </p>
              <div className="mt-8 space-y-3">
                <MiniSignal
                  label={t('onboarding.signalClarity')}
                  value={
                    step === 1
                      ? t('onboarding.signalStep1Clarity')
                      : step === 2
                        ? t('onboarding.signalStep2Clarity')
                        : step === 3
                          ? t('onboarding.signalStep3Clarity')
                          : resourceMode === 'has_materials'
                            ? t('onboarding.resourceMode.has_materials')
                            : t('onboarding.resourceMode.needs_plan')
                  }
                />
                <MiniSignal
                  label={t('onboarding.signalOutcome')}
                  value={
                    step === 1
                      ? t('onboarding.signalStep1Outcome')
                      : step === 2
                        ? t('onboarding.signalStep2Outcome')
                        : step === 3
                          ? t('onboarding.signalStep3Outcome')
                          : resourceMode === 'has_materials'
                            ? `${activeResources.length} ${t('goals.resources', { count: activeResources.length }).replace(`${activeResources.length} `, '')}`
                            : t('onboarding.generate')
                  }
                />
              </div>
            </div>

            <div>
              <CardHeader className="space-y-4 pb-8">
                <CardTitle className="text-2xl font-mono uppercase tracking-tight">
                  {step === 1 && t('onboarding.prompt1Title')}
                  {step === 2 && t('onboarding.prompt2Title')}
                  {step === 3 && t('onboarding.prompt3Title')}
                  {step === 4 && t('onboarding.resourcesTitle')}
                </CardTitle>
                <CardDescription className="text-lg font-serif italic text-[var(--text-secondary)]">
                  {step === 1 && t('onboarding.prompt1Body')}
                  {step === 2 && t('onboarding.prompt2Body')}
                  {step === 3 && t('onboarding.prompt3Body')}
                  {step === 4 && t('onboarding.resourcesBody')}
                </CardDescription>
              </CardHeader>

              <CardContent>
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="goal">{t('onboarding.goal')}</Label>
                      <Input
                        id="goal"
                        value={goal}
                        onChange={(event) => setGoal(event.target.value)}
                        placeholder={t('onboarding.goalPlaceholder')}
                        className="py-6 text-lg"
                        autoFocus
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t('onboarding.level')}</Label>
                      <div className="flex flex-wrap gap-4">
                        {levels.map((option) => (
                          <Button
                            key={option}
                            type="button"
                            variant={level === option ? 'accent' : 'outline'}
                            onClick={() => setLevel(option)}
                            className={cn('px-4 py-2', level === option ? '' : 'hover:bg-[var(--bg-surface)]')}
                          >
                            {t(`option.level.${option}`)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="hours">{t('onboarding.hours')}</Label>
                      <Input
                        id="hours"
                        type="number"
                        min={1}
                        value={hours}
                        onChange={(event) => setHours(event.target.value)}
                        placeholder={t('onboarding.hoursPlaceholder')}
                        className="py-6 text-lg"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deadline">{t('onboarding.deadline')}</Label>
                      <Input
                        id="deadline"
                        type="date"
                        className="py-6 text-lg"
                        value={targetDate}
                        onChange={(event) => setTargetDate(event.target.value)}
                      />
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label>{t('onboarding.style')}</Label>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {styles.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setPreferredStyle(option)}
                            className={cn(
                              'rounded-xl border p-4 text-left transition-colors',
                              preferredStyle === option
                                ? 'border-amber-500/50 bg-[var(--bg-surface)] text-[var(--accent-amber)]'
                                : 'border-[var(--border-color)] hover:bg-[var(--bg-surface)]',
                            )}
                          >
                            <div
                              className={cn(
                                'mb-1 font-mono font-semibold uppercase tracking-tight',
                                preferredStyle === option ? 'text-[var(--accent-amber)]' : 'text-[var(--text-primary)]',
                              )}
                            >
                              {t(`option.style.${option}`)}
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">{t(`onboarding.style.${option}`)}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-6">
                    <div className="grid gap-4">
                      {(['has_materials', 'needs_plan'] as ResourceMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            setResourceMode(mode);
                            setError(null);
                          }}
                          className={cn(
                            'rounded-2xl border p-5 text-left transition-colors',
                            resourceMode === mode
                              ? 'border-amber-500/50 bg-[var(--bg-surface)]'
                              : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-surface)]',
                          )}
                        >
                          <div className="font-mono text-base font-semibold uppercase tracking-tight text-[var(--text-primary)]">
                            {t(`onboarding.resourceMode.${mode}`)}
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                            {t(`onboarding.resourceMode.${mode}.body`)}
                          </p>
                        </button>
                      ))}
                    </div>

                    {resourceMode === 'has_materials' && (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <div className="font-mono text-sm uppercase tracking-wider text-[var(--text-primary)]">
                            {t('onboarding.resourcesSection')}
                          </div>
                          <p className="text-sm text-[var(--text-secondary)]">{t('onboarding.resourcesHint')}</p>
                        </div>

                        <div className="space-y-4">
                          {resources.map((resource, index) => (
                            <div key={index} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                              <div className="mb-4 flex items-center justify-between">
                                <div className="text-xs font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">
                                  {t('onboarding.resourcesSection')} {index + 1}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeResource(index)}
                                  className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] transition-colors hover:text-red-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  {t('onboarding.removeResource')}
                                </button>
                              </div>

                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <Label htmlFor={`resource-title-${index}`}>{t('onboarding.resourceTitle')}</Label>
                                  <Input
                                    id={`resource-title-${index}`}
                                    value={resource.title}
                                    onChange={(event) => updateResource(index, { title: event.target.value })}
                                    placeholder={t('onboarding.resourceTitlePlaceholder')}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`resource-type-${index}`}>{t('onboarding.resourceType')}</Label>
                                  <select
                                    id={`resource-type-${index}`}
                                    className="flex h-10 w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-void)] px-3 py-2 text-sm text-[var(--text-primary)]"
                                    value={resource.type}
                                    onChange={(event) => updateResource(index, { type: event.target.value as ResourceType })}
                                  >
                                    {resourceTypes.map((type) => (
                                      <option key={type} value={type}>
                                        {t(`resourceType.${type}`)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="mt-4 space-y-2">
                                <Label htmlFor={`resource-reference-${index}`}>{t('onboarding.resourceReference')}</Label>
                                <Input
                                  id={`resource-reference-${index}`}
                                  value={resource.reference ?? ''}
                                  onChange={(event) => updateResource(index, { reference: event.target.value || null })}
                                  placeholder={t('onboarding.resourceReferencePlaceholder')}
                                />
                              </div>

                              <div className="mt-4 space-y-2">
                                <Label htmlFor={`resource-notes-${index}`}>{t('onboarding.resourceNotes')}</Label>
                                <textarea
                                  id={`resource-notes-${index}`}
                                  className="app-field h-28"
                                  value={resource.notes ?? ''}
                                  onChange={(event) => updateResource(index, { notes: event.target.value || null })}
                                  placeholder={t('onboarding.resourceNotesPlaceholder')}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                          onClick={() => setResources((current) => [...current, emptyResource()])}
                        >
                          <Plus className="h-4 w-4" />
                          {t('onboarding.addResource')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="mt-6">
                    <InlineStateMessage
                      title={error}
                      body={isGenerating ? t('onboarding.generating') : undefined}
                      tone="danger"
                    />
                  </div>
                )}

                <div className="mt-12 flex items-center justify-between">
                  {step > 1 ? (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setError(null);
                        setStep((currentStep) => currentStep - 1);
                      }}
                      disabled={isGenerating}
                    >
                      {t('common.back')}
                    </Button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-3">
                    {error && step === totalSteps && (
                      <Button type="button" variant="outline" onClick={() => void handleNext()} disabled={isGenerating}>
                        {t('onboarding.retry')}
                      </Button>
                    )}
                    <Button
                      variant="accent"
                      onClick={() => void handleNext()}
                      disabled={isGenerating}
                      className="px-8 font-mono uppercase tracking-wider"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('onboarding.generating')}
                        </>
                      ) : step === totalSteps ? (
                        t('onboarding.generate')
                      ) : (
                        t('common.next')
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function MiniSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-soft)] px-4 py-3">
      <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-2 text-sm text-[var(--text-primary)]">{value}</div>
    </div>
  );
}
