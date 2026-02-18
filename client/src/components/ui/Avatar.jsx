import { cn } from '../../utils/cn';
import { getAvatarGradient } from '../../utils/brand';

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl',
};

export default function Avatar({ name = '', src, size = 'md', className }) {
  const sizeClass = sizeMap[size] || sizeMap.md;

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover flex-shrink-0', sizeClass, className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold text-white flex-shrink-0',
        sizeClass,
        className
      )}
      style={{ background: getAvatarGradient(name) }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
