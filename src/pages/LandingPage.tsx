import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Activity, 
  Layers, 
  RefreshCw, 
  Target, 
  Brain, 
  Layout, 
  HeartHandshake, 
  Compass, 
  Zap, 
  TrendingUp, 
  GraduationCap, 
  User, 
  Briefcase,
  Quote,
  FileText,
  CheckSquare,
  BarChart,
  Bot,
  Sparkles,
  Loader2
} from 'lucide-react';
import { AppFooter } from '../components/AppFooter';
import { DeveloperBrand } from '../components/DeveloperBrand';
import { useAppMeta } from '../components/AppMeta';
import { Button } from '../components/ui/Button';
import { PreferenceControls } from '../components/PreferenceControls';
import { usePreferences } from '../lib/preferences';
import { startDemoSession } from '../lib/auth';

export function LandingPage() {
  const { t } = usePreferences();
  const navigate = useNavigate();
  const [startingDemo, setStartingDemo] = useState(false);

  useAppMeta({
    title: 'Learning Progress Architect',
    description:
      'A calmer learning workspace that turns complex goals into structured roadmaps, focused study sessions, reviews, and reflection.',
  });

  const handleStartDemo = async () => {
    try {
      setStartingDemo(true);
      await startDemoSession(false);
      navigate('/app');
    } catch (err) {
      console.error('Failed to launch demo:', err);
    } finally {
      setStartingDemo(false);
    }
  };

  return (
    <div className="app-shell min-h-screen font-sans selection:bg-amber-500/30">
      <header className="container mx-auto flex min-h-20 flex-col gap-4 border-b border-[var(--border-color)] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <img src="/lia-logo.png" alt="Logo" className="h-10 w-10 object-contain" />
          <div className="flex flex-col">
            <span className="text-sm font-mono font-semibold uppercase tracking-[0.18em] text-[var(--text-primary)]">
              {t('brand.name')}
            </span>
            <DeveloperBrand className="text-xs font-mono font-bold uppercase tracking-[0.28em] text-[var(--accent-amber)] mt-0.5" />
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:items-end">
          <PreferenceControls />
          <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--text-secondary)] md:flex">
          <a href="#principles" className="transition-colors hover:text-[var(--text-primary)]">
            {t('landing.navPrinciples')}
          </a>
          <a href="#workflow" className="transition-colors hover:text-[var(--text-primary)]">
            {t('landing.navWorkflow')}
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartDemo}
            disabled={startingDemo}
            className="font-mono text-xs uppercase tracking-wider text-[var(--accent-amber)] hover:bg-amber-500/10 hover:text-amber-400 gap-1.5"
          >
            {startingDemo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-amber-400" />}
            {t('landing.tryDemo')}
          </Button>
          <Link to="/login" className="transition-colors hover:text-[var(--text-primary)]">
            {t('landing.navSignIn')}
          </Link>
          <Link to="/signup">
            <Button variant="outline" size="sm">
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
              <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="accent"
                  onClick={handleStartDemo}
                  disabled={startingDemo}
                  className="w-full sm:w-auto font-mono uppercase tracking-wider gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-[0_0_24px_rgba(245,158,11,0.25)]"
                >
                  {startingDemo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 fill-current" />}
                  {t('landing.tryDemo')}
                </Button>
                <Link to="/signup" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto font-mono uppercase tracking-wider">
                    {t('landing.ctaPrimary')}
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button size="lg" variant="ghost" className="w-full sm:w-auto font-mono uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    {t('landing.ctaSecondary')}
                  </Button>
                </Link>
              </div>

              <div className="mt-12 grid sm:grid-cols-3 gap-4 w-full max-w-3xl">
                <SignalCard
                  icon={<Compass className="w-4 h-4 text-blue-400" />}
                  label={t('landing.signal.goal.label')}
                  value={t('landing.signal.goal.value')}
                  note={t('landing.signal.goal.note')}
                />
                <SignalCard
                  icon={<Zap className="w-4 h-4 text-amber-400" />}
                  label={t('landing.signal.session.label')}
                  value={t('landing.signal.session.value')}
                  note={t('landing.signal.session.note')}
                />
                <SignalCard
                  icon={<TrendingUp className="w-4 h-4 text-green-400" />}
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
                  icon={<FileText className="w-4 h-4 text-blue-400" />}
                  title={t('landing.system.1.title')}
                  body={t('landing.system.1.body')}
                />
                <SystemRow
                  icon={<CheckSquare className="w-4 h-4 text-amber-400" />}
                  title={t('landing.system.2.title')}
                  body={t('landing.system.2.body')}
                />
                <SystemRow
                  icon={<BarChart className="w-4 h-4 text-green-400" />}
                  title={t('landing.system.3.title')}
                  body={t('landing.system.3.body')}
                />
                <SystemRow
                  icon={<Bot className="w-4 h-4 text-purple-400" />}
                  title={t('landing.agentTitle')}
                  body={t('landing.agentBody')}
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
                  icon={<Brain className="w-6 h-6 text-purple-400" />}
                  title={t('landing.principle.1.title')}
                  description={t('landing.principle.1.body')}
                />
                <PrincipleCard
                  icon={<Layout className="w-6 h-6 text-blue-400" />}
                  title={t('landing.principle.2.title')}
                  description={t('landing.principle.2.body')}
                />
                <PrincipleCard
                  icon={<HeartHandshake className="w-6 h-6 text-rose-400" />}
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
        <section className="border-t border-[var(--border-color)] bg-[var(--bg-panel)]/40 py-24">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto mb-12 text-center">
              <h2 className="text-3xl font-mono uppercase tracking-tight text-[var(--text-primary)] md:text-4xl">
                {t('landing.trust.title')}
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <TestimonialCard
                icon={<GraduationCap className="w-6 h-6 text-blue-400" />}
                role={t('landing.trust.user1.role')}
                quote={t('landing.trust.user1.quote')}
              />
              <TestimonialCard
                icon={<User className="w-6 h-6 text-amber-400" />}
                role={t('landing.trust.user2.role')}
                quote={t('landing.trust.user2.quote')}
              />
              <TestimonialCard
                icon={<Briefcase className="w-6 h-6 text-green-400" />}
                role={t('landing.trust.user3.role')}
                quote={t('landing.trust.user3.quote')}
              />
            </div>
          </div>
        </section>
      </main>
      <AppFooter className="border-x border-[var(--border-color)]" />
    </div>
  );
}

function SignalCard({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-soft)] p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
          {icon}
        </div>
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--text-muted)]">{label}</div>
      </div>
      <div className="font-mono text-lg uppercase tracking-tight text-[var(--text-primary)]">{value}</div>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{note}</p>
    </div>
  );
}

function SystemRow({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-soft)] p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
          {icon}
        </div>
        <div className="text-xs font-mono uppercase tracking-[0.22em] text-[var(--text-primary)]">{title}</div>
      </div>
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}

function PrincipleCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-panel)]">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]">
        {icon}
      </div>
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

function TestimonialCard({ icon, role, quote }: { icon: React.ReactNode; role: string; quote: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 shadow-[var(--shadow-panel)] relative overflow-hidden">
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
      <div className="flex items-center justify-between mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)]">
          {icon}
        </div>
        <Quote className="h-8 w-8 text-[var(--border-color)] opacity-20" />
      </div>
      <p className="text-lg italic leading-relaxed text-[var(--text-primary)] relative z-10">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="mt-auto pt-4 border-t border-[var(--border-color)]/30">
        <div className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[var(--accent-amber)]">
          {role}
        </div>
      </div>
    </div>
  );
}
