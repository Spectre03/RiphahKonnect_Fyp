import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Input = forwardRef(function Input(
  { label, error, icon: Icon, className, ...rest },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-2.5 rounded-xl border bg-white text-sm outline-none transition',
            'placeholder:text-slate-400',
            'focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500',
            error ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : 'border-slate-200',
            Icon && 'pl-10',
            className
          )}
          {...rest}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
});

export default Input;
