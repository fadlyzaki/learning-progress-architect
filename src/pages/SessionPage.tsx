import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Play, Pause, CheckCircle2, HelpCircle, Lightbulb, MessageSquare, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { getAuthHeaders } from '../lib/auth';
import { useAppData } from '../hooks/useAppData';

export function SessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useAppData();
  const taskId = Number(id);
  const task = data?.tasks.find((item) => item.id === taskId) ?? null;
  const goal = task ? data?.goals.find((item) => item.id === task.goal_id) ?? null : null;
  const existingSession = task
    ? data?.sessions.find((session) => session.task_id === task.id && session.completed_at === null) ??
      data?.sessions.find((session) => session.task_id === task.id) ??
      null
    : null;
  const [isActive, setIsActive] = useState(false);
  const [time, setTime] = useState(existingSession?.duration_seconds ?? 0);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    setTime(existingSession?.duration_seconds ?? 0);
  }, [existingSession?.duration_seconds]);

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

  const handleToggle = async () => {
    if (!task || isActive) {
      setIsActive((current) => !current);
      return;
    }

    setStarting(true);

    try {
      const response = await fetch(`/api/tasks/${task.id}/start`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to start the session.');
      }

      setIsActive(true);
    } catch (startError) {
      console.error(startError);
    } finally {
      setStarting(false);
    }
  };

  const handleComplete = () => {
    if (!task) {
      return;
    }

    navigate(`/app/comprehension/${task.id}`, {
      state: {
        durationSeconds: time,
      },
    });
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
    <div className="space-y-8 font-sans max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge variant="warning" className="mb-3 font-mono tracking-widest uppercase text-[10px]">
            Active Session
          </Badge>
          <h1 className="text-3xl font-mono uppercase tracking-tight font-bold text-zinc-100">
            {task.title}
          </h1>
          <p className="text-zinc-400 font-serif italic mt-2">{task.description}</p>
          {goal && <p className="text-xs text-zinc-500 mt-3 uppercase tracking-widest font-mono">Goal: {goal.title}</p>}
        </div>
        <div className="flex items-center gap-4 bg-zinc-900/50 px-6 py-3 rounded-lg border border-zinc-800">
          <div className="font-mono text-2xl font-bold text-amber-500 tracking-widest">
            {formatTime(time)}
          </div>
          <Button
            variant={isActive ? 'outline' : 'accent'}
            size="icon"
            onClick={() => void handleToggle()}
            disabled={starting}
          >
            {starting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isActive ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 fill-current" />
            )}
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-zinc-900/30 border-zinc-800/50">
            <CardHeader>
              <CardTitle className="text-xl">Learning Objectives</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-zinc-300 list-disc list-inside">
                <li>Understand why this topic matters inside your active roadmap.</li>
                <li>Translate the concept into one concrete example you can explain.</li>
                <li>Leave the session with a reusable mental model, not just notes.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/30 border-zinc-800/50">
            <CardHeader>
              <CardTitle className="text-xl">Notes & Reflection</CardTitle>
              <CardDescription>
                Use the comprehension step at the end to save the reflection to your session log.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full h-48 bg-zinc-950 border border-zinc-800 rounded-md p-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none font-mono text-sm"
                placeholder="Capture key takeaways, examples, or questions as you work."
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-zinc-900/30 border-zinc-800/50">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-3 text-zinc-300 hover:text-zinc-100">
                <Lightbulb className="w-4 h-4 text-amber-400" /> Explain Simply
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 text-zinc-300 hover:text-zinc-100">
                <HelpCircle className="w-4 h-4 text-blue-400" /> Give an Example
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 text-zinc-300 hover:text-zinc-100">
                <MessageSquare className="w-4 h-4 text-green-400" /> Use an Analogy
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 text-zinc-300 hover:text-zinc-100 border-red-900/30 hover:bg-red-900/20">
                <AlertTriangle className="w-4 h-4 text-red-400" /> I&apos;m Confused
              </Button>
            </CardContent>
          </Card>

          <Button
            variant="accent"
            size="lg"
            className="w-full font-mono uppercase tracking-wider gap-2 py-6 text-lg"
            onClick={handleComplete}
          >
            <CheckCircle2 className="w-5 h-5" />
            Complete Session
          </Button>
        </div>
      </div>
    </div>
  );
}
