import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
export const Image = forwardRef(function Image({ src, alt = '', className, ...props }, ref) {
  return <img ref={ref} src={src} alt={alt} className={cn('max-w-full', className)} loading="lazy" {...props} />;
});
export default Image;
