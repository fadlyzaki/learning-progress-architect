import React from 'react';
import { AppFooter } from '../components/AppFooter';
import { useAppMeta } from '../components/AppMeta';
import { usePreferences } from '../lib/preferences';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function TermsPage() {
  const { t } = usePreferences();
  useAppMeta({
    title: 'Terms of Service | ' + t('brand.name'),
    description: 'Terms of Service and Usage Conditions.',
  });

  return (
    <div className="app-shell min-h-screen font-sans selection:bg-amber-500/30">
      <header className="container mx-auto flex min-h-20 items-center justify-between border-b border-[var(--border-color)] px-6 py-5">
        <div className="flex items-center gap-4">
          <img src="/lia-logo.png" alt="Logo" className="h-8 w-8 object-contain" />
          <div className="flex flex-col">
            <span className="text-sm font-mono font-semibold uppercase tracking-[0.18em] text-[var(--text-primary)]">
              {t('brand.name')}
            </span>
            <span className="text-xs font-mono font-bold uppercase tracking-[0.28em] text-[var(--accent-amber)] mt-0.5">
              {t('brand.developer')}
            </span>
          </div>
        </div>
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </header>

      <main className="container mx-auto border-x border-[var(--border-color)] px-6 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12">
            <h1 className="text-3xl font-mono font-bold uppercase tracking-tight text-[var(--text-primary)] md:text-5xl">
              Terms of Service
            </h1>
            <p className="mt-4 text-[var(--text-secondary)]">Last updated: April 2026</p>
          </div>

          <div className="prose prose-invert prose-amber max-w-none space-y-8 text-[var(--text-secondary)] prose-headings:font-mono prose-headings:uppercase prose-headings:text-[var(--text-primary)]">
            <p>
              Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the Learning Progress Architect website and application operated by The Autodidact Project.
            </p>

            <section>
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.
              </p>
            </section>

            <section>
              <h2>2. Accounts</h2>
              <p>
                When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service. You are responsible for safeguarding the password that you use to access the Service.
              </p>
            </section>

            <section>
              <h2>3. Content & Fair Use</h2>
              <p>
                Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content"). You are responsible for the Content that you post to the Service. The Service heavily utilizes AI to generate structural roadmaps; you agree not to abuse or intentionally overwhelm the automated generation endpoints.
              </p>
            </section>

            <section>
              <h2>4. Intellectual Property</h2>
              <p>
                The Service and its original content (excluding Content provided by users), features and functionality are and will remain the exclusive property of The Autodidact Project and its licensors. The Service is protected by copyright, trademark, and other laws.
              </p>
            </section>

            <section>
              <h2>5. Links To Other Web Sites</h2>
              <p>
                Our Service may contain links to third-party web sites or services that are not owned or controlled by The Autodidact Project. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third party web sites or services.
              </p>
            </section>

            <section>
              <h2>6. Limitation of Liability</h2>
              <p>
                In no event shall The Autodidact Project, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
              </p>
            </section>

            <section>
              <h2>7. Changes</h2>
              <p>
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
              </p>
            </section>
          </div>
        </div>
      </main>
      
      <AppFooter className="border-x border-[var(--border-color)]" />
    </div>
  );
}
