import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
  icon: Icon,
  iconColor = 'bg-indigo-600',
}) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative bg-white w-full sm:rounded-2xl shadow-2xl shadow-slate-900/20 max-h-[95dvh] overflow-y-auto',
          'border border-slate-900/[0.06] animate-scaleUp',
          'rounded-t-2xl sm:rounded-2xl',
          maxWidth
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0', iconColor)}>
                  <Icon className="h-4.5 w-4.5 text-white" size={18} />
                </div>
              )}
              <div>
                <h2 className="text-base font-bold text-slate-900">{title}</h2>
                {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex-shrink-0 ml-4"
            >
              <X className="h-4.5 w-4.5" size={18} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
