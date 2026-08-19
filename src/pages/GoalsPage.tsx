import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Clock, Plus, Target } from 'lucide-react';
import { useAppMeta } from '../components/AppMeta';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { PageIntro, PageLoadingState, PageMessageState } from '../components/PageStates';
import { useAppData } from '../hooks/useAppData';
import { usePreferences } from '../lib/preferences';
import { useActiveGoal } from '../lib/activeGoal';
import type { AppDataPayload, GoalRecord } from '../types';

export function GoalsPage() {
  const { data, loading, error, refetch } = useAppData();
  const { activeGoal, setActiveGoalId } = useActiveGoal(data?.goals);
  const { t } = usePreferences();
  useAppMeta({
    title: t('goals.title'),
    description: t('goals.subtitle'),
  });

  if (loading) {
    return <PageLoadingState variant="collection" rows={2} />;
  }

  if (!data) {
    return (
      <PageMessageState
        title={t('goals.title')}
        body={error ?? t('goals.subtitle')}
        actionLabel={t('common.retry')}
        onAction={() => void refetch()}
        tone="warning"
      />
    );
  }

  const otherGoals = activeGoal
    ? data.goals.filter((g) => g.id !== activeGoal.id)
    : data.goals.slice(1);

  return (
    <div className="space-y-8 font-sans">
      <PageIntro
        title={t('goals.title')}
        body={t('goals.subtitle')}
        actions={
          <Link to="/onboarding">
            <Button variant="accent" className="gap-2">
              <Plus className="h-4 w-4" />
              {t('goals.newGoal')}
            </Button>
          </Link>
        }
      />

      {activeGoal ? (
        <GoalCard goal={activeGoal} isPrimary data={data} onSetActive={() => setActiveGoalId(activeGoal.id)} />
      ) : (
        <PageMessageState
          title={t('goals.empty')}
          body={t('dashboard.emptyCard')}
          actionLabel={t('goals.emptyAction')}
          actionTo="/onboarding"
        />
      )}

      {otherGoals.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {otherGoals.map((goal) => (
            <div key={goal.id}>
              <GoalCard goal={goal} data={data} onSetActive={() => setActiveGoalId(goal.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GoalCard({
  goal,
  data,
  isPrimary = false,
  onSetActive,
}: {
  goal: GoalRecord;
  data: AppDataPayload;
  isPrimary?: boolean;
  onSetActive?: () => void;
}) {
  const { t } = usePreferences();
  const tasks = data.tasks.filter((task) => task.goal_id === goal.id);
  const resources = data.resources.filter((resource) => resource.goal_id === goal.id);
  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const progressPercentage = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <Card className={isPrimary ? 'app-card-primary' : 'app-card-supporting'}>
      <CardHeader className="pb-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant={goal.status === 'completed' ? 'success' : isPrimary ? 'warning' : 'outline'}>
                {isPrimary ? t('goals.activeFocus') : t(`status.${goal.status}`)}
              </Badge>
              {goal.status === 'completed' && isPrimary && (
                <Badge variant="success">{t('status.completed')}</Badge>
              )}
            </div>
            <CardTitle className="mt-4 line-clamp-2 text-2xl text-[var(--text-primary)]">{goal.title}</CardTitle>
            <CardDescription className="mt-2 text-base leading-relaxed">
              {t(`option.level.${goal.level}`)}
              {goal.target_date ? ` · ${goal.target_date}` : ''}
            </CardDescription>
          </div>
          <div className="text-left md:text-right">
            <div className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{progressPercentage}%</div>
            <div className="text-sm text-[var(--text-muted)]">{t('progress.overallCompletion')}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        <Progress value={progressPercentage} indicatorClassName={isPrimary ? 'bg-[var(--accent-amber)]' : 'bg-[var(--accent-blue)]'} />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <GoalSignal icon={<Target className="h-4 w-4 text-[var(--accent-blue)]" />} label={t('goals.tasks', { count: tasks.length })} />
          <GoalSignal icon={<Clock className="h-4 w-4 text-[var(--accent-amber)]" />} label={t('common.hoursPerWeek', { count: goal.hours })} />
          <GoalSignal icon={<Activity className="h-4 w-4 text-green-500" />} label={t('goals.completed', { count: completedTasks })} />
          <GoalSignal label={t('goals.style', { style: t(`option.style.${goal.preferred_style ?? 'Mixed'}`) })} />
          <GoalSignal label={t('goals.resources', { count: resources.length })} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!isPrimary && onSetActive && (
            <Button variant="accent" onClick={onSetActive} className="w-full sm:w-auto">
              {t('goals.setActiveFocus')}
            </Button>
          )}
          <Link to="/app/roadmap" onClick={isPrimary ? undefined : onSetActive} className="w-full sm:w-auto">
            <Button variant={isPrimary ? 'accent' : 'outline'} className="w-full sm:w-auto">
              {t('goals.viewRoadmap')}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function GoalSignal({ icon, label }: { icon?: ReactNode; label: string }) {
  return (
    <div className="app-list-row-quiet flex min-w-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm text-[var(--text-secondary)]">
      {icon && <div className="shrink-0">{icon}</div>}
      <span className="truncate">{label}</span>
    </div>
  );
}
