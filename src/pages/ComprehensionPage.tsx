import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { getAuthHeaders } from '../lib/auth';
import { useAppData } from '../hooks/useAppData';
import { usePreferences } from '../lib/preferences';

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

  const durationSeconds = typeof location.state === 'object' && location.state && 'durationSeconds' in location.state
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

    try {
      const response = await fetch(`/api/tasks/${task.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          reflection: explanation,
          confusion: blockers,
          confidence,
          durationSeconds,
        }),
      });

      if (!response.ok) {
        throw new Error(t('comprehension.saveFailed'));
      }

      navigate('/app', { replace: true });
    } catch (submitError) {
      console.error(submitError);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!data || !task) {
    return <p className="text-[var(--text-muted)]">{error ?? t('session.notFound')}</p>;
  }

  return (
    <div className="space-y-8 font-sans max-w-3xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge variant="info" className="mb-3 font-mono tracking-widest uppercase text-[10px]">
            {t('comprehension.badge')}
          </Badge>
          <h1 className="text-3xl font-mono font-bold uppercase tracking-tight text-[var(--text-primary)]">
            {task.title}
          </h1>
          <p className="mt-2 font-serif italic text-[var(--text-secondary)]">{t('comprehension.subtitle')}</p>
        </div>
      </div>

      <Card className="bg-[var(--bg-panel)] shadow-[var(--shadow-panel)]">
        <CardHeader className="space-y-4 border-b border-[var(--border-color)] pb-8">
          <div className="flex items-center justify-between text-sm font-mono uppercase tracking-widest text-[var(--text-muted)]">
            <span>{t('common.stepOf', { step, total: 3 })}</span>
            <span className="text-blue-400">{t('comprehension.coach')}</span>
          </div>
          <CardTitle className="text-2xl font-mono uppercase tracking-tight">
            {step === 1 && t('comprehension.step1Title')}
            {step === 2 && t('comprehension.step2Title')}
            {step === 3 && t('comprehension.step3Title')}
          </CardTitle>
          <CardDescription className="text-lg font-serif italic text-[var(--text-secondary)]">
            {step === 1 && t('comprehension.step1Body')}
            {step === 2 && t('comprehension.step2Body')}
            {step === 3 && t('comprehension.step3Body')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          {step === 1 && (
            <div className="space-y-6">
              <textarea
                className="app-field h-48"
                placeholder={t('comprehension.step1Placeholder')}
                value={explanation}
                onChange={(event) => setExplanation(event.target.value)}
                autoFocus
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <textarea
                className="app-field h-40"
                placeholder={t('comprehension.step2Placeholder')}
                value={blockers}
                onChange={(event) => setBlockers(event.target.value)}
                autoFocus
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <div className="flex justify-between items-center px-1 sm:px-4 gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setConfidence(level)}
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-xl font-mono font-bold transition-all ${
                      confidence === level
                        ? 'bg-amber-500 text-zinc-950 scale-110 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                        : 'border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <div className="flex justify-between px-1 text-sm font-mono uppercase tracking-widest text-[var(--text-muted)] sm:px-4">
                <span>{t('comprehension.lowConfidence')}</span>
                <span>{t('comprehension.highConfidence')}</span>
              </div>

              {confidence && (
                <div className="mt-8 flex items-start gap-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-void)] p-6">
                  <RefreshCw className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
                  <div>
                    <h4 className="font-mono font-semibold uppercase tracking-tight text-[var(--text-primary)]">{t('comprehension.reviewScheduled')}</h4>
                    <p className="mt-1 text-sm font-serif italic text-[var(--text-secondary)]">
                      {confidence <= 2 && t('comprehension.reviewLow')}
                      {confidence === 3 && t('comprehension.reviewMid')}
                      {confidence >= 4 && t('comprehension.reviewHigh')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-12 flex justify-between items-center">
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
              className="font-mono uppercase tracking-wider px-8 gap-2"
              disabled={(step === 1 && !explanation.trim()) || (step === 3 && !confidence) || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                <>
                  {step === 3 ? t('comprehension.saveFinish') : t('common.next')}
                  {step < 3 && <ChevronRight className="w-4 h-4" />}
                  {step === 3 && <CheckCircle2 className="w-4 h-4" />}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
