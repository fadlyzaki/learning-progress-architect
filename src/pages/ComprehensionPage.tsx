import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PageLoadingState, PageMessageState } from '../components/PageStates';
import { useAppData } from '../hooks/useAppData';
import { usePreferences } from '../lib/preferences';
import { ApiError, apiFetch } from '../lib/api';

export function ComprehensionPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { data, loading, error } = useAppData();
  const { t } = usePreferences();
  const taskId = Number(id);
  const task = data?.tasks.find((item) => item.id === taskId) ?? null;
  const [step, setStep] = useState(1);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [explanation, setExplanation] = useState('');
  const [blockers, setBlockers] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const durationSeconds =
    typeof location.state === 'object' && location.state && 'durationSeconds' in location.state
      ? Number(location.state.durationSeconds) || 0
      : 0;

  const handleNext = async () => {
    if (step < 3) {
      setStep((currentStep) => currentStep + 1);
      return;
    }

    if (!task) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await apiFetch(`/api/tasks/${task.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reflection: explanation,
          confusion: blockers,
          confidence,
          durationSeconds,
        }),
      });

      navigate('/app', { replace: true });
    } catch (submitError) {
      console.error(submitError);
      setErrorMessage(submitError instanceof ApiError ? submitError.message : t('comprehension.saveFailed'));
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoadingState rows={1} />;
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

  return (
    <div className="mx-auto max-w-4xl space-y-8 font-sans">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge variant="info">{t('comprehension.badge')}</Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
            {task.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">
            {t('comprehension.subtitle')}
          </p>
        </div>

        <Card className="app-card-muted min-w-[16rem]">
          <CardHeader className="pb-4">
            <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
              {t('comprehension.coach')}
            </div>
            <CardTitle className="text-xl text-[var(--text-primary)]">{t('common.stepOf', { step, total: 3 })}</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {durationSeconds > 0 ? t('common.minutesLong', { count: Math.max(1, Math.round(durationSeconds / 60)) }) : t('session.completeHint')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card className="app-card-primary">
        <CardHeader className="space-y-5 border-b border-[var(--border-color)] pb-8">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((value) => (
              <div key={value}>
                <Badge variant={value === step ? 'info' : 'outline'}>
                  {t('common.stepOf', { step: value, total: 3 })}
                </Badge>
              </div>
            ))}
          </div>
          <div>
            <CardTitle className="text-3xl text-[var(--text-primary)]">
              {step === 1 && t('comprehension.step1Title')}
              {step === 2 && t('comprehension.step2Title')}
              {step === 3 && t('comprehension.step3Title')}
            </CardTitle>
            <CardDescription className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">
              {step === 1 && t('comprehension.step1Body')}
              {step === 2 && t('comprehension.step2Body')}
              {step === 3 && t('comprehension.step3Body')}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 pt-8">
          {errorMessage && (
            <PageMessageState
              title={t('comprehension.saveFailed')}
              body={errorMessage}
              actionLabel={t('comprehension.retrySave')}
              onAction={() => void handleNext()}
              tone="danger"
            />
          )}

          <Card className="app-card-muted">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-[var(--text-primary)]">{t('comprehension.saveSummary')}</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {t('comprehension.saveSummaryBody')}
              </CardDescription>
            </CardHeader>
          </Card>

          {step === 1 && (
            <textarea
              className="app-field h-52"
              placeholder={t('comprehension.step1Placeholder')}
              value={explanation}
              onChange={(event) => setExplanation(event.target.value)}
              autoFocus
            />
          )}

          {step === 2 && (
            <textarea
              className="app-field h-44"
              placeholder={t('comprehension.step2Placeholder')}
              value={blockers}
              onChange={(event) => setBlockers(event.target.value)}
              autoFocus
            />
          )}

          {step === 3 && (
            <div className="space-y-8">
              <div className="flex flex-wrap justify-between gap-3">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setConfidence(level)}
                    className={`flex h-16 min-w-[4.25rem] flex-1 items-center justify-center rounded-full border text-xl font-semibold transition-all ${
                      confidence === level
                        ? 'border-transparent bg-[var(--accent-amber)] text-[var(--accent-ink)] shadow-[0_0_20px_var(--glow-amber)]'
                        : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <div className="flex justify-between gap-3 text-sm text-[var(--text-muted)]">
                <span>{t('comprehension.lowConfidence')}</span>
                <span>{t('comprehension.highConfidence')}</span>
              </div>

              {confidence && (
                <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]/82 p-5">
                  <div className="flex items-start gap-4">
                    <RefreshCw className="mt-1 h-5 w-5 shrink-0 text-[var(--accent-amber)]" />
                    <div>
                      <h4 className="text-lg font-medium text-[var(--text-primary)]">{t('comprehension.reviewScheduled')}</h4>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                        {confidence <= 2 && t('comprehension.reviewLow')}
                        {confidence === 3 && t('comprehension.reviewMid')}
                        {confidence >= 4 && t('comprehension.reviewHigh')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            {step > 1 ? (
              <Button variant="ghost" onClick={() => setStep((currentStep) => currentStep - 1)} disabled={submitting}>
                {t('common.back')}
              </Button>
            ) : (
              <div />
            )}

            <Button
              variant="accent"
              onClick={() => void handleNext()}
              className="gap-2 px-8"
              disabled={(step === 1 && !explanation.trim()) || (step === 3 && !confidence) || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                <>
                  {step === 3 ? t('comprehension.saveFinish') : t('common.next')}
                  {step < 3 && <ChevronRight className="h-4 w-4" />}
                  {step === 3 && <CheckCircle2 className="h-4 w-4" />}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
