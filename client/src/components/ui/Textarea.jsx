import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Textarea = forwardRef(function Textarea(
  { label, error, className, rows = 3, ...rest },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full px-4 py-2.5 rounded-xl border bg-white text-sm outline-none transition resize-none',
          'placeholder:text-slate-400',
          'focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500',
          error ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200',
          className
        )}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
});

export default Textarea;
