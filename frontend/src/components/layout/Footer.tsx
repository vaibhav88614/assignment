import { ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white/60 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-sm">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="font-semibold text-slate-800 tracking-tight">
              AccredVerify
            </span>
          </div>
          <p className="text-xs text-slate-500 text-center max-w-xl leading-relaxed">
            SEC Rule 501 / Regulation D compliant verification.
            This service does not constitute legal or financial advice.
          </p>
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} AccredVerify
          </p>
        </div>
      </div>
    </footer>
  );
}
