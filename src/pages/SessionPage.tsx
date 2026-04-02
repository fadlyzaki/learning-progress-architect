import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Play, Pause, CheckCircle2, HelpCircle, Lightbulb, MessageSquare, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { getAuthHeaders } from '../lib/auth';
import { useAppData } from '../hooks/useAppData';
import { usePreferences } from '../lib/preferences';

export function SessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useAppData();
  const { t } = usePreferences();
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
        throw new Error(t('session.startFailed'));
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
    return <p className="text-[var(--text-muted)]">{error ?? t('session.notFound')}</p>;
  }

  return (
    <div className="space-y-8 font-sans max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge variant="warning" className="mb-3 font-mono tracking-widest uppercase text-[10px]">
            {t('session.badge')}
          </Badge>
          <h1 className="text-3xl font-mono font-bold uppercase tracking-tight text-[var(--text-primary)]">
            {task.title}
          </h1>
          <p className="mt-2 font-serif italic text-[var(--text-secondary)]">{task.description}</p>
          {goal && <p className="mt-3 text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">{t('common.goalLabel', { goal: goal.title })}</p>}
        </div>
        <div className="flex items-center gap-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-6 py-3">
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
          <Card className="bg-[var(--bg-soft)]">
            <CardHeader>
              <CardTitle className="text-xl">{t('session.objectives')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-inside list-disc space-y-3 text-[var(--text-primary)]">
                <li>{t('session.objective1')}</li>
                <li>{t('session.objective2')}</li>
                <li>{t('session.objective3')}</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-soft)]">
            <CardHeader>
              <CardTitle className="text-xl">{t('session.notes')}</CardTitle>
              <CardDescription>{t('session.notesBody')}</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                className="app-field h-48"
                placeholder={t('session.notesPlaceholder')}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-[var(--bg-soft)]">
            <CardHeader>
              <CardTitle className="text-lg">{t('session.quickActions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-3">
                <Lightbulb className="w-4 h-4 text-amber-400" /> {t('session.actionExplain')}
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3">
                <HelpCircle className="w-4 h-4 text-blue-400" /> {t('session.actionExample')}
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3">
                <MessageSquare className="w-4 h-4 text-green-400" /> {t('session.actionAnalogy')}
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 border-red-900/30 hover:bg-red-900/20">
                <AlertTriangle className="w-4 h-4 text-red-400" /> {t('session.actionConfused')}
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
            {t('session.complete')}
          </Button>
        </div>
      </div>
    </div>
  );
}
