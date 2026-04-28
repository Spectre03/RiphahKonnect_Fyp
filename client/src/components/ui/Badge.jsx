import { cn } from '../../utils/cn';

const colorMap = {
  indigo:   'bg-indigo-50  text-indigo-700  border-indigo-200/60',
  brand:    'bg-indigo-50  text-indigo-700  border-indigo-200/60',
  teal:     'bg-teal-50    text-teal-700    border-teal-200/60',
  blue:     'bg-blue-50    text-blue-700    border-blue-200/60',
  purple:   'bg-purple-50  text-purple-700  border-purple-200/60',
  violet:   'bg-violet-50  text-violet-700  border-violet-200/60',
  amber:    'bg-amber-50   text-amber-700   border-amber-200/60',
  orange:   'bg-orange-50  text-orange-700  border-orange-200/60',
  red:      'bg-red-50     text-red-600     border-red-200/60',
  rose:     'bg-rose-50    text-rose-600    border-rose-200/60',
  green:    'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  emerald:  'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  slate:    'bg-slate-100  text-slate-600   border-slate-200/60',
  cyan:     'bg-cyan-50    text-cyan-700    border-cyan-200/60',
};

const dotColors = {
  indigo:  'bg-indigo-500',
  brand:   'bg-indigo-500',
  teal:    'bg-teal-500',
  blue:    'bg-blue-500',
  purple:  'bg-purple-500',
  violet:  'bg-violet-500',
  amber:   'bg-amber-500',
  orange:  'bg-orange-500',
  red:     'bg-red-500',
  rose:    'bg-rose-500',
  green:   'bg-emerald-500',
  emerald: 'bg-emerald-500',
  slate:   'bg-slate-400',
  cyan:    'bg-cyan-500',
};

const sizeMap = {
  xs: 'px-1.5 py-0.5 text-[10px] gap-1',
  sm: 'px-2 py-0.5 text-[11px] gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
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
        'inline-flex items-center font-semibold rounded-full border',
        colorMap[variant] || colorMap.slate,
        sizeMap[size] || sizeMap.sm,
        className
      )}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', dotColors[variant] || dotColors.slate)} />
      )}
      {children}
    </span>
  );
}
