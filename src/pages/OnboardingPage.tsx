import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { getAuthHeaders } from '../lib/auth';
import { cn } from '../lib/utils';
import { usePreferences } from '../lib/preferences';

const levels = ['Beginner', 'Intermediate', 'Advanced'] as const;
const styles = ['Practice-Heavy', 'Reading-Heavy', 'Visual', 'Mixed'] as const;

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

  const handleNext = async () => {
    if (step < 3) {
      setStep((currentStep) => currentStep + 1);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/agent/workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          goal,
          level,
          hours: Number.parseInt(hours, 10) || 10,
          targetDate: targetDate || null,
          preferredStyle,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to generate roadmap.');
      }

      navigate('/app', { replace: true });
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : 'Failed to generate roadmap.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="app-shell flex min-h-screen flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-3xl">
        <div className="mb-8 flex items-center justify-between text-sm font-mono uppercase tracking-widest text-[var(--text-muted)]">
          <span>{t('common.stepOf', { step, total: 3 })}</span>
          <span className="text-[var(--accent-amber)]">{t('onboarding.setup')}</span>
        </div>

        <Card className="overflow-hidden bg-[var(--bg-panel)] shadow-[var(--shadow-panel)]">
          <div className="grid lg:grid-cols-[0.42fr_0.58fr]">
            <div className="border-b border-[var(--border-color)] bg-[var(--bg-surface)] p-6 md:p-8 lg:border-b-0 lg:border-r">
              <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-[var(--text-muted)]">
                {t('onboarding.northStar')}
              </div>
              <h2 className="mt-4 text-2xl font-mono uppercase tracking-tight text-[var(--text-primary)]">
                {step === 1 && t('onboarding.step1Title')}
                {step === 2 && t('onboarding.step2Title')}
                {step === 3 && t('onboarding.step3Title')}
              </h2>
              <p className="mt-4 leading-relaxed text-[var(--text-secondary)]">
                {step === 1 && t('onboarding.step1Body')}
                {step === 2 && t('onboarding.step2Body')}
                {step === 3 && t('onboarding.step3Body')}
              </p>
              <div className="mt-8 space-y-3">
                <MiniSignal
                  label={t('onboarding.signalClarity')}
                  value={
                    step === 1
                      ? t('onboarding.signalStep1Clarity')
                      : step === 2
                        ? t('onboarding.signalStep2Clarity')
                        : t('onboarding.signalStep3Clarity')
                  }
                />
                <MiniSignal
                  label={t('onboarding.signalOutcome')}
                  value={
                    step === 1
                      ? t('onboarding.signalStep1Outcome')
                      : step === 2
                        ? t('onboarding.signalStep2Outcome')
                        : t('onboarding.signalStep3Outcome')
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
                </CardTitle>
                <CardDescription className="text-lg font-serif italic text-[var(--text-secondary)]">
                  {step === 1 && t('onboarding.prompt1Body')}
                  {step === 2 && t('onboarding.prompt2Body')}
                  {step === 3 && t('onboarding.prompt3Body')}
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
                        className="text-lg py-6"
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
                            className={cn(
                              'px-4 py-2',
                              level === option ? '' : 'hover:bg-[var(--bg-surface)]',
                            )}
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
                        className="text-lg py-6"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deadline">{t('onboarding.deadline')}</Label>
                      <Input
                        id="deadline"
                        type="date"
                        className="text-lg py-6"
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {styles.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setPreferredStyle(option)}
                            className={cn(
                              'p-4 rounded-xl border text-left transition-colors',
                              preferredStyle === option
                                ? 'border-amber-500/50 bg-[var(--bg-surface)] text-[var(--accent-amber)]'
                                : 'border-[var(--border-color)] hover:bg-[var(--bg-surface)] cursor-pointer',
                            )}
                          >
                            <div
                              className={cn(
                                'font-mono uppercase tracking-tight font-semibold mb-1',
                                preferredStyle === option ? 'text-[var(--accent-amber)]' : 'text-[var(--text-primary)]',
                              )}
                            >
                              {t(`option.style.${option}`)}
                            </div>
                            <div className="font-sans text-xs text-[var(--text-muted)]">
                              {t(`onboarding.style.${option}`)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mt-6 rounded-md border border-red-900/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <div className="mt-12 flex justify-between items-center">
                  {step > 1 ? (
                    <Button
                      variant="ghost"
                      onClick={() => setStep((currentStep) => currentStep - 1)}
                      disabled={isGenerating}
                    >
                      {t('common.back')}
                    </Button>
                  ) : (
                    <div />
                  )}
                  <Button
                    variant="accent"
                    onClick={handleNext}
                    disabled={isGenerating || (step === 1 && !goal.trim())}
                    className="font-mono uppercase tracking-wider px-8"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('onboarding.generating')}
                      </>
                    ) : step === 3 ? (
                      t('onboarding.generate')
                    ) : (
                      t('common.next')
                    )}
                  </Button>
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
