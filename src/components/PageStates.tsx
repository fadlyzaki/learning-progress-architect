import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Inbox, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

type Tone = 'default' | 'warning' | 'danger';
type LoadingVariant = 'default' | 'dashboard' | 'collection' | 'detail' | 'metrics' | 'form';

function toneClasses(tone: Tone) {
  if (tone === 'warning') {
    return 'border-amber-500/30 bg-amber-500/10';
  }

  if (tone === 'danger') {
    return 'border-red-500/25 bg-red-500/10';
  }

  return 'border-[var(--border-color)] bg-[var(--bg-soft)]';
}

export function PageIntro({
  eyebrow,
  title,
  body,
  actions,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? (
          <div className="mb-3 text-[11px] font-mono font-semibold uppercase tracking-[0.24em] text-[var(--accent-amber)]">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--text-primary)]">{title}</h1>
        {body ? (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">{body}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

export function PageMessageState({
  eyebrow,
  title,
  body,
  actionLabel,
  actionTo,
  onAction,
  tone = 'default',
  icon,
}: {
  eyebrow?: string;
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
        {eyebrow ? (
          <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            {eyebrow}
          </div>
        ) : null}
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
  variant = 'default',
  stats = 0,
  rows = 3,
  className,
}: {
  variant?: LoadingVariant;
  stats?: number;
  rows?: number;
  className?: string;
}) {
  const intro = (
    <div className="space-y-3">
      <div className="h-3 w-28 rounded-full bg-[var(--bg-soft)]" />
      <div className="h-10 w-72 max-w-full rounded-full bg-[var(--bg-soft)]" />
      <div className="h-4 w-[34rem] max-w-full rounded-full bg-[var(--bg-soft)]" />
    </div>
  );

  const statGrid = (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: Math.max(stats, 4) }, (_, index) => (
        <div key={index} className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-soft)] p-5">
          <div className="h-3 w-24 rounded-full bg-[var(--bg-card)]" />
          <div className="mt-4 h-10 w-20 rounded-full bg-[var(--bg-card)]" />
          <div className="mt-3 h-3 w-28 rounded-full bg-[var(--bg-card)]" />
        </div>
      ))}
    </div>
  );

  const rowStack = (count: number) => (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-soft)] p-5">
          <div className="h-3 w-20 rounded-full bg-[var(--bg-card)]" />
          <div className="mt-4 h-6 w-2/3 rounded-full bg-[var(--bg-card)]" />
          <div className="mt-3 h-4 w-full rounded-full bg-[var(--bg-card)]" />
          <div className="mt-2 h-4 w-4/5 rounded-full bg-[var(--bg-card)]" />
        </div>
      ))}
    </div>
  );

  const variants: Record<LoadingVariant, ReactNode> = {
    default: (
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
        {rowStack(rows)}
      </div>
    ),
    dashboard: (
      <div className="space-y-6">
        <div className="rounded-[1.9rem] border border-[var(--border-color)] bg-[var(--bg-soft)] p-6">
          <div className="h-3 w-28 rounded-full bg-[var(--bg-card)]" />
          <div className="mt-4 h-12 w-4/5 rounded-full bg-[var(--bg-card)]" />
          <div className="mt-3 h-4 w-full rounded-full bg-[var(--bg-card)]" />
          <div className="mt-2 h-4 w-3/4 rounded-full bg-[var(--bg-card)]" />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <div className="h-11 w-40 rounded-full bg-[var(--bg-card)]" />
            <div className="h-11 w-32 rounded-full bg-[var(--bg-card)]" />
          </div>
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
          <div className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-soft)] p-6">
            <div className="h-3 w-24 rounded-full bg-[var(--bg-card)]" />
            <div className="mt-4 h-8 w-2/3 rounded-full bg-[var(--bg-card)]" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: Math.max(rows, 3) }, (_, index) => (
                <div key={index} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/70 p-4">
                  <div className="h-5 w-1/2 rounded-full bg-[var(--bg-soft)]" />
                  <div className="mt-3 h-4 w-full rounded-full bg-[var(--bg-soft)]" />
                </div>
              ))}
            </div>
          </div>
          {rowStack(2)}
        </div>
      </div>
    ),
    collection: (
      <div className="space-y-6">
        <div className="rounded-[1.8rem] border border-[var(--border-color)] bg-[var(--bg-soft)] p-6">
          <div className="h-3 w-24 rounded-full bg-[var(--bg-card)]" />
          <div className="mt-4 h-10 w-3/5 rounded-full bg-[var(--bg-card)]" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-12 rounded-2xl bg-[var(--bg-card)]" />
            ))}
          </div>
          <div className="mt-6 h-11 w-36 rounded-full bg-[var(--bg-card)]" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">{Array.from({ length: Math.max(rows, 2) }, (_, index) => <div key={index}>{rowStack(1)}</div>)}</div>
      </div>
    ),
    detail: (
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.92fr]">
        <div className="space-y-6">
          <div className="rounded-[1.8rem] border border-[var(--border-color)] bg-[var(--bg-soft)] p-6">
            <div className="h-6 w-44 rounded-full bg-[var(--bg-card)]" />
            <div className="mt-4 h-4 w-full rounded-full bg-[var(--bg-card)]" />
            <div className="mt-2 h-4 w-4/5 rounded-full bg-[var(--bg-card)]" />
          </div>
          {rowStack(Math.max(rows, 2))}
        </div>
        <div className="space-y-4">
          <div className="rounded-[1.8rem] border border-[var(--border-color)] bg-[var(--bg-soft)] p-6">
            <div className="h-3 w-24 rounded-full bg-[var(--bg-card)]" />
            <div className="mt-4 h-10 w-36 rounded-full bg-[var(--bg-card)]" />
            <div className="mt-6 h-11 w-full rounded-full bg-[var(--bg-card)]" />
          </div>
          {rowStack(2)}
        </div>
      </div>
    ),
    metrics: (
      <div className="space-y-6">
        {statGrid}
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.98fr]">
          <div>{rowStack(1)}</div>
          <div>{rowStack(Math.max(rows - 1, 1))}</div>
        </div>
      </div>
    ),
    form: (
      <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-soft)] p-0">
        <div className="grid lg:grid-cols-[0.38fr_0.62fr]">
          <div className="border-b border-[var(--border-color)] p-6 lg:border-b-0 lg:border-r">
            <div className="h-3 w-24 rounded-full bg-[var(--bg-card)]" />
            <div className="mt-4 h-8 w-3/4 rounded-full bg-[var(--bg-card)]" />
            <div className="mt-4 h-4 w-full rounded-full bg-[var(--bg-card)]" />
            <div className="mt-2 h-4 w-5/6 rounded-full bg-[var(--bg-card)]" />
          </div>
          <div className="p-6">
            <div className="h-8 w-1/2 rounded-full bg-[var(--bg-card)]" />
            <div className="mt-3 h-4 w-2/3 rounded-full bg-[var(--bg-card)]" />
            <div className="mt-8 space-y-4">
              {Array.from({ length: Math.max(rows, 4) }, (_, index) => (
                <div key={index} className="space-y-2">
                  <div className="h-3 w-20 rounded-full bg-[var(--bg-card)]" />
                  <div className="h-12 rounded-2xl bg-[var(--bg-card)]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className={cn('space-y-8 animate-pulse', className)} aria-hidden="true">
      {intro}
      {variant !== 'metrics' && stats > 0 ? statGrid : null}
      {variants[variant]}
    </div>
  );
}
