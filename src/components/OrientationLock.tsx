'use client';

import { RotateCw } from 'lucide-react';
import { useState, useEffect, type ReactNode } from 'react';

const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState<{
    width: number | undefined;
    height: number | undefined;
  }>({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

export function OrientationLock({ children }: { children: ReactNode }) {
  const { width = 0, height = 0 } = useWindowSize();
  const isVertical = height > width;

  if (width === 0) {
    return null;
  }

  if (isVertical) {
    return (
      <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background px-8 text-foreground">
        <RotateCw className="h-12 w-12 animate-spin" />
        <p className="text-center text-xl font-semibold">
          Por favor, gire seu dispositivo
        </p>
        <p className="text-center text-muted-foreground">
          Este aplicativo foi projetado para ser usado no modo paisagem.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
