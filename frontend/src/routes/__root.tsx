import { createRootRoute, Outlet, useNavigate, useLocation } from '@tanstack/react-router';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { Header } from '../components/layout/Header';
import { TabNav } from '../components/layout/TabNav';

export const Route = createRootRoute({
  component: RootComponent,
});

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/accept-invitation'];

function RootComponent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { activeHouseholdId, isLoading: householdLoading } = useHousehold();
  const navigate = useNavigate();
  const location = useLocation();

  const isPublicRoute = PUBLIC_ROUTES.some((r) => location.pathname.startsWith(r));

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FD] flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (isPublicRoute) {
    return <Outlet />;
  }

  if (!isAuthenticated) {
    navigate({ to: '/login' });
    return null;
  }

  if (householdLoading || !activeHouseholdId) {
    return (
      <div className="min-h-screen bg-[#F8F9FD] flex items-center justify-center">
        <div className="text-slate-500">Loading household...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-slate-900 font-sans">
      <Header />
      <main className="max-w-lg mx-auto p-4 pb-32">
        <Outlet />
      </main>
      <TabNav />
    </div>
  );
}
