import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Target, Layers, RefreshCw, Activity } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500/30">
      <header className="container mx-auto px-6 h-20 flex items-center justify-between border-b border-zinc-800/50">
        <div className="font-mono font-bold tracking-widest uppercase text-amber-500">
          Architect
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <a href="#how-it-works" className="hover:text-zinc-100 transition-colors">How it works</a>
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
        {/* Hero Section */}
        <section className="container mx-auto px-6 py-24 md:py-32 lg:py-40 flex flex-col items-center text-center">
          <div className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 mb-8">
            Human By Design.
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-mono uppercase tracking-tight font-bold max-w-4xl text-zinc-100 leading-tight">
            Turn any learning goal into a clear next step.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-zinc-400 max-w-2xl font-serif italic">
            A multi-agent learning operating system that converts vague goals into clear roadmaps, adaptive sessions, and recoverable progress.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link to="/signup">
              <Button size="lg" variant="accent" className="w-full sm:w-auto font-mono uppercase tracking-wider">
                Build my learning plan
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto font-mono uppercase tracking-wider">
                See today's next step
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="border-t border-zinc-800/50 bg-zinc-900/20 py-24">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
              <FeatureCard 
                icon={<Target className="w-6 h-6 text-blue-400" />}
                title="Goal Architect"
                description="Turns vague goals into structured learning plans and actionable roadmaps."
              />
              <FeatureCard 
                icon={<Layers className="w-6 h-6 text-amber-400" />}
                title="Knowledge Mapper"
                description="Breaks topics into subtopics, prerequisites, and dependencies."
              />
              <FeatureCard 
                icon={<RefreshCw className="w-6 h-6 text-green-400" />}
                title="Memory Reinforcement"
                description="Schedules reviews and spaced repetition based on comprehension."
              />
              <FeatureCard 
                icon={<Activity className="w-6 h-6 text-red-400" />}
                title="Friction Detector"
                description="Detects drift and triggers recovery mode to restore context instantly."
              />
            </div>
          </div>
        </section>
      </main>
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
