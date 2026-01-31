import { Upload, FileText, CheckCircle, Loader2 } from 'lucide-react';

interface UploadProgressProps {
  step: string;
  message: string;
}

const STEPS = [
  { key: 'uploading', label: 'Uploading', icon: Upload },
  { key: 'extracting', label: 'Processing', icon: FileText },
];

export function UploadProgress({ step, message }: UploadProgressProps) {
  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-white rounded-3xl p-8 shadow-lg border border-slate-100 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Loader2 size={32} className="text-blue-600 animate-spin" />
            </div>
          </div>
          <p className="mt-4 text-lg font-bold text-slate-800">{message}</p>
          <p className="text-sm text-slate-400 mt-1">This may take a moment...</p>
        </div>

        <div className="space-y-3">
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            const isActive = s.key === step;
            const isCompleted = index < currentStepIndex;

            return (
              <div
                key={s.key}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-blue-50 border border-blue-200'
                    : isCompleted
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-slate-50 border border-transparent'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {isActive ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : isCompleted ? (
                    <CheckCircle size={16} />
                  ) : (
                    <Icon size={16} />
                  )}
                </div>
                <span
                  className={`font-semibold text-sm ${
                    isActive
                      ? 'text-blue-700'
                      : isCompleted
                      ? 'text-green-700'
                      : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
