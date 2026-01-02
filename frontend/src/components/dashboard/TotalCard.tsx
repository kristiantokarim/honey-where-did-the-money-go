import { formatIDR } from '../../utils/format';

interface TotalCardProps {
  total: number;
}

export function TotalCard({ total }: TotalCardProps) {
  return (
    <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-100">
      <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">
        Total Spending
      </p>
      <h2 className="text-3xl font-black tracking-tighter">{formatIDR(total)}</h2>
    </div>
  );
}
