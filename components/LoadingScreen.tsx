import { Loader2 } from 'lucide-react';

export function LoadingScreen({ message = '불러오는 중...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#F5EDE0' }}>
      <Loader2 size={32} className="animate-spin" style={{ color: '#D4824A' }} />
      <div className="mt-3 text-sm font-bold" style={{ color: '#3D2817' }}>
        {message}
      </div>
    </div>
  );
}
