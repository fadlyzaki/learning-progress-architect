import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Inbox, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

type Tone = 'default' | 'warning' | 'danger';

function toneClasses(tone: Tone) {
  if (tone === 'warning') {
    return 'border-amber-500/30 bg-amber-500/10';
  }

  if (tone === 'danger') {
    return 'border-red-500/25 bg-red-500/10';
  }

  return 'border-[var(--border-color)] bg-[var(--bg-soft)]';
}

export function PageMessageState({
  title,
  body,
  actionLabel,
  actionTo,
  onAction,
  tone = 'default',
  icon,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  tone?: Tone;
  icon?: ReactNode;
}) {
  return (
    <Card className={cn('app-card-supporting', toneClasses(tone))}>
      <CardHeader className="pb-4">
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)]">
          {icon ?? (tone === 'danger' ? <AlertTriangle className="h-5 w-5 text-red-400" /> : <Inbox className="h-5 w-5 text-amber-400" />)}
        </div>
        <CardTitle className="text-xl text-[var(--text-primary)]">{title}</CardTitle>
        <CardDescription className="max-w-2xl text-base leading-relaxed">
          {body}
        </CardDescription>
      </CardHeader>
      {(actionLabel && (actionTo || onAction)) && (
        <CardContent>
          {actionTo ? (
            <Link to={actionTo}>
              <Button variant={tone === 'danger' ? 'danger' : 'accent'} className="gap-2">
                {actionLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Button variant={tone === 'danger' ? 'danger' : 'accent'} className="gap-2" onClick={onAction}>
              {actionLabel}
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function InlineStateMessage({
  title,
  body,
  tone = 'default',
}: {
  title: string;
  body?: string;
  tone?: Tone;
}) {
  return (
    <div className={cn('rounded-2xl border px-4 py-3', toneClasses(tone))}>
      <div className="text-sm font-medium text-[var(--text-primary)]">{title}</div>
      {body ? <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{body}</p> : null}
    </div>
  );
}

export function PageLoadingState({
  stats = 0,
  rows = 3,
  className,
}: {
  stats?: number;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-8 animate-pulse', className)} aria-hidden="true">
      <div className="space-y-3">
        <div className="h-3 w-28 rounded-full bg-[var(--bg-soft)]" />
        <div className="h-10 w-72 max-w-full rounded-full bg-[var(--bg-soft)]" />
        <div className="h-4 w-[34rem] max-w-full rounded-full bg-[var(--bg-soft)]" />
      </div>

      {stats > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: stats }, (_, index) => (
            <div key={index} className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-soft)] p-5">
              <div className="h-3 w-24 rounded-full bg-[var(--bg-card)]" />
              <div className="mt-4 h-10 w-20 rounded-full bg-[var(--bg-card)]" />
              <div className="mt-3 h-3 w-28 rounded-full bg-[var(--bg-card)]" />
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
        <div className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-soft)] p-6">
          <div className="h-4 w-24 rounded-full bg-[var(--bg-card)]" />
          <div className="mt-4 h-10 w-3/4 rounded-full bg-[var(--bg-card)]" />
          <div className="mt-3 h-4 w-full rounded-full bg-[var(--bg-card)]" />
          <div className="mt-2 h-4 w-5/6 rounded-full bg-[var(--bg-card)]" />
          <div className="mt-8 flex gap-3">
            <div className="h-11 w-36 rounded-full bg-[var(--bg-card)]" />
            <div className="h-11 w-32 rounded-full bg-[var(--bg-card)]" />
          </div>
        </div>

        <div className="space-y-4">
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-soft)] p-5">
              <div className="h-3 w-20 rounded-full bg-[var(--bg-card)]" />
              <div className="mt-4 h-6 w-2/3 rounded-full bg-[var(--bg-card)]" />
              <div className="mt-3 h-4 w-full rounded-full bg-[var(--bg-card)]" />
              <div className="mt-2 h-4 w-4/5 rounded-full bg-[var(--bg-card)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
