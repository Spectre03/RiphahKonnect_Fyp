import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/layout/Sidebar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import HomePage from './pages/HomePage';
import FeedPage from './pages/FeedPage';
import GroupsPage from './pages/GroupsPage';
import GroupDetailPage from './pages/GroupDetailPage';
import EventsPage from './pages/EventsPage';
import LostFoundPage from './pages/LostFoundPage';
import MessagingPage from './pages/MessagingPage';
import ProfilePage from './pages/ProfilePage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminGroupsPage from './pages/AdminGroupsPage';
import ResourcesPage from './pages/ResourcesPage';
import LandingPage from './pages/LandingPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});


function RequireRole({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/home" replace />;
  return children;
}

function AppLayout() {
  return (
    <ProtectedRoute>
      <div className="lg:flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-w-0 mt-14 lg:mt-0 min-h-screen overflow-x-hidden" style={{ background: '#f5f7ff', backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.04) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            {/* Root */}
            <Route path="/" element={<LandingPage />} />

            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected — all authenticated roles */}
            <Route element={<AppLayout />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/groups" element={<GroupsPage />} />
              <Route path="/groups/:id" element={<GroupDetailPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/lost-found" element={<LostFoundPage />} />
              <Route path="/messages" element={<MessagingPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/:id" element={<ProfilePage />} />
              <Route path="/announcements" element={<AnnouncementsPage />} />
              <Route path="/resources" element={<ResourcesPage />} />

              {/* System Admin only */}
              <Route
                path="/admin"
                element={
                  <RequireRole roles={['SYSTEM_ADMIN']}>
                    <AdminDashboardPage />
                  </RequireRole>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <RequireRole roles={['SYSTEM_ADMIN']}>
                    <AdminUsersPage />
                  </RequireRole>
                }
              />
              <Route
                path="/admin/groups"
                element={
                  <RequireRole roles={['SYSTEM_ADMIN']}>
                    <AdminGroupsPage />
                  </RequireRole>
                }
              />
            </Route>
          </Routes>

          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#ffffff',
                color: '#1e293b',
                border: '1px solid #e2e8f0',
                fontSize: '13px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              },
              success: { iconTheme: { primary: '#0d9488', secondary: '#ffffff' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
