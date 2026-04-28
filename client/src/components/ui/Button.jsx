import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const variants = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-500/25 hover:shadow-md hover:shadow-indigo-500/30 active:scale-[0.98]',
  secondary:
    'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 active:scale-[0.98]',
  teal:
    'bg-teal-600 text-white hover:bg-teal-700 shadow-sm shadow-teal-500/25 hover:shadow-md hover:shadow-teal-500/30 active:scale-[0.98]',
  danger:
    'bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-500/20 active:scale-[0.98]',
  'danger-soft':
    'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 active:scale-[0.98]',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98]',
  'ghost-brand':
    'text-indigo-600 hover:bg-indigo-50 active:scale-[0.98]',
  gradient:
    'gradient-brand text-white hover:opacity-90 shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98]',
};

const sizes = {
  xs: 'px-2.5 py-1.5 text-xs gap-1 rounded-lg',
  sm: 'px-3.5 py-2 text-xs gap-1.5 rounded-xl',
  md: 'px-4 py-2.5 text-sm gap-2 rounded-xl',
  lg: 'px-5 py-3 text-sm gap-2 rounded-xl',
  xl: 'px-6 py-3.5 text-base gap-2.5 rounded-2xl',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconRight: IconRight,
  className,
  ...rest
}) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-150 cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : Icon ? (
        <Icon className="h-4 w-4 flex-shrink-0" />
      ) : null}
      {children && <span>{children}</span>}
      {!loading && IconRight && <IconRight className="h-4 w-4 flex-shrink-0" />}
    </button>
  );
}
