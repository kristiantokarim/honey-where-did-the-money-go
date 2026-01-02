import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const styles = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-blue-600',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={`${styles[toast.type]} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-up`}
          >
            <Icon size={20} className="flex-shrink-0" />
            <span className="flex-1 font-medium text-sm">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-white/20 rounded-lg"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
