import { cn } from '../../utils/cn';

export default function Card({ children, className, hover = false, padding = 'p-5', accent }) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200/60 shadow-sm shadow-slate-100/50 overflow-hidden',
        padding,
        hover && 'rc-card',
        className
      )}
    >
      {accent && (
        <div className={cn('h-1 w-full', accent)} />
      )}
      {children}
    </div>
  );
}
