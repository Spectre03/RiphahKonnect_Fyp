import { cn } from '../../utils/cn';

const colorMap = {
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  slate: 'bg-slate-50 text-slate-600 border-slate-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const dotColors = {
  teal: 'bg-teal-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  slate: 'bg-slate-400',
  green: 'bg-emerald-500',
};

const sizeMap = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export default function Badge({
  children,
  variant = 'slate',
  size = 'sm',
  dot = false,
  className,
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full border',
        colorMap[variant],
        sizeMap[size],
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
}
