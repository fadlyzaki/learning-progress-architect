import { Link } from 'react-router-dom';
import { Plus, Target, Clock, Activity, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { useAppData } from '../hooks/useAppData';
import { usePreferences } from '../lib/preferences';

export function GoalsPage() {
  const { data, loading, error } = useAppData();
  const { t } = usePreferences();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-[var(--text-muted)]">{error ?? 'Unable to load goals.'}</p>;
  }

  return (
    <div className="space-y-8 font-sans">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-mono font-bold uppercase tracking-tight text-[var(--text-primary)]">
            {t('goals.title')}
          </h1>
          <p className="mt-2 font-serif italic text-[var(--text-secondary)]">
            {t('goals.subtitle')}
          </p>
        </div>
        <Link to="/onboarding">
          <Button variant="accent" className="font-mono uppercase tracking-wider gap-2">
            <Plus className="w-4 h-4" />
            {t('goals.newGoal')}
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {data.goals.map((goal) => {
          const tasks = data.tasks.filter((task) => task.goal_id === goal.id);
          const completedTasks = tasks.filter((task) => task.status === 'completed').length;
          const progressPercentage = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

          return (
            <Card key={goal.id} className="border-amber-500/20 bg-[var(--bg-soft)]">
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <Badge variant={goal.status === 'completed' ? 'success' : 'warning'} className="mb-3 font-mono tracking-widest uppercase text-[10px]">
                      {t(`status.${goal.status}`)}
                    </Badge>
                    <CardTitle className="text-xl text-[var(--text-primary)]">{goal.title}</CardTitle>
                    <CardDescription className="mt-1 text-[var(--text-secondary)]">
                      {t(`option.level.${goal.level}`)}
                      {goal.target_date ? ` · ${goal.target_date}` : ''}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-mono font-bold text-[var(--text-primary)]">{progressPercentage}%</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={progressPercentage} indicatorClassName="bg-amber-500" />

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Target className="w-4 h-4 text-blue-400" />
                    <span>{t('goals.tasks', { count: tasks.length })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>{t('common.hoursPerWeek', { count: goal.hours })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Activity className="w-4 h-4 text-green-400" />
                    <span>{t('goals.completed', { count: completedTasks })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <span className="font-mono text-xs uppercase">
                      {t('goals.style', {
                        style: t(`option.style.${goal.preferred_style ?? 'Mixed'}`),
                      })}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <Link to="/app/roadmap" className="flex-1">
                    <Button variant="outline" className="w-full">
                      {t('goals.viewRoadmap')}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {data.goals.length === 0 && (
          <div className="col-span-2 text-center py-12">
            <p className="mb-4 text-[var(--text-muted)]">{t('goals.empty')}</p>
            <Link to="/onboarding">
              <Button variant="outline">{t('goals.emptyAction')}</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
