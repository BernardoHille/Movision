import Image from 'next/image';
import * as React from 'react';
import { cn } from '@/lib/utils';

export function Logo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <div className={cn('relative', className)}>
      <Image
        src="/img/logo.png"
        alt="Movision Logo"
        fill
        className="object-contain"
        {...props}
      />
    </div>
  );
}
