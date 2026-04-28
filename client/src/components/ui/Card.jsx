import { cn } from '../../utils/cn';

export default function Card({
  children,
  className,
  hover = false,
  padding = 'p-5',
  accent,
  gradient,
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200/70 overflow-hidden',
        'shadow-[0_1px_4px_0_rgba(0,0,0,0.06),0_1px_2px_-1px_rgba(0,0,0,0.04)]',
        padding,
        hover && 'card-lift cursor-default',
        gradient && 'bg-gradient-to-br',
        gradient,
        className
      )}
    >
      {accent && <div className={cn('absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl', accent)} />}
      {children}
    </div>
  );
}
