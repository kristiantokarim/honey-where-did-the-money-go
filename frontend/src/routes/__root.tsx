import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Header } from '../components/layout/Header';
import { TabNav } from '../components/layout/TabNav';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
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
