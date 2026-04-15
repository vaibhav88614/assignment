import { Link } from 'react-router-dom';
import {
  Shield,
  FileCheck,
  MessageSquare,
  Clock,
  CheckCircle,
  ArrowRight,
  Users,
  Lock,
  FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              Accredited Investor
              <br />
              <span className="text-indigo-200">Verification Made Simple</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-indigo-100 leading-relaxed">
              SEC Rule 506(c) compliant verification for accredited investors.
              Submit your documents, get verified, and receive your
              verification letter — all in one secure platform.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              {user ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition"
                >
                  Go to Dashboard
                  <ArrowRight className="h-5 w-5" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition"
                  >
                    Get Verified Free
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              How It Works
            </h2>
            <p className="mt-3 text-lg text-gray-600">
              Three simple steps to get your accredited investor verification
              letter
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: FileText,
                title: '1. Submit Your Request',
                desc: 'Choose your qualification method (income, net worth, or professional credentials) and provide your attestation information.',
              },
              {
                icon: FileCheck,
                title: '2. Upload Documents',
                desc: 'Upload supporting documentation — tax returns, bank statements, CPA letters, or license proof. All files are encrypted and secure.',
              },
              {
                icon: CheckCircle,
                title: '3. Get Your Letter',
                desc: 'A qualified reviewer verifies your documents. Once approved, download your 90-day verification letter instantly.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="text-center p-6 rounded-xl bg-gray-50 hover:shadow-md transition"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-100 rounded-full mb-4">
                  <Icon className="h-7 w-7 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Qualification Paths */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Who Qualifies as an Accredited Investor?
            </h2>
            <p className="mt-3 text-lg text-gray-600">
              Under SEC Rule 501 of Regulation D, there are multiple paths to
              qualify
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                Individual Investors
              </h3>
              <ul className="space-y-3">
                {[
                  {
                    title: 'Income Test',
                    detail:
                      '$200,000+ annual (or $300,000 with spouse) for last 2 years',
                  },
                  {
                    title: 'Net Worth Test',
                    detail:
                      '$1,000,000+ excluding primary residence',
                  },
                  {
                    title: 'Professional Credential',
                    detail: 'Active Series 7, 65, or 82 license',
                  },
                  {
                    title: 'Professional Role',
                    detail:
                      'Director, officer, or GP of the issuer',
                  },
                ].map(({ title, detail }) => (
                  <li key={title} className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-gray-900">
                        {title}
                      </span>{' '}
                      <span className="text-sm text-gray-600">— {detail}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-600" />
                Entity Investors
              </h3>
              <ul className="space-y-3">
                {[
                  {
                    title: 'Assets Over $5M',
                    detail:
                      'Entity with $5M+ in assets, not formed solely for the investment',
                  },
                  {
                    title: 'All Owners Accredited',
                    detail: 'Every equity owner is individually accredited',
                  },
                  {
                    title: 'Institutional',
                    detail:
                      'Banks, insurance companies, registered investment companies, etc.',
                  },
                ].map(({ title, detail }) => (
                  <li key={title} className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-gray-900">
                        {title}
                      </span>{' '}
                      <span className="text-sm text-gray-600">— {detail}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Why AccredVerify?
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Lock,
                title: 'Bank-Level Security',
                desc: 'Documents encrypted at rest; UUID-based storage with no exposed filenames.',
              },
              {
                icon: Clock,
                title: '90-Day Validity',
                desc: 'Verification letters are valid for 90 days per SEC 506(c) guidance.',
              },
              {
                icon: MessageSquare,
                title: 'Built-In Messaging',
                desc: 'Communicate directly with your reviewer without leaving the platform.',
              },
              {
                icon: FileCheck,
                title: 'PDF Verification Letter',
                desc: 'Receive a professional, numbered verification letter you can share with issuers.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="p-5 rounded-xl border border-gray-200 hover:border-indigo-200 hover:shadow-sm transition"
              >
                <Icon className="h-8 w-8 text-indigo-600 mb-3" />
                <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
                <p className="text-sm text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="bg-indigo-700 py-16">
          <div className="max-w-4xl mx-auto text-center px-4">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Get Verified?
            </h2>
            <p className="text-indigo-200 mb-8 text-lg">
              Join thousands of investors who've streamlined their accreditation
              process. It's free and takes just minutes.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-white text-indigo-700 px-8 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition text-lg"
            >
              Get Started Now
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
