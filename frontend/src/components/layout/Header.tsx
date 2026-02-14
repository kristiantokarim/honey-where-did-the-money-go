import { useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useScanSession } from '../../context/ScanSessionContext';
import { useHousehold } from '../../context/HouseholdContext';

export function Header() {
  const navigate = useNavigate();
  const { step, session } = useScanSession();
  const { households, activeHouseholdId } = useHousehold();
  const activeHousehold = households.find((h) => h.id === activeHouseholdId);

  const isProcessing = step === 'uploading' || step === 'parsing';
  const progressMessage = step === 'uploading'
    ? 'Uploading...'
    : step === 'parsing' && session
      ? `Parsing ${session.parsedPages}/${session.totalPages}...`
      : '';

  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex justify-center items-center shadow-sm">
      <div className="flex flex-col items-center">
        <h1 className="text-xl font-black text-blue-600 tracking-tight">HONEY WHERE DID THE MONEY GO</h1>
        {activeHousehold && (
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{activeHousehold.name}</span>
        )}
      </div>

      {isProcessing && (
        <button
          onClick={() => navigate({ to: '/scan' })}
          className="absolute right-4 flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-xs font-bold animate-pulse"
        >
          <Loader2 size={14} className="animate-spin" />
          {progressMessage}
        </button>
      )}
    </nav>
  );
}
