import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { getAuthHeaders } from '../lib/auth';
import { useAppData } from '../hooks/useAppData';

export function ComprehensionPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { data, loading, error } = useAppData();
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
        throw new Error('Failed to save your session.');
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
    return <p className="text-zinc-500">{error ?? 'Task not found.'}</p>;
  }

  return (
    <div className="space-y-8 font-sans max-w-3xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge variant="info" className="mb-3 font-mono tracking-widest uppercase text-[10px]">
            Comprehension Check
          </Badge>
          <h1 className="text-3xl font-mono uppercase tracking-tight font-bold text-zinc-100">
            {task.title}
          </h1>
          <p className="text-zinc-400 font-serif italic mt-2">Lock in the learning before you move on.</p>
        </div>
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800 shadow-2xl">
        <CardHeader className="space-y-4 pb-8 border-b border-zinc-800/50">
          <div className="flex items-center justify-between text-sm text-zinc-500 font-mono uppercase tracking-widest">
            <span>Step {step} of 3</span>
            <span className="text-blue-400">Comprehension Coach</span>
          </div>
          <CardTitle className="text-2xl font-mono uppercase tracking-tight">
            {step === 1 && 'Explain it in your own words.'}
            {step === 2 && 'What still feels shaky?'}
            {step === 3 && 'How confident do you feel?'}
          </CardTitle>
          <CardDescription className="font-serif italic text-zinc-400 text-lg">
            {step === 1 && "Don&apos;t look at your notes. Capture what stuck."}
            {step === 2 && 'Name the exact part you want the next review to reinforce.'}
            {step === 3 && 'This score determines when the review comes back.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          {step === 1 && (
            <div className="space-y-6">
              <textarea
                className="w-full h-48 bg-zinc-950 border border-zinc-800 rounded-md p-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none font-mono text-sm"
                placeholder="The main idea is..."
                value={explanation}
                onChange={(event) => setExplanation(event.target.value)}
                autoFocus
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <textarea
                className="w-full h-40 bg-zinc-950 border border-zinc-800 rounded-md p-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none font-mono text-sm"
                placeholder="Dependency arrays, edge cases, syntax I still need to practice..."
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
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-sm text-zinc-500 font-mono uppercase tracking-widest px-1 sm:px-4">
                <span>Need Review Soon</span>
                <span>Ready To Advance</span>
              </div>

              {confidence && (
                <div className="p-6 rounded-lg bg-zinc-950 border border-zinc-800 mt-8 flex items-start gap-4">
                  <RefreshCw className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
                  <div>
                    <h4 className="font-mono uppercase tracking-tight font-semibold text-zinc-200">Review Scheduled</h4>
                    <p className="text-sm text-zinc-400 mt-1 font-serif italic">
                      {confidence <= 2 && 'We will bring this topic back in 2 days with high priority.'}
                      {confidence === 3 && 'We will revisit this topic in 4 days to reinforce the edge cases.'}
                      {confidence >= 4 && 'We will check back in a week so the concept stays durable.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-12 flex justify-between items-center">
            {step > 1 ? (
              <Button variant="ghost" onClick={() => setStep((currentStep) => currentStep - 1)} disabled={submitting}>
                Back
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
                  Saving
                </>
              ) : (
                <>
                  {step === 3 ? 'Save & Finish' : 'Next'}
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
