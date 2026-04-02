import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { getAuthHeaders } from '../lib/auth';
import { cn } from '../lib/utils';

const levels = ['Beginner', 'Intermediate', 'Advanced'] as const;
const styles = ['Practice-Heavy', 'Reading-Heavy', 'Visual', 'Mixed'] as const;

export function OnboardingPage() {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 font-sans text-zinc-100">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex items-center justify-between text-sm text-zinc-500 font-mono uppercase tracking-widest">
          <span>Step {step} of 3</span>
          <span className="text-amber-500">Goal Architect</span>
        </div>

        <Card className="bg-zinc-900/80 border-zinc-800 shadow-2xl">
          <CardHeader className="space-y-4 pb-8">
            <CardTitle className="text-2xl font-mono uppercase tracking-tight">
              {step === 1 && 'What are you trying to learn?'}
              {step === 2 && 'How much time do you have?'}
              {step === 3 && 'How do you learn best?'}
            </CardTitle>
            <CardDescription className="font-serif italic text-zinc-400 text-lg">
              {step === 1 && "Be specific. We'll break it down for you."}
              {step === 2 && 'Be realistic. Consistency beats intensity.'}
              {step === 3 && "We'll tailor your sessions to your style."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="goal">Learning Goal</Label>
                  <Input
                    id="goal"
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                    placeholder="e.g., Master React & Next.js"
                    className="text-lg py-6"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Level</Label>
                  <div className="flex flex-wrap gap-4">
                    {levels.map((option) => (
                      <Button
                        key={option}
                        type="button"
                        variant={level === option ? 'accent' : 'outline'}
                        onClick={() => setLevel(option)}
                        className={cn(
                          'px-4 py-2',
                          level === option ? 'text-zinc-950' : 'text-zinc-300 hover:bg-zinc-800',
                        )}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="hours">Weekly Hours Available</Label>
                  <Input
                    id="hours"
                    type="number"
                    min={1}
                    value={hours}
                    onChange={(event) => setHours(event.target.value)}
                    placeholder="10"
                    className="text-lg py-6"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Target Date (Optional)</Label>
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
                  <Label>Preferred Style</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {styles.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setPreferredStyle(option)}
                        className={cn(
                          'p-4 rounded-lg border text-left transition-colors',
                          preferredStyle === option
                            ? 'border-amber-500/50 bg-zinc-800 text-amber-500'
                            : 'border-zinc-800 hover:bg-zinc-800 cursor-pointer',
                        )}
                      >
                        <div className={cn(
                          'font-mono uppercase tracking-tight font-semibold mb-1',
                          preferredStyle === option ? 'text-amber-500' : 'text-zinc-300',
                        )}>
                          {option}
                        </div>
                        <div className="text-xs text-zinc-500 font-sans">
                          {option === 'Practice-Heavy' && 'Learn by doing and building.'}
                          {option === 'Reading-Heavy' && 'Deep dives into documentation.'}
                          {option === 'Visual' && 'Diagrams and visual explanations.'}
                          {option === 'Mixed' && 'A balanced blend of study modes.'}
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
                  Back
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
                    Generating Plan...
                  </>
                ) : step === 3 ? (
                  'Generate Roadmap'
                ) : (
                  'Next'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
