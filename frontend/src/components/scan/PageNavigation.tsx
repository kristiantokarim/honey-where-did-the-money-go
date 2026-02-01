import { CheckCircle, Circle, Loader2, AlertCircle } from 'lucide-react';
import type { PageStatus } from '../../types';
import { ParseStatus, ReviewStatus } from '../../types/enums';

interface PageNavigationProps {
  pages: PageStatus[];
  currentPageIndex: number;
  totalPages: number;
  parsedPages: number;
  defaultUser: string;
}

export function PageNavigation({
  pages,
  currentPageIndex,
  totalPages,
  parsedPages,
  defaultUser,
}: PageNavigationProps) {
  const getPageIcon = (page: PageStatus, index: number) => {
    if (page.reviewStatus === ReviewStatus.Confirmed) {
      return <CheckCircle size={16} className="text-green-500" />;
    }
    if (page.parseStatus === ParseStatus.Failed) {
      return <AlertCircle size={16} className="text-red-500" />;
    }
    if (
      page.parseStatus === ParseStatus.Pending ||
      page.parseStatus === ParseStatus.Processing
    ) {
      return <Loader2 size={16} className="text-blue-500 animate-spin" />;
    }
    if (index === currentPageIndex) {
      return <Circle size={16} className="text-blue-500 fill-blue-500" />;
    }
    return <Circle size={16} className="text-slate-300" />;
  };

  const allParsed = parsedPages === totalPages;
  const progressPercent = Math.round((parsedPages / totalPages) * 100);

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold text-slate-600">
          Page {currentPageIndex + 1} of {totalPages}
        </span>
        <span className="text-xs text-slate-500">
          {!allParsed
            ? `Parsing: ${parsedPages}/${totalPages} (${progressPercent}%)`
            : `Recording as: ${defaultUser}`}
        </span>
      </div>

      {!allParsed && (
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      <div className="flex items-center justify-center gap-3 flex-wrap">
        {pages.map((page, index) => (
          <div key={index} className="flex flex-col items-center gap-1">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                index === currentPageIndex
                  ? 'bg-blue-50 ring-2 ring-blue-500'
                  : page.reviewStatus === ReviewStatus.Confirmed
                    ? 'bg-green-50'
                    : page.parseStatus === ParseStatus.Failed
                      ? 'bg-red-50'
                      : 'bg-slate-50'
              }`}
              title={`Page ${index + 1}: ${page.parseStatus}${page.appType ? ` (${page.appType})` : ''}`}
            >
              {getPageIcon(page, index)}
            </div>
            {page.appType && page.parseStatus === ParseStatus.Completed && (
              <span className="text-[10px] text-slate-500 font-medium">
                {page.appType}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
