import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppMeta } from '../components/AppMeta';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { AppFooter } from '../components/AppFooter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { setStoredSession } from '../lib/auth';
import { ApiError, apiFetch } from '../lib/api';
import type { AuthSession } from '../types';
import { InlineStateMessage } from '../components/PageStates';
import { PreferenceControls } from '../components/PreferenceControls';
import { DeveloperBrand } from '../components/DeveloperBrand';
import { usePreferences } from '../lib/preferences';

export function AuthPage({ type }: { type: 'login' | 'signup' }) {
  const navigate = useNavigate();
  const { t } = usePreferences();
  useAppMeta({
    title: type === 'login' ? t('auth.signIn') : t('auth.signUp'),
    description: type === 'login' ? t('auth.login.subtitle') : t('auth.signup.subtitle'),
  });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldError(null);

    if (type === 'signup' && !name.trim()) {
      setFieldError(t('auth.name'));
      setSubmitting(false);
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setFieldError(t('auth.email'));
      setSubmitting(false);
      return;
    }

    if (password.length < 8) {
      setFieldError(t('auth.password'));
      setSubmitting(false);
      return;
    }

    try {
      const payload = await apiFetch<AuthSession>(type === 'signup' ? '/api/auth/signup' : '/api/auth/login', {
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

      setStoredSession(payload);
      navigate(type === 'signup' ? '/onboarding' : '/app', { replace: true });
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof ApiError ? submitError.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-shell flex min-h-screen flex-col justify-between gap-8 p-4 font-sans">
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <PreferenceControls />
        <Card className="w-full max-w-md bg-[var(--bg-panel)] shadow-[var(--shadow-panel)]">
          <CardHeader className="space-y-4 pb-8 text-center">
            <div className="mx-auto flex flex-col items-center">
              <img src="/lia-logo.png" alt="Logo" className="mb-4 h-16 w-16 object-contain" />
              <span className="text-xl font-mono font-semibold uppercase tracking-[0.18em] text-[var(--text-primary)]">
                {t('brand.name')}
              </span>
              <DeveloperBrand className="text-sm font-mono font-bold uppercase tracking-[0.28em] text-[var(--accent-amber)] mt-1" />
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
              {fieldError && (
                <InlineStateMessage title={fieldError} tone="warning" />
              )}
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
                <InlineStateMessage title={error} tone="danger" />
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
      <AppFooter />
    </div>
  );
}
