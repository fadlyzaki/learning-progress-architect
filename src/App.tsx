import { BrowserRouter as Router, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { getStoredSession } from './lib/auth';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { GoalsPage } from './pages/GoalsPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { SessionPage } from './pages/SessionPage';
import { ComprehensionPage } from './pages/ComprehensionPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { ProgressPage } from './pages/ProgressPage';
import { ReflectionsPage } from './pages/ReflectionsPage';
import { PreferencesProvider } from './lib/preferences';

function RequireAuth() {
  return getStoredSession() ? <Outlet /> : <Navigate to="/login" replace />;
}

function RedirectIfAuthenticated() {
  return getStoredSession() ? <Navigate to="/app" replace /> : <Outlet />;
}

export default function App() {
  return (
    <PreferencesProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route element={<RedirectIfAuthenticated />}>
            <Route path="/login" element={<AuthPage type="login" />} />
            <Route path="/signup" element={<AuthPage type="signup" />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route path="/onboarding" element={<OnboardingPage />} />

            <Route path="/app" element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="goals" element={<GoalsPage />} />
              <Route path="roadmap" element={<RoadmapPage />} />
              <Route path="session/:id" element={<SessionPage />} />
              <Route path="comprehension/:id" element={<ComprehensionPage />} />
              <Route path="reviews" element={<ReviewsPage />} />
              <Route path="progress" element={<ProgressPage />} />
              <Route path="reflections" element={<ReflectionsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </PreferencesProvider>
  );
}
