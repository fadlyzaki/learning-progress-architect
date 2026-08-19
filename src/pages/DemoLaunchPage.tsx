import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { startDemoSession } from '../lib/auth';
import { PageLoadingState } from '../components/PageStates';

export function DemoLaunchPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    startDemoSession(false)
      .then(() => {
        if (active) {
          navigate('/app', { replace: true });
        }
      })
      .catch((err) => {
        if (active) {
          console.error('Failed to launch demo session:', err);
          navigate('/login', { replace: true });
        }
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6 app-shell">
      <PageLoadingState variant="dashboard" rows={2} />
    </div>
  );
}
