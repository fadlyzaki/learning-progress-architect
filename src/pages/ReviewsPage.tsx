import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, RefreshCw, Play, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAppData } from '../hooks/useAppData';

export function ReviewsPage() {
  const { data, loading, error } = useAppData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-zinc-500">{error ?? 'Unable to load reviews.'}</p>;
  }

  const now = new Date();
  const dueReviews = data.reviews.filter((review) => review.status === 'pending' && new Date(review.due_date) <= now);
  const upcomingReviews = data.reviews.filter((review) => review.status === 'pending' && new Date(review.due_date) > now);
  const weakAreas = data.sessions
    .filter((session) => session.completed_at && session.confidence !== null)
    .sort((left, right) => (left.confidence ?? 0) - (right.confidence ?? 0))
    .slice(0, 3);

  return (
    <div className="space-y-8 font-sans">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-mono uppercase tracking-tight font-bold text-zinc-100">
            Review Center
          </h1>
          <p className="text-zinc-400 font-serif italic mt-2">
            Review cadence is now scheduled from your real comprehension scores.
          </p>
        </div>
        <div className="text-right">
          <Badge variant="destructive" className="font-mono tracking-widest uppercase text-xs">
            {dueReviews.length} Due Now
          </Badge>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-zinc-900/30 border-zinc-800/50">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-amber-500" />
                Due Reviews
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dueReviews.length > 0 ? (
                dueReviews.map((review) => {
                  const task = data.tasks.find((item) => item.id === review.task_id);
                  return (
                    <div key={review.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-zinc-950 border border-zinc-800 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={review.priority === 'high' ? 'destructive' : review.priority === 'medium' ? 'warning' : 'secondary'} className="text-[10px] uppercase font-mono tracking-wider">
                            {review.priority} Priority
                          </Badge>
                          <span className="text-xs text-zinc-500 font-mono">
                            Due: {new Date(review.due_date).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="font-medium text-zinc-200">{task?.title ?? 'Task review'}</h4>
                      </div>
                      <Link to={`/app/session/${review.task_id}`}>
                        <Button variant="outline" className="shrink-0 gap-2">
                          <Play className="w-4 h-4 fill-current" /> Start Review
                        </Button>
                      </Link>
                    </div>
                  );
                })
              ) : (
                <p className="text-zinc-500">No reviews are due right now.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/30 border-zinc-800/50">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingReviews.length > 0 ? (
                upcomingReviews.slice(0, 5).map((review) => {
                  const task = data.tasks.find((item) => item.id === review.task_id);
                  return (
                    <div key={review.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-zinc-950 border border-zinc-800/50 opacity-70 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-zinc-500 font-mono">
                            Due: {new Date(review.due_date).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="font-medium text-zinc-400">{task?.title ?? 'Task review'}</h4>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-zinc-500">Future reviews will appear after you complete sessions.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-zinc-900/30 border-red-900/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Weak Areas
              </CardTitle>
              <CardDescription>Lowest-confidence topics from your completed sessions.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {weakAreas.length > 0 ? (
                  weakAreas.map((session) => {
                    const task = data.tasks.find((item) => item.id === session.task_id);
                    return (
                      <li key={session.id} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-zinc-300">{task?.title ?? 'Task'}</span>
                        <Badge variant={(session.confidence ?? 0) <= 2 ? 'destructive' : 'warning'} className="text-[10px]">
                          Score: {session.confidence ?? 0}/5
                        </Badge>
                      </li>
                    );
                  })
                ) : (
                  <li className="text-sm text-zinc-500">Confidence data will appear after your first session check-in.</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
