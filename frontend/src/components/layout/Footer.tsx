import { Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-600" />
            <span className="font-semibold text-gray-900">AccredVerify</span>
          </div>
          <p className="text-sm text-gray-500 text-center">
            SEC Rule 501 / Regulation D compliant verification.
            This service does not constitute legal or financial advice.
          </p>
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} AccredVerify. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
