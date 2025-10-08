'use client';

import { useState, useEffect } from 'react';
import { Smartphone } from 'lucide-react';

export function OrientationLock() {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Use a direct comparison of viewport dimensions for a more reliable check
      const isCurrentlyPortrait = window.innerHeight > window.innerWidth;
      setIsPortrait(isCurrentlyPortrait);
    };

    // Initial check
    checkOrientation();

    // Listen for changes
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortrait) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex h-full w-full flex-col items-center justify-center bg-white text-black md:hidden">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="animate-pulse">
          <Smartphone className="h-24 w-24 -rotate-90" />
        </div>
        <h2 className="text-2xl font-bold">Vire o seu dispositivo</h2>
        <p className="max-w-xs text-zinc-600">
          Esta aplicação foi projetada para ser usada no modo paisagem
          (horizontal).
        </p>
      </div>
    </div>
  );
}
