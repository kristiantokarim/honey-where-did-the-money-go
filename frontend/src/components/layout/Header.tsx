import { useAppContext } from '../../context/AppContext';

export function Header() {
  const { config, defaultUser, setDefaultUser } = useAppContext();

  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex justify-between items-center shadow-sm">
      <h1 className="text-xl font-black text-blue-600 tracking-tight">EXP_PRO</h1>
      <select
        className="bg-slate-100 text-xs font-bold px-3 py-1.5 rounded-xl border-none outline-none text-slate-600 min-h-[44px]"
        value={defaultUser}
        onChange={(e) => setDefaultUser(e.target.value)}
      >
        {config?.users.map((user) => (
          <option key={user} value={user}>
            👤 {user}
          </option>
        ))}
      </select>
    </nav>
  );
}
