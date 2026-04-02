import { Link } from 'react-router-dom';
import { Plus, Target, Clock, Activity, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { useAppData } from '../hooks/useAppData';

export function GoalsPage() {
  const { data, loading, error } = useAppData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-zinc-500">{error ?? 'Unable to load goals.'}</p>;
  }

  return (
    <div className="space-y-8 font-sans">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-mono uppercase tracking-tight font-bold text-zinc-100">
            Learning Goals
          </h1>
          <p className="text-zinc-400 font-serif italic mt-2">
            Your private learning objectives and their current progress.
          </p>
        </div>
        <Link to="/onboarding">
          <Button variant="accent" className="font-mono uppercase tracking-wider gap-2">
            <Plus className="w-4 h-4" />
            New Goal
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {data.goals.map((goal) => {
          const tasks = data.tasks.filter((task) => task.goal_id === goal.id);
          const completedTasks = tasks.filter((task) => task.status === 'completed').length;
          const progressPercentage = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

          return (
            <Card key={goal.id} className="bg-zinc-900/30 border-amber-500/20">
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <Badge variant={goal.status === 'completed' ? 'success' : 'warning'} className="mb-3 font-mono tracking-widest uppercase text-[10px]">
                      {goal.status}
                    </Badge>
                    <CardTitle className="text-xl text-zinc-100">{goal.title}</CardTitle>
                    <CardDescription className="mt-1 text-zinc-400">
                      {goal.level} {goal.target_date ? `· Target ${goal.target_date}` : ''}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-mono font-bold text-zinc-200">{progressPercentage}%</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={progressPercentage} indicatorClassName="bg-amber-500" />

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Target className="w-4 h-4 text-blue-400" />
                    <span>{tasks.length} Tasks</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>{goal.hours}h / week</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Activity className="w-4 h-4 text-green-400" />
                    <span>{completedTasks} completed</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <span className="font-mono text-xs uppercase">
                      Style: {goal.preferred_style ?? 'Mixed'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <Link to="/app/roadmap" className="flex-1">
                    <Button variant="outline" className="w-full">
                      View Roadmap
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {data.goals.length === 0 && (
          <div className="col-span-2 text-center py-12">
            <p className="text-zinc-500 mb-4">You haven&apos;t set any goals yet.</p>
            <Link to="/onboarding">
              <Button variant="outline">Create your first goal</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
