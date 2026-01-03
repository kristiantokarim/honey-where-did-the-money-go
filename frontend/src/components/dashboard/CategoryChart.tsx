import { formatIDR } from '../../utils/format';
import type { DashboardItem } from '../../types';

interface CategoryChartProps {
  data: DashboardItem[];
  onCategoryClick?: (categoryName: string) => void;
}

export function CategoryChart({ data, onCategoryClick }: CategoryChartProps) {
  const total = data.reduce((sum, cat) => sum + cat.total, 0);

  if (data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6">
          By Category
        </h3>
        <p className="text-center text-slate-400 py-8">No data for this period</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
      <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6">
        By Category
      </h3>
      <div className="space-y-6">
        {data.map((cat) => {
          const percentage = total > 0 ? (cat.total / total) * 100 : 0;
          return (
            <div
              key={cat.name}
              onClick={() => onCategoryClick?.(cat.name)}
              className={onCategoryClick ? 'cursor-pointer hover:bg-slate-50 -mx-2 px-2 py-2 rounded-xl transition-colors active:scale-[0.99]' : ''}
            >
              <div className="flex justify-between text-[11px] font-black mb-2 uppercase tracking-wide">
                <span className="text-slate-600">{cat.name}</span>
                <span className="text-slate-400">{percentage.toFixed(1)}%</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-right text-[10px] font-mono font-bold text-slate-400 mt-1.5">
                {formatIDR(cat.total)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
