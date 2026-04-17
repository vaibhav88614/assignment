import { RequestStatus } from '../../types';
import { STATUS_COLORS, STATUS_DOTS, STATUS_LABELS } from '../../utils/constants';

export default function StatusBadge({
  status,
  size = 'sm',
}: {
  status: RequestStatus;
  size?: 'sm' | 'md';
}) {
  const pad = size === 'md' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-[11px]';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${pad} ${STATUS_COLORS[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[status]} ${
          status === RequestStatus.UNDER_REVIEW ||
          status === RequestStatus.INFO_REQUESTED
            ? 'animate-pulse'
            : ''
        }`}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}
