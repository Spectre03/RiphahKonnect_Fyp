import { cn } from '../../utils/cn';
import { getAvatarGradient } from '../../utils/brand';

const sizeMap = {
  xs:  'h-6 w-6 text-[10px]',
  sm:  'h-8 w-8 text-xs',
  md:  'h-10 w-10 text-sm',
  lg:  'h-12 w-12 text-base',
  xl:  'h-16 w-16 text-xl',
  '2xl': 'h-20 w-20 text-2xl',
};

export default function Avatar({ name = '', src, size = 'md', className, ring = false }) {
  const sizeClass = sizeMap[size] || sizeMap.md;
  const ringClass = ring ? 'avatar-ring' : '';

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover flex-shrink-0', sizeClass, ringClass, className)}
      />
    );
  }

  const letter = name ? name.trim().charAt(0).toUpperCase() : '?';

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 select-none',
        sizeClass,
        ringClass,
        className
      )}
      style={{ background: getAvatarGradient(name) }}
    >
      {letter}
    </div>
  );
}
