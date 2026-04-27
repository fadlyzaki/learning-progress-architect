import React from 'react';
import { AppFooter } from '../components/AppFooter';
import { useAppMeta } from '../components/AppMeta';
import { usePreferences } from '../lib/preferences';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function PrivacyPage() {
  const { t } = usePreferences();
  useAppMeta({
    title: 'Privacy Policy | ' + t('brand.product'),
    description: 'Privacy policy and data handling practices.',
  });

  return (
    <div className="app-shell min-h-screen font-sans selection:bg-amber-500/30">
      <header className="container mx-auto flex min-h-20 items-center justify-between border-b border-[var(--border-color)] px-6 py-5">
        <div className="flex flex-col">
          <span className="text-xs font-mono font-bold uppercase tracking-[0.28em] text-[var(--accent-amber)]">
            {t('brand.name')}
          </span>
          <span className="text-sm font-mono font-semibold uppercase tracking-[0.18em] text-[var(--text-primary)]">
            {t('brand.product')}
          </span>
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
              Privacy Policy
            </h1>
            <p className="mt-4 text-[var(--text-secondary)]">Last updated: April 2026</p>
          </div>

          <div className="prose prose-invert prose-amber max-w-none space-y-8 text-[var(--text-secondary)] prose-headings:font-mono prose-headings:uppercase prose-headings:text-[var(--text-primary)]">
            <p>
              The Autodidact Project operates the Learning Progress Architect web application. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.
            </p>

            <section>
              <h2>1. Information Collection and Use</h2>
              <p>We collect several different types of information for various purposes to provide and improve our Service to you:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Account Data:</strong> When you create an account, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you, such as your email address and name.</li>
                <li><strong>Learning Data:</strong> We store the goals, roadmaps, and reflections you generate to provide the core functionality of the learning system.</li>
                <li><strong>Google Calendar Integration:</strong> If you choose to enable Google Calendar Sync, we request access to manage your calendar events. We only write events related to your study sessions and do not read personal events outside of what this app creates. OAuth tokens are encrypted at rest.</li>
              </ul>
            </section>

            <section>
              <h2>2. Use of Data</h2>
              <p>The Autodidact Project uses the collected data for various purposes:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>To provide and maintain the Service</li>
                <li>To allow you to participate in interactive features of our Service when you choose to do so</li>
                <li>To provide customer care and support</li>
                <li>To monitor the usage of the Service</li>
                <li>To provide AI-generated insights and recommendations securely using language models</li>
              </ul>
            </section>

            <section>
              <h2>3. Data Security</h2>
              <p>
                The security of your data is important to us. We use standard security protocols including encryption for sensitive data like OAuth tokens. Remember that no method of transmission over the Internet, or method of electronic storage is 100% secure, but we strive to use commercially acceptable means to protect your Personal Data.
              </p>
            </section>

            <section>
              <h2>4. Third-Party Services</h2>
              <p>
                We may employ third-party companies and individuals to facilitate our Service ("Service Providers"), to provide the Service on our behalf, or to assist us in analyzing how our Service is used. This includes AI model providers (like Google's Gemini) used for generating roadmaps and quick actions. Data shared with these services is scoped strictly to the context needed to fulfill the request.
              </p>
            </section>

            <section>
              <h2>5. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us via the project repository or reach out to the project maintainers.
              </p>
            </section>
          </div>
        </div>
      </main>
      
      <AppFooter className="border-x border-[var(--border-color)]" />
    </div>
  );
}
