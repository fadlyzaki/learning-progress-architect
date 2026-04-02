import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Play, ChevronDown, ChevronRight, Activity, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { useAppData } from '../hooks/useAppData';
import { usePreferences } from '../lib/preferences';

export function RoadmapPage() {
  const { data, loading, error } = useAppData();
  const { t } = usePreferences();
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
    return <p className="text-[var(--text-muted)]">{error ?? t('roadmap.empty')}</p>;
  }

  return (
    <div className="space-y-8 font-sans">
      <div className="flex justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-mono font-bold uppercase tracking-tight text-[var(--text-primary)]">
            {t('roadmap.title')}
          </h1>
          <p className="mt-2 font-serif italic text-[var(--text-secondary)]">
            {t('roadmap.subtitle', { goal: activeGoal.title })}
          </p>
        </div>
        <div className="text-right">
          <div className="mb-1 text-sm font-mono uppercase tracking-widest text-[var(--text-secondary)]">{t('roadmap.progress')}</div>
          <div className="flex items-center gap-3">
            <Progress value={progressPercentage} className="w-32" indicatorClassName="bg-amber-500" />
            <span className="font-mono font-bold text-[var(--text-primary)]">{progressPercentage}%</span>
          </div>
        </div>
      </div>

      <div className="relative space-y-6 before:absolute before:inset-0 before:ml-6 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:via-[var(--border-color)] before:to-transparent">
        <div className="relative flex items-center justify-between">
          <div className="z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-[var(--bg-void)] bg-[var(--bg-card)] text-[var(--text-muted)] shadow">
            <Activity className="w-5 h-5 text-amber-500" />
          </div>

          <Card className="w-[calc(100%-4rem)] border-amber-500/30 bg-[var(--bg-soft)] transition-all shadow-[0_0_15px_var(--glow-amber)]">
            <CardHeader className="cursor-pointer pb-4" onClick={() => setIsExpanded((current) => !current)}>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <Badge variant="warning" className="mb-2 font-mono tracking-widest uppercase text-[10px]">
                    {t('roadmap.activeGoal')}
                  </Badge>
                  <CardTitle className="text-lg text-[var(--text-primary)]">{activeGoal.title}</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-[var(--text-muted)]">
                    {completedTasks}/{tasks.length}
                  </span>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />}
                </div>
              </div>
              <Progress value={progressPercentage} className="mt-4 h-1" indicatorClassName="bg-blue-500" />
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 pb-4">
                <div className="mt-2 space-y-3 border-t border-[var(--border-color)] pt-4">
                  {tasks.map((task) => (
                    <div key={task.id} className={`flex items-start gap-3 rounded-md border p-3 ${task.status === 'in_progress' ? 'border-blue-500/30 bg-[var(--bg-card)]' : 'border-[var(--border-color)] bg-[var(--bg-void)]/60'}`}>
                      <div className="mt-0.5">
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : task.status === 'in_progress' ? (
                          <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                        ) : (
                          <Circle className="w-4 h-4 text-[var(--text-muted)]" />
                        )}
                      </div>
                      <div className="flex-1">
                        {(() => {
                          const resourceCount =
                            data?.task_resources.filter((item) => item.task_id === task.id).length ?? 0;

                          return (
                            <>
                        <h4 className={`text-sm font-medium ${task.status === 'completed' ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                          {task.title}
                        </h4>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">{task.description}</p>
                              {resourceCount > 0 && (
                                <p className="mt-2 text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                                  {t('roadmap.materials', { count: resourceCount })}
                                </p>
                              )}

                        {task.status !== 'completed' && (
                          <div className="mt-3 flex items-center gap-2">
                            <Badge variant="info" className="text-[10px] uppercase font-mono tracking-wider">
                              {task.status === 'in_progress' ? t('roadmap.inProgress') : t('roadmap.recommended')}
                            </Badge>
                            <Link to={`/app/session/${task.id}`}>
                              <Button size="sm" variant="accent" className="h-7 text-xs font-mono uppercase tracking-wider gap-1">
                                <Play className="w-3 h-3 fill-current" /> {t('common.start')}
                              </Button>
                            </Link>
                          </div>
                        )}
                            </>
                          );
                        })()}
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
