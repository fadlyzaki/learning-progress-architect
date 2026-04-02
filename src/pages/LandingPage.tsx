import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Target, Layers, RefreshCw, Activity } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950/80 text-zinc-100 font-sans selection:bg-amber-500/30">
      <header className="container mx-auto px-6 h-20 flex items-center justify-between border-b border-zinc-800/50">
        <div className="flex flex-col">
          <span className="font-mono font-bold tracking-[0.28em] uppercase text-amber-500 text-xs">
            Fadlyzaki
          </span>
          <span className="font-mono font-semibold tracking-[0.18em] uppercase text-zinc-100 text-sm">
            Learning Progress Architect
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <a href="#principles" className="hover:text-zinc-100 transition-colors">Principles</a>
          <a href="#features" className="hover:text-zinc-100 transition-colors">Features</a>
          <Link to="/login" className="hover:text-zinc-100 transition-colors">Sign in</Link>
          <Link to="/signup">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white">
              Start Learning
            </Button>
          </Link>
        </nav>
      </header>

      <main>
        <section className="container mx-auto px-6 py-24 md:py-32 lg:py-36 border-x border-zinc-800/40">
          <div className="max-w-5xl mx-auto grid gap-14 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div className="flex flex-col items-start text-left">
              <div className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 mb-8">
                Human By Design
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-mono uppercase tracking-tight font-bold max-w-4xl text-zinc-100 leading-tight">
                Software logic meets human intuition.
              </h1>
              <p className="mt-6 text-lg md:text-xl text-zinc-400 max-w-2xl font-serif italic">
                Learning Progress Architect is my exploration of resilient workflows that tame complexity and free up mental bandwidth when it matters most.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link to="/signup">
                  <Button size="lg" variant="accent" className="w-full sm:w-auto font-mono uppercase tracking-wider">
                    Build my learning plan
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto font-mono uppercase tracking-wider">
                    See today&apos;s next step
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/70 p-6 md:p-8">
              <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-zinc-500">Design Philosophy</div>
              <div className="mt-4 space-y-4">
                <blockquote className="border-l border-amber-500/50 pl-4 text-zinc-200 font-serif italic leading-relaxed">
                  I build resilient tools that respect cognitive bandwidth. When you&apos;re at your limit, you don&apos;t need clever design. You need systems that scaffold intent.
                </blockquote>
                <div className="grid gap-3">
                  <ValueChip label="Resilience over optimization" />
                  <ValueChip label="Built for humans at their limit" />
                  <ValueChip label="Tame complexity" />
                  <ValueChip label="Free up mental bandwidth" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="principles" className="border-t border-zinc-800/50 bg-zinc-900/10 py-20">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto">
              <div className="mb-10">
                <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-amber-500 mb-3">
                  Why This Exists
                </div>
                <h2 className="font-mono uppercase tracking-tight text-3xl text-zinc-100">
                  Resilient tools for learners under real cognitive load
                </h2>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <PrincipleCard
                  title="Contain Chaos"
                  description="The interface should absorb complexity before it reaches the learner."
                />
                <PrincipleCard
                  title="Respect Bandwidth"
                  description="Every screen should make the next action obvious without demanding extra mental effort."
                />
                <PrincipleCard
                  title="Scaffold Agency"
                  description="Progress, reflection, and reviews should support confidence, not perform productivity."
                />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-zinc-800/50 bg-zinc-900/20 py-24">
          <div className="container mx-auto px-6">
            <div className="max-w-5xl mx-auto mb-10">
              <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-zinc-500 mb-3">
                Product System
              </div>
              <h2 className="font-mono uppercase tracking-tight text-3xl text-zinc-100">
                A learning workflow designed to just work
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
              <FeatureCard 
                icon={<Target className="w-6 h-6 text-blue-400" />}
                title="Goal Architect"
                description="Turns vague goals into structured learning plans that reduce ambiguity from the first step."
              />
              <FeatureCard 
                icon={<Layers className="w-6 h-6 text-amber-400" />}
                title="Knowledge Mapper"
                description="Breaks complexity into a sequence that a real learner can actually follow."
              />
              <FeatureCard 
                icon={<RefreshCw className="w-6 h-6 text-green-400" />}
                title="Memory Reinforcement"
                description="Schedules reviews from confidence so weak material returns before it disappears."
              />
              <FeatureCard 
                icon={<Activity className="w-6 h-6 text-red-400" />}
                title="Friction Detector"
                description="Captures blockers and confusion so the system reflects where learning actually broke down."
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ValueChip({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs font-mono uppercase tracking-[0.18em] text-zinc-300">
      {label}
    </div>
  );
}

function PrincipleCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/60 p-6">
      <div className="font-mono text-lg font-semibold uppercase tracking-tight text-zinc-100">{title}</div>
      <p className="text-zinc-400 text-sm leading-relaxed mt-3">{description}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="font-mono text-lg font-semibold uppercase tracking-tight text-zinc-100">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
