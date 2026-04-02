import { Link } from 'react-router-dom';
import { Play, Clock, AlertCircle, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { useAppData } from '../hooks/useAppData';

export function DashboardPage() {
  const { data, loading, error } = useAppData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-mono uppercase tracking-tight font-bold text-zinc-100">Today</h1>
        <p className="text-zinc-500">{error ?? 'Sign in to view your learning workspace.'}</p>
      </div>
    );
  }

  const activeGoal = data.goals[0];
  const tasks = activeGoal ? data.tasks.filter((task) => task.goal_id === activeGoal.id) : [];
  const nextTask = tasks.find((task) => task.status !== 'completed') ?? null;
  const nextEvent = nextTask ? data.events.find((event) => event.task_id === nextTask.id) ?? null : null;
  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const progress = tasks.length ? (completedTasks / tasks.length) * 100 : 0;
  const completedSessions = data.sessions.filter((session) => session.completed_at);
  const studyMinutes = Math.round(
    completedSessions.reduce((sum, session) => sum + session.duration_seconds, 0) / 60,
  );
  const avgConfidence = completedSessions.length
    ? Math.round(
        (completedSessions.reduce((sum, session) => sum + (session.confidence ?? 0), 0) /
          completedSessions.length) *
          20,
      )
    : 0;

  if (!activeGoal) {
    return (
      <div className="space-y-8 font-sans">
        <div>
          <h1 className="text-3xl font-mono uppercase tracking-tight font-bold text-zinc-100">
            Welcome, {data.user.name}.
          </h1>
          <p className="text-zinc-400 font-serif italic mt-2">
            Start with one clear goal and we&apos;ll turn it into a study roadmap.
          </p>
        </div>
        <Card className="bg-zinc-900/30 border-zinc-800">
          <CardContent className="py-10 flex flex-col items-start gap-4">
            <p className="text-zinc-400 max-w-xl">
              There&apos;s no active roadmap yet. Create a goal to unlock scheduled tasks, reviews,
              and progress tracking.
            </p>
            <Link to="/onboarding">
              <Button variant="accent" className="font-mono uppercase tracking-wider">
                Create Your First Goal
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-mono uppercase tracking-tight font-bold text-zinc-100">
            Welcome back, {data.user.name}.
          </h1>
          <p className="text-zinc-400 font-serif italic mt-2">
            Complexity is contained. Your next step is ready.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-zinc-900/50 px-4 py-2 rounded-lg border border-zinc-800">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-zinc-300">{activeGoal.title}</span>
          <Badge variant="outline" className="ml-2 bg-zinc-800">
            {activeGoal.status}
          </Badge>
        </div>
      </div>

      <Card className="border-amber-500/20 bg-gradient-to-br from-zinc-900 to-zinc-950 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start gap-4">
            <div>
              <Badge variant="warning" className="mb-3 font-mono tracking-widest uppercase text-[10px]">
                Today&apos;s Session
              </Badge>
              <CardTitle className="text-2xl text-zinc-100">
                {nextTask?.title ?? 'You are caught up'}
              </CardTitle>
              <CardDescription className="mt-2 text-zinc-400 max-w-xl">
                {nextTask?.description ?? 'Every task in your current roadmap is complete.'}
              </CardDescription>
            </div>
            {nextEvent && (
              <div className="flex items-center gap-2 text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-md border border-zinc-800">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">{nextEvent.duration} min</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mt-4">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <AlertCircle className="w-4 h-4 text-blue-400" />
              <span>
                Recommended because it supports your active goal and protects your mental bandwidth:{' '}
                <strong className="text-zinc-300 font-medium">{activeGoal.title}</strong>
              </span>
            </div>
            {nextTask ? (
              <Link to={`/app/session/${nextTask.id}`} className="w-full sm:w-auto">
                <Button variant="accent" size="lg" className="w-full sm:w-auto font-mono uppercase tracking-wider gap-2">
                  <Play className="w-4 h-4 fill-current" />
                  Start Session
                </Button>
              </Link>
            ) : (
              <Link to="/app/roadmap" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto font-mono uppercase tracking-wider">
                  Review Roadmap
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-zinc-900/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Current Roadmap</CardTitle>
            <Link to="/app/roadmap" className="text-sm text-amber-500 hover:text-amber-400 flex items-center gap-1 font-medium transition-colors">
              View Roadmap <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-end mb-2">
                <span className="font-medium text-zinc-200">{activeGoal.title}</span>
                <span className="text-sm text-zinc-500">
                  {completedTasks} of {tasks.length} tasks
                </span>
              </div>
              <Progress value={progress} indicatorClassName="bg-blue-500" />

              <div className="mt-6 space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-md bg-zinc-900/50 border border-zinc-800/50">
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : task.status === 'in_progress' ? (
                      <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">{task.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-zinc-900/30 border-red-900/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">Agent Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {data.notes.length > 0 ? (
                <div className="space-y-3">
                  {data.notes.slice(0, 3).map((note) => (
                    <div key={note.id} className="flex flex-col gap-1 p-3 rounded-md bg-zinc-900/50 border border-zinc-800/50">
                      <span className="text-sm text-zinc-300 font-medium">{note.topic}</span>
                      <span className="text-xs text-zinc-500 whitespace-pre-line">{note.content}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No notes generated yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Study Time (Total)</span>
                  <span className="font-mono text-zinc-200">{studyMinutes} min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Tasks Completed</span>
                  <span className="font-mono text-zinc-200">{completedTasks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Avg. Confidence</span>
                  <span className="font-mono text-green-400">{avgConfidence}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
