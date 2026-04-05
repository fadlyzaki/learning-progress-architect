import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { cn } from '../lib/utils';

export function PrimaryActionPanel({
  eyebrow,
  title,
  description,
  insight,
  meta,
  actions,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  insight?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('app-card-primary relative overflow-hidden rounded-[1.9rem] border-amber-500/28', className)}>
      <div className="absolute inset-y-0 left-0 w-1 bg-[var(--accent-amber)]" />
      <CardHeader className="pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.24em] text-[var(--accent-amber)]">
              {eyebrow}
            </div>
            <CardTitle className="mt-4 max-w-3xl text-3xl font-semibold leading-tight text-[var(--text-primary)] md:text-[2rem]">
              {title}
            </CardTitle>
            <CardDescription className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">
              {description}
            </CardDescription>
          </div>
          {meta && <div className="shrink-0">{meta}</div>}
        </div>
      </CardHeader>

      {(insight || actions) && (
        <CardContent className="space-y-5 pt-0">
          {insight && (
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/85 px-4 py-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              {insight}
            </div>
          )}
          {actions && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {actions}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function SecondaryActionHint({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]">
      <ArrowRight className="h-4 w-4 text-[var(--accent-amber)]" />
      {children}
    </div>
  );
}
