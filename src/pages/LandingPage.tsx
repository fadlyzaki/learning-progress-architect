import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Layers, RefreshCw, Target } from 'lucide-react';
import { AppFooter } from '../components/AppFooter';
import { useAppMeta } from '../components/AppMeta';
import { Button } from '../components/ui/Button';
import { PreferenceControls } from '../components/PreferenceControls';
import { usePreferences } from '../lib/preferences';

export function LandingPage() {
  const { t } = usePreferences();
  useAppMeta({
    title: 'Learning Progress Architect',
    description:
      'A calmer learning workspace that turns complex goals into structured roadmaps, focused study sessions, reviews, and reflection.',
  });

  return (
    <div className="app-shell min-h-screen font-sans selection:bg-amber-500/30">
      <header className="container mx-auto flex min-h-20 flex-col gap-4 border-b border-[var(--border-color)] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-mono font-bold uppercase tracking-[0.28em] text-[var(--accent-amber)]">
            {t('brand.name')}
          </span>
          <span className="text-sm font-mono font-semibold uppercase tracking-[0.18em] text-[var(--text-primary)]">
            {t('brand.product')}
          </span>
        </div>
        <div className="flex flex-col gap-4 lg:items-end">
          <PreferenceControls />
          <nav className="hidden items-center gap-8 text-sm font-medium text-[var(--text-secondary)] md:flex">
          <a href="#principles" className="transition-colors hover:text-[var(--text-primary)]">
            {t('landing.navPrinciples')}
          </a>
          <a href="#workflow" className="transition-colors hover:text-[var(--text-primary)]">
            {t('landing.navWorkflow')}
          </a>
          <Link to="/login" className="transition-colors hover:text-[var(--text-primary)]">
            {t('landing.navSignIn')}
          </Link>
          <Link to="/signup">
            <Button variant="outline">
              {t('landing.navStart')}
            </Button>
          </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="container mx-auto border-x border-[var(--border-color)] px-6 py-24 md:py-28 lg:py-32">
          <div className="max-w-6xl mx-auto grid gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div className="flex flex-col items-start text-left">
              <div className="mb-8 inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400">
                {t('landing.kicker')}
              </div>
              <h1 className="max-w-4xl text-4xl font-mono font-bold uppercase leading-[0.96] tracking-tight text-[var(--text-primary)] md:text-6xl lg:text-[5.2rem]">
                {t('landing.title')}
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[var(--text-secondary)] md:text-[1.32rem]">
                {t('landing.body')}
              </p>
              <p className="mt-4 max-w-2xl text-base font-serif italic text-[var(--text-muted)] md:text-lg">
                {t('landing.subbody')}
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link to="/signup">
                  <Button size="lg" variant="accent" className="w-full sm:w-auto font-mono uppercase tracking-wider">
                    {t('landing.ctaPrimary')}
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto font-mono uppercase tracking-wider">
                    {t('landing.ctaSecondary')}
                  </Button>
                </Link>
              </div>
              <div className="mt-12 grid sm:grid-cols-3 gap-4 w-full max-w-3xl">
                <SignalCard
                  label={t('landing.signal.goal.label')}
                  value={t('landing.signal.goal.value')}
                  note={t('landing.signal.goal.note')}
                />
                <SignalCard
                  label={t('landing.signal.session.label')}
                  value={t('landing.signal.session.value')}
                  note={t('landing.signal.session.note')}
                />
                <SignalCard
                  label={t('landing.signal.confidence.label')}
                  value={t('landing.signal.confidence.value')}
                  note={t('landing.signal.confidence.note')}
                />
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-[var(--border-color)] bg-[var(--bg-panel)] p-6 shadow-[var(--shadow-panel)] md:p-8">
              <div className="flex items-center justify-between gap-4">
                <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-[var(--text-muted)]">
                  {t('landing.snapshot')}
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400">
                  {t('brand.tagline')}
                </div>
              </div>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-soft)] p-5">
                  <div className="text-xs font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">
                    {t('landing.valueTitle')}
                  </div>
                  <p className="mt-3 leading-relaxed text-[var(--text-secondary)]">
                    {t('landing.valueBody')}
                  </p>
                </div>
                <SystemRow
                  title={t('landing.system.1.title')}
                  body={t('landing.system.1.body')}
                />
                <SystemRow
                  title={t('landing.system.2.title')}
                  body={t('landing.system.2.body')}
                />
                <SystemRow
                  title={t('landing.system.3.title')}
                  body={t('landing.system.3.body')}
                />
              </div>
            </div>
          </div>
        </section>

        <section id="principles" className="border-t border-[var(--border-color)] bg-[var(--bg-surface)]/40 py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <div className="mb-10 max-w-3xl">
                <div className="mb-3 text-[10px] font-mono uppercase tracking-[0.28em] text-[var(--accent-amber)]">
                  {t('landing.principles.kicker')}
                </div>
                <h2 className="text-3xl font-mono uppercase tracking-tight text-[var(--text-primary)] md:text-4xl">
                  {t('landing.principles.title')}
                </h2>
                <p className="mt-4 leading-relaxed text-[var(--text-secondary)]">
                  {t('landing.principles.body')}
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <PrincipleCard
                  title={t('landing.principle.1.title')}
                  description={t('landing.principle.1.body')}
                />
                <PrincipleCard
                  title={t('landing.principle.2.title')}
                  description={t('landing.principle.2.body')}
                />
                <PrincipleCard
                  title={t('landing.principle.3.title')}
                  description={t('landing.principle.3.body')}
                />
              </div>
            </div>
          </div>
        </section>

        <section id="workflow" className="border-t border-[var(--border-color)] bg-[var(--bg-surface)]/60 py-24">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto mb-12">
              <div className="mb-3 text-[10px] font-mono uppercase tracking-[0.28em] text-[var(--text-muted)]">
                {t('landing.workflow.kicker')}
              </div>
              <h2 className="text-3xl font-mono uppercase tracking-tight text-[var(--text-primary)] md:text-4xl">
                {t('landing.workflow.title')}
              </h2>
              <p className="mt-4 max-w-3xl leading-relaxed text-[var(--text-secondary)]">
                {t('landing.workflow.body')}
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureCard
                icon={<Target className="w-6 h-6 text-blue-400" />}
                title={t('landing.feature.1.title')}
                description={t('landing.feature.1.body')}
              />
              <FeatureCard
                icon={<Layers className="w-6 h-6 text-amber-400" />}
                title={t('landing.feature.2.title')}
                description={t('landing.feature.2.body')}
              />
              <FeatureCard
                icon={<RefreshCw className="w-6 h-6 text-green-400" />}
                title={t('landing.feature.3.title')}
                description={t('landing.feature.3.body')}
              />
              <FeatureCard
                icon={<Activity className="w-6 h-6 text-red-400" />}
                title={t('landing.feature.4.title')}
                description={t('landing.feature.4.body')}
              />
            </div>
          </div>
        </section>
      </main>
      <AppFooter className="border-x border-[var(--border-color)]" />
    </div>
  );
}

function SignalCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-soft)] p-4">
      <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-2 font-mono text-lg uppercase tracking-tight text-[var(--text-primary)]">{value}</div>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{note}</p>
    </div>
  );
}

function SystemRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-soft)] p-4">
      <div className="text-xs font-mono uppercase tracking-[0.22em] text-[var(--text-primary)]">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}

function PrincipleCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-panel)]">
      <div className="font-mono text-lg font-semibold uppercase tracking-tight text-[var(--text-primary)]">{title}</div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-panel)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]">
        {icon}
      </div>
      <h3 className="font-mono text-lg font-semibold uppercase tracking-tight text-[var(--text-primary)]">{title}</h3>
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}
