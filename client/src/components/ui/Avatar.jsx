import { useState, useEffect } from 'react';
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

const dotSizeMap = {
  xs:  'h-2 w-2 bottom-0 right-0',
  sm:  'h-2.5 w-2.5 bottom-0 right-0',
  md:  'h-3 w-3 bottom-0 right-0',
  lg:  'h-3.5 w-3.5 bottom-0 right-0',
  xl:  'h-4 w-4 bottom-0.5 right-0.5',
  '2xl': 'h-5 w-5 bottom-1 right-1',
};

export default function Avatar({ name = '', src, size = 'md', className, ring = false, online }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const sizeClass = sizeMap[size] || sizeMap.md;
  const dotClass = dotSizeMap[size] || dotSizeMap.md;
  const ringClass = ring ? 'avatar-ring' : '';
  const validSrc = src && typeof src === 'string' && src.trim().length > 0 && !imgError;
  const letter = name ? name.trim().charAt(0).toUpperCase() : '?';

  const avatarEl = validSrc ? (
    <img
      src={src}
      alt=""
      onError={() => setImgError(true)}
      className={cn('rounded-full object-cover flex-shrink-0', sizeClass, ringClass, className)}
    />
  ) : (
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

  if (online === undefined) {
    return avatarEl;
  }

  return (
    <div className="relative inline-flex flex-shrink-0">
      {avatarEl}
      <span
        title={online ? 'Online' : 'Offline'}
        className={cn(
          'absolute rounded-full ring-2 ring-white',
          dotClass,
          online ? 'bg-emerald-500' : 'bg-slate-300'
        )}
      />
    </div>
  );
}
