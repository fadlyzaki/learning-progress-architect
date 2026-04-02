import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { setStoredSession } from '../lib/auth';
import type { AuthSession } from '../types';

export function AuthPage({ type }: { type: 'login' | 'signup' }) {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans">
      <Card className="w-full max-w-md bg-zinc-900/80 border-zinc-800 shadow-2xl">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="font-mono font-bold tracking-widest uppercase text-amber-500 mx-auto">
            Architect
          </div>
          <CardTitle className="text-2xl font-mono uppercase tracking-tight">
            {type === 'login' ? 'Welcome back' : 'Create your plan'}
          </CardTitle>
          <CardDescription className="font-serif italic text-zinc-400">
            {type === 'login'
              ? 'Continue where you left off.'
              : 'Create a private workspace for your learning plan.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {type === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Alex"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="alex@example.com"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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
              {submitting ? 'Working...' : type === 'login' ? 'Sign In' : 'Continue'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-zinc-500">
            {type === 'login' ? (
              <p>
                Don&apos;t have an account?{' '}
                <Link to="/signup" className="text-amber-500 hover:underline">
                  Sign up
                </Link>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <Link to="/login" className="text-amber-500 hover:underline">
                  Sign in
                </Link>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
