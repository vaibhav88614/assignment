import { Check, XCircle } from 'lucide-react';
import { RequestStatus } from '../../types';

interface StatusStepperProps {
  status: RequestStatus;
}

const STEPS = [
  { key: 'submitted', label: 'Submitted', statuses: [RequestStatus.SUBMITTED] },
  { key: 'review', label: 'Under Review', statuses: [RequestStatus.UNDER_REVIEW] },
  {
    key: 'info',
    label: 'Info Requested',
    statuses: [RequestStatus.INFO_REQUESTED, RequestStatus.ADDITIONAL_INFO_PROVIDED],
    optional: true,
  },
  { key: 'decision', label: 'Decision', statuses: [RequestStatus.APPROVED, RequestStatus.DENIED, RequestStatus.EXPIRED] },
];

function getStepIndex(status: RequestStatus): number {
  if (status === RequestStatus.DRAFT) return -1;
  for (let i = 0; i < STEPS.length; i++) {
    if (STEPS[i].statuses.includes(status)) return i;
  }
  return -1;
}

export default function StatusStepper({ status }: StatusStepperProps) {
  const currentIdx = getStepIndex(status);
  const isDenied = status === RequestStatus.DENIED;
  const isApproved = status === RequestStatus.APPROVED;
  const isExpired = status === RequestStatus.EXPIRED;
  const isDecided = isDenied || isApproved || isExpired;

  return (
    <div className="flex items-center gap-0 w-full">
      {STEPS.map((step, idx) => {
        const isCurrent = idx === currentIdx;
        const isCompleted = idx < currentIdx;
        const isFuture = idx > currentIdx;
        const isDecisionStep = step.key === 'decision';

        let dotClass = 'bg-slate-200 text-slate-400';
        let lineClass = 'bg-slate-200';
        let labelClass = 'text-slate-400';

        if (isCompleted) {
          dotClass = 'bg-emerald-500 text-white';
          lineClass = 'bg-emerald-500';
          labelClass = 'text-slate-600';
        } else if (isCurrent) {
          if (isDecisionStep && isDenied) {
            dotClass = 'bg-red-500 text-white';
            labelClass = 'text-red-700 font-semibold';
          } else if (isDecisionStep && isApproved) {
            dotClass = 'bg-emerald-500 text-white';
            labelClass = 'text-emerald-700 font-semibold';
          } else if (isDecisionStep && isExpired) {
            dotClass = 'bg-slate-400 text-white';
            labelClass = 'text-slate-600 font-semibold';
          } else {
            dotClass = 'bg-indigo-600 text-white ring-4 ring-indigo-100';
            labelClass = 'text-indigo-700 font-semibold';
          }
        } else if (isFuture) {
          dotClass = 'bg-slate-200 text-slate-400';
          labelClass = 'text-slate-400';
        }

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${dotClass}`}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" />
                ) : isCurrent && isDenied ? (
                  <XCircle className="h-3.5 w-3.5" />
                ) : isCurrent && isDecided ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  idx + 1
                )}
              </div>
              <span className={`text-[10px] mt-1.5 whitespace-nowrap ${labelClass}`}>
                {isDecisionStep && isCurrent
                  ? isDenied
                    ? 'Denied'
                    : isExpired
                    ? 'Expired'
                    : 'Approved'
                  : step.label}
                {step.optional && isFuture && (
                  <span className="text-slate-300 ml-0.5">(if needed)</span>
                )}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 rounded-full ${
                  isCompleted ? lineClass : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
