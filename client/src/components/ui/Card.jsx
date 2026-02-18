import { cn } from '../../utils/cn';

export default function Card({ children, className, hover = false, padding = 'p-5' }) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden',
        padding,
        hover && 'rc-card',
        className
      )}
    >
      {children}
    </div>
  );
}
