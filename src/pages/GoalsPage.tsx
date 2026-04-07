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
import type { AppDataPayload, GoalRecord } from '../types';

export function GoalsPage() {
  const { data, loading, error, refetch } = useAppData();
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

  const [activeGoal, ...otherGoals] = data.goals;

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
        <GoalCard goal={activeGoal} isPrimary data={data} />
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
              <GoalCard goal={goal} data={data} />
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
}: {
  goal: GoalRecord;
  data: AppDataPayload;
  isPrimary?: boolean;
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
            <Badge variant={goal.status === 'completed' ? 'success' : isPrimary ? 'warning' : 'outline'}>
              {t(`status.${goal.status}`)}
            </Badge>
            <CardTitle className="mt-4 text-2xl text-[var(--text-primary)]">{goal.title}</CardTitle>
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

        <Link to="/app/roadmap">
          <Button variant={isPrimary ? 'accent' : 'outline'} className="w-full sm:w-auto">
            {t('goals.viewRoadmap')}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function GoalSignal({ icon, label }: { icon?: ReactNode; label: string }) {
  return (
    <div className="app-list-row-quiet flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-[var(--text-secondary)]">
      {icon}
      <span>{label}</span>
    </div>
  );
}
