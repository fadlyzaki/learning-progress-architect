import { BookOpen, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useAppData } from '../hooks/useAppData';

export function ReflectionsPage() {
  const { data, loading, error } = useAppData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-zinc-500">{error ?? 'Unable to load reflections.'}</p>;
  }

  const reflections = data.sessions.filter((session) => session.completed_at && (session.reflection || session.confusion));

  return (
    <div className="space-y-8 font-sans">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-mono uppercase tracking-tight font-bold text-zinc-100">
            Session Log
          </h1>
          <p className="text-zinc-400 font-serif italic mt-2">
            Your saved reflections from completed sessions.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {reflections.length > 0 ? (
          reflections.map((session) => {
            const task = data.tasks.find((item) => item.id === session.task_id);
            return (
              <Card key={session.id} className="bg-zinc-900/30 border-zinc-800/50">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="outline" className="mb-2 font-mono tracking-widest uppercase text-[10px] border-zinc-700 text-zinc-400">
                        {session.completed_at ? new Date(session.completed_at).toLocaleDateString() : 'Unknown Date'}
                      </Badge>
                      <CardTitle className="text-xl text-zinc-100">{task?.title ?? 'Task reflection'}</CardTitle>
                      <CardDescription className="mt-1 text-zinc-400">
                        Duration: {Math.round(session.duration_seconds / 60)} minutes
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <h4 className="flex items-center gap-2 text-sm font-mono uppercase tracking-widest text-zinc-500">
                      <BookOpen className="w-4 h-4 text-blue-400" /> Summary
                    </h4>
                    <p className="text-zinc-300 text-sm leading-relaxed">
                      {session.reflection ?? 'No reflection was saved for this session.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="flex items-center gap-2 text-sm font-mono uppercase tracking-widest text-zinc-500">
                      <AlertCircle className="w-4 h-4 text-amber-400" /> Blockers / Confusion
                    </h4>
                    <p className="text-zinc-300 text-sm leading-relaxed">
                      {session.confusion ?? 'No blockers were recorded.'}
                    </p>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-zinc-800/50">
                    <h4 className="flex items-center gap-2 text-sm font-mono uppercase tracking-widest text-zinc-500">
                      <ArrowRight className="w-4 h-4 text-green-400" /> Confidence
                    </h4>
                    <p className="text-zinc-300 text-sm leading-relaxed">
                      {session.confidence ? `${session.confidence}/5 confidence at completion.` : 'No confidence score recorded.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="bg-zinc-900/30 border-zinc-800/50">
            <CardContent className="py-10 text-zinc-500">
              Complete a session and save a reflection to build your log.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
