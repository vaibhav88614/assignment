import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({
  className = '',
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 p-10 ${className}`}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
      {label && (
        <p className="text-xs font-medium text-slate-500 tracking-wide">
          {label}
        </p>
      )}
    </div>
  );
}
