'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'info' | 'error';
  onDone?: () => void;
  duration?: number;
}

export function Toast({ message, type = 'info', onDone, duration = 2500 }: ToastProps) {
  useEffect(() => {
    if (!onDone) return;
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [onDone, duration]);

  const bg = type === 'error' ? '#C46E52' : 'rgba(43,32,23,0.92)';

  return (
    <div
      className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-bold animate-bounce-in"
      style={{ background: bg, color: '#F5EDE0', backdropFilter: 'blur(8px)' }}
    >
      {message}
    </div>
  );
}
