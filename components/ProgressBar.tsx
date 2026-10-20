import { cn } from '@/lib/utils';

interface ProgressBarProps {
  /** 0 à 1. */
  ratio: number;
  className?: string;
}

/** Barre d'avancement ; verte à 100 %. */
export default function ProgressBar({ ratio, className }: ProgressBarProps) {
  const percent = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={cn('h-full rounded-full transition-all', percent === 100 ? 'bg-green-600' : 'bg-primary')} style={{ width: `${percent}%` }} />
    </div>
  );
}
