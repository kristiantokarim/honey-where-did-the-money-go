import { Link, useLocation } from '@tanstack/react-router';
import { ScanLine, LayoutList, PieChart, Settings } from 'lucide-react';

const tabs = [
  { path: '/scan', label: 'Scan', icon: ScanLine },
  { path: '/ledger', label: 'Ledger', icon: LayoutList },
  { path: '/dashboard', label: 'Dash', icon: PieChart },
  { path: '/settings', label: 'Settings', icon: Settings },
] as const;

export function TabNav() {
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 pb-10 pt-3 px-8 z-50">
      <div className="max-w-lg mx-auto flex justify-between">
        {tabs.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center transition-all min-w-[60px] min-h-[44px] justify-center ${
                isActive ? 'text-blue-600' : 'text-slate-300'
              }`}
            >
              <Icon size={24} />
              <span className="text-[9px] font-black mt-1 uppercase">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
