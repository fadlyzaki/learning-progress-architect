import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { setStoredSession } from '../lib/auth';
import type { AuthSession } from '../types';
import { PreferenceControls } from '../components/PreferenceControls';
import { usePreferences } from '../lib/preferences';

export function AuthPage({ type }: { type: 'login' | 'signup' }) {
  const navigate = useNavigate();
  const { t } = usePreferences();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(type === 'signup' ? '/api/auth/signup' : '/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const payload = (await response.json()) as AuthSession | { error: string };
      if (!response.ok || !('token' in payload)) {
        throw new Error('error' in payload ? payload.error : 'Authentication failed.');
      }

      setStoredSession(payload);
      navigate(type === 'signup' ? '/onboarding' : '/app', { replace: true });
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-shell flex min-h-screen flex-col items-center justify-center gap-6 p-4 font-sans">
      <PreferenceControls />
      <Card className="w-full max-w-md bg-[var(--bg-panel)] shadow-[var(--shadow-panel)]">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="mx-auto flex flex-col">
            <span className="text-xs font-mono font-bold uppercase tracking-[0.28em] text-[var(--accent-amber)]">
              {t('brand.name')}
            </span>
            <span className="text-sm font-mono font-semibold uppercase tracking-[0.18em] text-[var(--text-primary)]">
              {t('brand.product')}
            </span>
          </div>
          <CardTitle className="text-2xl font-mono uppercase tracking-tight">
            {type === 'login' ? t('auth.login.title') : t('auth.signup.title')}
          </CardTitle>
          <CardDescription className="font-serif italic text-[var(--text-secondary)]">
            {type === 'login'
              ? t('auth.login.subtitle')
              : t('auth.signup.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {type === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name">{t('auth.name')}</Label>
                <Input
                  id="name"
                  placeholder={t('auth.namePlaceholder')}
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.emailPlaceholder')}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-900/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="accent"
              className="w-full font-mono uppercase tracking-wider"
              disabled={submitting}
            >
              {submitting
                ? t('auth.working')
                : type === 'login'
                  ? t('auth.loginSubmit')
                  : t('auth.signupSubmit')}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-[var(--text-muted)]">
            {type === 'login' ? (
              <p>
                {t('auth.loginAlt')}{' '}
                <Link to="/signup" className="text-amber-500 hover:underline">
                  {t('auth.signUp')}
                </Link>
              </p>
            ) : (
              <p>
                {t('auth.signupAlt')}{' '}
                <Link to="/login" className="text-amber-500 hover:underline">
                  {t('auth.signIn')}
                </Link>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
