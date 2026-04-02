import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Play, ChevronDown, ChevronRight, Activity, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { useAppData } from '../hooks/useAppData';

export function RoadmapPage() {
  const { data, loading, error } = useAppData();
  const [isExpanded, setIsExpanded] = useState(true);

  const activeGoal = data?.goals[0] ?? null;
  const tasks = activeGoal ? data?.tasks.filter((task) => task.goal_id === activeGoal.id) ?? [] : [];
  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const progressPercentage = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!data || !activeGoal) {
    return <p className="text-zinc-500">{error ?? 'Create a goal to view a roadmap.'}</p>;
  }

  return (
    <div className="space-y-8 font-sans">
      <div className="flex justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-mono uppercase tracking-tight font-bold text-zinc-100">
            Roadmap
          </h1>
          <p className="text-zinc-400 font-serif italic mt-2">
            Your structured path to mastering {activeGoal.title}.
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-zinc-400 font-mono uppercase tracking-widest mb-1">Overall Progress</div>
          <div className="flex items-center gap-3">
            <Progress value={progressPercentage} className="w-32" indicatorClassName="bg-amber-500" />
            <span className="font-mono font-bold text-zinc-200">{progressPercentage}%</span>
          </div>
        </div>
      </div>

      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-800 before:to-transparent">
        <div className="relative flex items-center justify-between">
          <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-zinc-950 bg-zinc-900 text-zinc-500 shadow shrink-0 z-10">
            <Activity className="w-5 h-5 text-amber-500" />
          </div>

          <Card className="w-[calc(100%-4rem)] bg-zinc-900/50 border-zinc-800/50 transition-all border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            <CardHeader className="cursor-pointer pb-4" onClick={() => setIsExpanded((current) => !current)}>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <Badge variant="warning" className="mb-2 font-mono tracking-widest uppercase text-[10px]">
                    Active Goal
                  </Badge>
                  <CardTitle className="text-lg text-zinc-100">{activeGoal.title}</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-zinc-500">
                    {completedTasks}/{tasks.length}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  )}
                </div>
              </div>
              <Progress value={progressPercentage} className="mt-4 h-1" indicatorClassName="bg-blue-500" />
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 pb-4">
                <div className="space-y-3 mt-2 border-t border-zinc-800/50 pt-4">
                  {tasks.map((task) => (
                    <div key={task.id} className={`flex items-start gap-3 p-3 rounded-md border ${task.status === 'in_progress' ? 'bg-zinc-900 border-blue-500/30' : 'bg-zinc-950/50 border-zinc-800/50'}`}>
                      <div className="mt-0.5">
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : task.status === 'in_progress' ? (
                          <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                        ) : (
                          <Circle className="w-4 h-4 text-zinc-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className={`text-sm font-medium ${task.status === 'completed' ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                          {task.title}
                        </h4>
                        <p className="text-xs text-zinc-500 mt-1">{task.description}</p>

                        {task.status !== 'completed' && (
                          <div className="mt-3 flex items-center gap-2">
                            <Badge variant="info" className="text-[10px] uppercase font-mono tracking-wider">
                              {task.status === 'in_progress' ? 'In Progress' : 'Recommended Next'}
                            </Badge>
                            <Link to={`/app/session/${task.id}`}>
                              <Button size="sm" variant="accent" className="h-7 text-xs font-mono uppercase tracking-wider gap-1">
                                <Play className="w-3 h-3 fill-current" /> Start
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
