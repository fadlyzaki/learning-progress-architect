import { Activity, Clock, Target, CheckCircle2, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { useAppData } from '../hooks/useAppData';

function calculateStreak(sessionDates: string[]) {
  const uniqueDates = [...new Set(sessionDates.map((value) => value.slice(0, 10)))].sort().reverse();
  if (uniqueDates.length === 0) {
    return 0;
  }

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (const dateString of uniqueDates) {
    const currentDate = cursor.toISOString().slice(0, 10);
    if (dateString === currentDate) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    if (streak === 0) {
      cursor.setDate(cursor.getDate() - 1);
      if (dateString === cursor.toISOString().slice(0, 10)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
    }

    break;
  }

  return streak;
}

export function ProgressPage() {
  const { data, loading, error } = useAppData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-zinc-500">{error ?? 'Unable to load progress.'}</p>;
  }

  const activeGoal = data.goals[0] ?? null;
  const completedSessions = data.sessions.filter((session) => session.completed_at);
  const totalStudyMinutes = Math.round(
    completedSessions.reduce((sum, session) => sum + session.duration_seconds, 0) / 60,
  );
  const completedTasks = data.tasks.filter((task) => task.status === 'completed');
  const streak = calculateStreak(
    completedSessions
      .map((session) => session.completed_at)
      .filter((value): value is string => Boolean(value)),
  );
  const averageConfidence = completedSessions.length
    ? Math.round(
        (completedSessions.reduce((sum, session) => sum + (session.confidence ?? 0), 0) /
          completedSessions.length) *
          20,
      )
    : 0;
  const recentSessions = completedSessions.slice(0, 5);

  return (
    <div className="space-y-8 font-sans">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-mono uppercase tracking-tight font-bold text-zinc-100">
            Progress
          </h1>
          <p className="text-zinc-400 font-serif italic mt-2">
            Your learning journey, based on completed sessions and real task progress.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card className="bg-zinc-900/30 border-zinc-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-zinc-500">Total Study Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-bold text-zinc-100">{totalStudyMinutes}m</div>
            <div className="text-sm text-green-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Built from completed sessions
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/30 border-zinc-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-zinc-500">Tasks Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-bold text-zinc-100">{completedTasks.length}</div>
            <div className="text-sm text-zinc-400 mt-1">Across {data.goals.length} goals</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/30 border-zinc-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-zinc-500">Current Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-bold text-amber-500">{streak} Days</div>
            <div className="text-sm text-zinc-400 mt-1">Counted from completion history</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/30 border-zinc-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-zinc-500">Avg Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-mono font-bold text-blue-400">{averageConfidence}%</div>
            <div className="text-sm text-zinc-400 mt-1">Derived from comprehension checks</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-zinc-900/30 border-zinc-800/50">
          <CardHeader>
            <CardTitle className="text-xl">Active Goal Progress</CardTitle>
            <CardDescription>{activeGoal?.title ?? 'No active goal yet'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {activeGoal ? (
              <>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-400">Overall Completion</span>
                    <span className="font-mono text-zinc-200">
                      {Math.round(
                        ((data.tasks.filter((task) => task.goal_id === activeGoal.id && task.status === 'completed').length /
                          Math.max(data.tasks.filter((task) => task.goal_id === activeGoal.id).length, 1)) *
                          100),
                      )}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      (data.tasks.filter((task) => task.goal_id === activeGoal.id && task.status === 'completed').length /
                        Math.max(data.tasks.filter((task) => task.goal_id === activeGoal.id).length, 1)) *
                      100
                    }
                    indicatorClassName="bg-amber-500"
                  />
                </div>

                <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                  <h4 className="font-mono uppercase tracking-widest text-xs text-zinc-500">Task Status</h4>
                  <div className="space-y-3">
                    {data.tasks
                      .filter((task) => task.goal_id === activeGoal.id)
                      .map((task) => (
                        <div key={task.id} className="flex items-center gap-3">
                          {task.status === 'completed' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <Activity className="w-4 h-4 text-amber-500" />
                          )}
                          <span className="text-sm text-zinc-300 flex-1">{task.title}</span>
                          <Badge
                            variant={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'warning' : 'secondary'}
                            className="text-[10px]"
                          >
                            {task.status}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-zinc-500">Complete onboarding to unlock tracked progress.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/30 border-zinc-800/50">
          <CardHeader>
            <CardTitle className="text-xl">Recent Activity</CardTitle>
            <CardDescription>Your latest completed study sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-800 before:to-transparent">
              {recentSessions.length > 0 ? (
                recentSessions.map((session) => {
                  const task = data.tasks.find((item) => item.id === session.task_id);
                  return (
                    <div key={session.id} className="relative flex items-center justify-between group">
                      <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-zinc-950 bg-amber-500 shadow shrink-0 z-10" />
                      <div className="w-[calc(100%-2rem)] p-4 rounded-lg bg-zinc-950 border border-zinc-800/50">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider border-zinc-700 text-zinc-400">
                            session
                          </Badge>
                          <span className="text-xs text-zinc-500 font-mono">
                            {session.completed_at ? new Date(session.completed_at).toLocaleDateString() : 'Today'}
                          </span>
                        </div>
                        <h4 className="text-sm font-medium text-zinc-200">{task?.title ?? 'Task'}</h4>
                        <div className="flex items-center gap-2 mt-2 text-xs text-zinc-400">
                          <Clock className="w-3 h-3" /> {Math.round(session.duration_seconds / 60)} min
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-zinc-500">Complete your first session to see activity here.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
