import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Building2,
  DollarSign,
  TrendingUp,
  Award,
  Briefcase,
  Building,
  Users,
  Landmark,
  AlertCircle,
  FileCheck2,
  Sparkles,
} from 'lucide-react';
import api from '../api/client';
import FileUpload from '../components/documents/FileUpload';
import {
  InvestorType,
  VerificationMethod,
  DocumentType,
  type VerificationRequest,
} from '../types';
import { METHOD_LABELS, METHOD_DESCRIPTIONS, REQUIRED_DOCUMENTS } from '../utils/constants';
import type { RequiredDocument } from '../utils/constants';

const STEPS = [
  { title: 'Investor Type', hint: 'Individual or entity' },
  { title: 'Verification Method', hint: 'How you qualify' },
  { title: 'Attestation', hint: 'Financial details' },
  { title: 'Documents', hint: 'Supporting files' },
  { title: 'Review & Submit', hint: 'Final review' },
];

const METHOD_ICONS: Record<VerificationMethod, React.ReactNode> = {
  [VerificationMethod.INCOME]: <DollarSign className="h-5 w-5" />,
  [VerificationMethod.NET_WORTH]: <TrendingUp className="h-5 w-5" />,
  [VerificationMethod.PROFESSIONAL_CREDENTIAL]: <Award className="h-5 w-5" />,
  [VerificationMethod.PROFESSIONAL_ROLE]: <Briefcase className="h-5 w-5" />,
  [VerificationMethod.ENTITY_ASSETS]: <Building className="h-5 w-5" />,
  [VerificationMethod.ENTITY_ALL_OWNERS_ACCREDITED]: <Users className="h-5 w-5" />,
  [VerificationMethod.ENTITY_INSTITUTIONAL]: <Landmark className="h-5 w-5" />,
};

const INDIVIDUAL_METHODS = [
  VerificationMethod.INCOME,
  VerificationMethod.NET_WORTH,
  VerificationMethod.PROFESSIONAL_CREDENTIAL,
  VerificationMethod.PROFESSIONAL_ROLE,
];

const ENTITY_METHODS = [
  VerificationMethod.ENTITY_ASSETS,
  VerificationMethod.ENTITY_ALL_OWNERS_ACCREDITED,
  VerificationMethod.ENTITY_INSTITUTIONAL,
];

type FieldType = 'number' | 'text' | 'select' | 'textarea' | 'date';

interface AttestationField {
  key: string;
  label: string;
  type: FieldType;
  prefix?: string;
  options?: string[];
  help?: string;
}

export default function NewRequestPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [investorType, setInvestorType] = useState<InvestorType | null>(null);
  const [method, setMethod] = useState<VerificationMethod | null>(null);
  const [attestation, setAttestation] = useState<Record<string, string>>({});
  const [createdRequest, setCreatedRequest] = useState<VerificationRequest | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<{ name: string; type: DocumentType }[]>([]);
  const [attestationConfirmed, setAttestationConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selfAttestChecks, setSelfAttestChecks] = useState<boolean[]>([]);

  const setField = (key: string, value: string) =>
    setAttestation((prev) => ({ ...prev, [key]: value }));

  const getAttestationFields = (): AttestationField[] => {
    if (!method) return [];
    switch (method) {
      case VerificationMethod.INCOME:
        return [
          { key: 'annual_income_year1', label: 'Annual Income (Year 1 — most recent)', type: 'number', prefix: '$' },
          { key: 'annual_income_year2', label: 'Annual Income (Year 2 — prior year)', type: 'number', prefix: '$' },
          { key: 'expected_current_year', label: 'Expected Income (Current Year)', type: 'number', prefix: '$' },
          { key: 'filing_status', label: 'Filing Status', type: 'select', options: ['individual', 'joint'] },
        ];
      case VerificationMethod.NET_WORTH:
        return [
          { key: 'total_assets', label: 'Total Assets', type: 'number', prefix: '$' },
          { key: 'total_liabilities', label: 'Total Liabilities', type: 'number', prefix: '$' },
          { key: 'primary_residence_value', label: 'Primary Residence Value (excluded)', type: 'number', prefix: '$' },
          { key: 'net_worth_excluding_residence', label: 'Net Worth Excluding Residence', type: 'number', prefix: '$' },
        ];
      case VerificationMethod.PROFESSIONAL_CREDENTIAL:
        return [
          { key: 'license_type', label: 'License Type', type: 'select', options: ['Series 7', 'Series 65', 'Series 82'] },
          { key: 'license_number', label: 'License / CRD Number', type: 'text' },
          { key: 'issuing_authority', label: 'Issuing Authority', type: 'text' },
          { key: 'license_status', label: 'License Status', type: 'select', options: ['Active', 'Inactive'] },
        ];
      case VerificationMethod.PROFESSIONAL_ROLE:
        return [
          { key: 'company_name', label: 'Company Name', type: 'text' },
          { key: 'role_title', label: 'Your Role / Title', type: 'text' },
          { key: 'relationship', label: 'Relationship to Issuer', type: 'text' },
        ];
      case VerificationMethod.ENTITY_ASSETS:
        return [
          { key: 'entity_name', label: 'Entity Name', type: 'text' },
          { key: 'entity_type', label: 'Entity Type', type: 'select', options: ['LLC', 'Corporation', 'Trust', 'Partnership', 'Other'] },
          { key: 'total_assets', label: 'Total Assets', type: 'number', prefix: '$' },
          { key: 'formation_date', label: 'Formation Date', type: 'date' },
          { key: 'purpose', label: 'Entity Purpose', type: 'text' },
        ];
      case VerificationMethod.ENTITY_ALL_OWNERS_ACCREDITED:
        return [
          { key: 'entity_name', label: 'Entity Name', type: 'text' },
          { key: 'entity_type', label: 'Entity Type', type: 'select', options: ['LLC', 'Corporation', 'Trust', 'Partnership', 'Other'] },
          { key: 'owner_count', label: 'Number of Equity Owners', type: 'number' },
          { key: 'owner_details', label: 'Owner Names & Accreditation Basis', type: 'textarea', help: 'One owner per line.' },
        ];
      case VerificationMethod.ENTITY_INSTITUTIONAL:
        return [
          { key: 'entity_name', label: 'Institution Name', type: 'text' },
          { key: 'institution_type', label: 'Institution Type', type: 'select', options: ['Bank', 'Insurance Company', 'Registered Investment Company', 'Business Development Company', 'Registered Investment Adviser', 'Other'] },
          { key: 'registration_number', label: 'Registration Number', type: 'text' },
        ];
      default:
        return [];
    }
  };

  const getAttestationChecks = (): string[] => {
    if (!method) return [];
    switch (method) {
      case VerificationMethod.INCOME:
        return [
          'I confirm that my individual annual income has exceeded $200,000 (or $300,000 jointly with my spouse) in each of the past two most recent years.',
          'I have a reasonable expectation of reaching the same income level in the current year.',
        ];
      case VerificationMethod.NET_WORTH:
        return [
          'I confirm that my individual (or joint with spouse) net worth exceeds $1,000,000, excluding the value of my primary residence.',
        ];
      case VerificationMethod.PROFESSIONAL_CREDENTIAL:
        return [
          'I confirm that I hold a valid, active Series 7, Series 65, or Series 82 license in good standing.',
        ];
      case VerificationMethod.PROFESSIONAL_ROLE:
        return [
          'I confirm that I am a knowledgeable employee, executive officer, or director of the company offering securities.',
        ];
      case VerificationMethod.ENTITY_ASSETS:
        return [
          'I confirm that this entity has total assets in excess of $5,000,000.',
          'I confirm that this entity was not formed for the specific purpose of acquiring the securities being offered.',
        ];
      case VerificationMethod.ENTITY_ALL_OWNERS_ACCREDITED:
        return [
          'I confirm that every equity owner of this entity individually qualifies as an accredited investor.',
        ];
      case VerificationMethod.ENTITY_INSTITUTIONAL:
        return [
          'I confirm that this entity is a bank, insurance company, registered investment company, business development company, or similar qualified institutional buyer.',
        ];
      default:
        return [];
    }
  };

  const handleCreateAndGoToDocuments = async () => {
    if (!investorType || !method) return;
    setError('');
    try {
      const numericAttestation: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(attestation)) {
        const field = getAttestationFields().find((f) => f.key === k);
        numericAttestation[k] = field?.type === 'number' ? Number(v) : v;
      }

      const { data } = await api.post<VerificationRequest>(
        '/verification/requests',
        {
          investor_type: investorType,
          verification_method: method,
          self_attestation_data: numericAttestation,
        }
      );
      setCreatedRequest(data);
      setStep(3);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Failed to create request'
      );
    }
  };

  const handleUpload = async (file: File, documentType: DocumentType) => {
    if (!createdRequest) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', documentType);
      await api.post(`/documents/${createdRequest.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadedDocs((prev) => [...prev, { name: file.name, type: documentType }]);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Upload failed'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!createdRequest) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/verification/requests/${createdRequest.id}/submit`, {
        attestation_confirmed: true,
      });
      navigate(`/requests/${createdRequest.id}`);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'Submission failed'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getThresholdErrors = (): Record<string, string> => {
    if (!method) return {};
    const errors: Record<string, string> = {};
    const num = (key: string) => Number(attestation[key]) || 0;

    switch (method) {
      case VerificationMethod.INCOME: {
        const threshold =
          attestation['filing_status'] === 'joint' ? 300000 : 200000;
        const label =
          attestation['filing_status'] === 'joint'
            ? '$300,000 (joint)'
            : '$200,000 (individual)';
        if (attestation['annual_income_year1']?.trim() && num('annual_income_year1') < threshold)
          errors['annual_income_year1'] = `Income must be at least ${label} to qualify.`;
        if (attestation['annual_income_year2']?.trim() && num('annual_income_year2') < threshold)
          errors['annual_income_year2'] = `Income must be at least ${label} to qualify.`;
        if (attestation['expected_current_year']?.trim() && num('expected_current_year') < threshold)
          errors['expected_current_year'] = `Expected income must be at least ${label} to qualify.`;
        break;
      }
      case VerificationMethod.NET_WORTH: {
        if (attestation['net_worth_excluding_residence']?.trim() && num('net_worth_excluding_residence') < 1000000)
          errors['net_worth_excluding_residence'] = 'Net worth must exceed $1,000,000 (excluding primary residence) to qualify.';
        // Also flag if total_assets minus liabilities minus residence < 1M as a warning
        const assets = num('total_assets');
        const liabilities = num('total_liabilities');
        const residence = num('primary_residence_value');
        if (attestation['total_assets']?.trim() && attestation['total_liabilities']?.trim()) {
          const computed = assets - liabilities - residence;
          if (computed < 1000000 && !attestation['net_worth_excluding_residence']?.trim()) {
            errors['total_assets'] = `Computed net worth ($${computed.toLocaleString()}) is below $1,000,000 threshold.`;
          }
        }
        break;
      }
      case VerificationMethod.PROFESSIONAL_CREDENTIAL: {
        if (attestation['license_status'] === 'Inactive')
          errors['license_status'] = 'License must be Active to qualify under this method.';
        break;
      }
      case VerificationMethod.ENTITY_ASSETS: {
        if (attestation['total_assets']?.trim() && num('total_assets') < 5000000)
          errors['total_assets'] = 'Entity must have total assets exceeding $5,000,000 to qualify.';
        break;
      }
      case VerificationMethod.ENTITY_ALL_OWNERS_ACCREDITED: {
        if (attestation['owner_count']?.trim() && num('owner_count') < 1)
          errors['owner_count'] = 'Entity must have at least one equity owner.';
        break;
      }
      default:
        break;
    }
    return errors;
  };

  const thresholdErrors = getThresholdErrors();
  const hasThresholdErrors = Object.keys(thresholdErrors).length > 0;

  const canNext = () => {
    switch (step) {
      case 0:
        return investorType !== null;
      case 1:
        return method !== null;
      case 2:
        return (
          getAttestationFields().every((f) => attestation[f.key]?.trim()) &&
          !hasThresholdErrors &&
          selfAttestChecks.length > 0 &&
          selfAttestChecks.every(Boolean)
        );
      case 3: {
        if (!method) return false;
        const requiredTypes = REQUIRED_DOCUMENTS[method].filter(d => d.required).map(d => d.type);
        const uploadedTypes = new Set(uploadedDocs.map(d => d.type));
        return requiredTypes.every(t => uploadedTypes.has(t));
      }
      case 4:
        return attestationConfirmed;
      default:
        return false;
    }
  };

  const availableMethods =
    investorType === InvestorType.INDIVIDUAL
      ? INDIVIDUAL_METHODS
      : investorType === InvestorType.ENTITY
      ? ENTITY_METHODS
      : [];

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50 ring-1 ring-indigo-100 px-2.5 py-1 rounded-full mb-3">
          <Sparkles className="h-3.5 w-3.5" />
          Accredited Investor Verification
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          New Verification Request
        </h1>
        <p className="text-slate-500 mt-1.5 text-sm">
          Complete the {STEPS.length}-step flow to submit your request.
        </p>
      </div>

      {/* Stepper */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
          <span className="text-indigo-600">
            {STEPS[step].title}
          </span>
        </div>
        {/* Progress track */}
        <div className="relative h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mb-5">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Numbered markers */}
        <div className="flex items-start justify-between gap-2">
          {STEPS.map((s, i) => {
            const isCurrent = i === step;
            const isDone = i < step;
            return (
              <button
                key={s.title}
                type="button"
                onClick={() => {
                  // Allow jumping back, not forward (avoids skipping validation)
                  if (i < step) setStep(i);
                }}
                disabled={i > step}
                className={`flex-1 flex flex-col items-center gap-1.5 text-center ${
                  i <= step ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
              >
                <span
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold ring-1 transition ${
                    isCurrent
                      ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white ring-indigo-500 shadow-sm scale-110'
                      : isDone
                      ? 'bg-indigo-50 text-indigo-600 ring-indigo-200'
                      : 'bg-slate-50 text-slate-400 ring-slate-200'
                  }`}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span
                  className={`hidden sm:block text-[11px] font-medium leading-tight ${
                    isCurrent
                      ? 'text-slate-900'
                      : isDone
                      ? 'text-slate-600'
                      : 'text-slate-400'
                  }`}
                >
                  {s.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 text-sm px-4 py-3 rounded-xl mb-4 flex items-start gap-2 animate-fade-in">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 0: Investor Type */}
      {step === 0 && (
        <div className="space-y-5 animate-fade-in">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              What type of investor are you?
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Choose the option that best describes you.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                type: InvestorType.INDIVIDUAL,
                icon: <User className="h-6 w-6" />,
                label: 'Individual',
                desc: 'Natural person qualifying by income, net worth, or credentials',
              },
              {
                type: InvestorType.ENTITY,
                icon: <Building2 className="h-6 w-6" />,
                label: 'Entity',
                desc: 'LLC, corporation, trust, or institutional investor',
              },
            ].map(({ type, icon, label, desc }) => {
              const selected = investorType === type;
              return (
                <button
                  key={type}
                  onClick={() => {
                    setInvestorType(type);
                    setMethod(null);
                    setSelfAttestChecks([]);
                  }}
                  className={`relative p-5 rounded-xl border text-left transition-all bg-white ${
                    selected
                      ? 'border-indigo-400 ring-2 ring-indigo-200 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  {selected && (
                    <span className="absolute top-3 right-3 h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  <div
                    className={`h-11 w-11 rounded-xl flex items-center justify-center ${
                      selected
                        ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {icon}
                  </div>
                  <h3 className="font-semibold text-slate-900 mt-4">{label}</h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    {desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 1: Method */}
      {step === 1 && (
        <div className="space-y-5 animate-fade-in">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              How do you qualify?
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Pick the qualification method that applies to you.
            </p>
          </div>
          <div className="space-y-2.5">
            {availableMethods.map((m) => {
              const selected = method === m;
              return (
                <button
                  key={m}
                  onClick={() => {
                    setMethod(m);
                    setSelfAttestChecks([]);
                  }}
                  className={`relative w-full p-4 rounded-xl border text-left transition-all bg-white flex gap-4 items-start ${
                    selected
                      ? 'border-indigo-400 ring-2 ring-indigo-200 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div
                    className={`shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${
                      selected
                        ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {METHOD_ICONS[m]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 pr-8">
                      {METHOD_LABELS[m]}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                      {METHOD_DESCRIPTIONS[m]}
                    </p>
                  </div>
                  {selected && (
                    <span className="absolute top-3 right-3 h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Attestation */}
      {step === 2 && (
        <div className="space-y-5 animate-fade-in">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Self-attestation information
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Provide accurate values. They'll be cross-checked against your
              uploaded documents.
            </p>
          </div>

          {hasThresholdErrors && (
            <div className="bg-red-50 text-red-700 border border-red-200 text-sm px-4 py-3 rounded-xl flex items-start gap-2 animate-fade-in">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Below accreditation threshold</p>
                <p className="mt-0.5 text-red-600">
                  One or more values are below the minimum required for accredited investor status. Please correct them to continue.
                </p>
              </div>
            </div>
          )}
          <div className="card p-6 space-y-4">
            {getAttestationFields().map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {field.label}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={attestation[field.key] || ''}
                    onChange={(e) => setField(field.key, e.target.value)}
                    className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 ${thresholdErrors[field.key] ? 'border-red-300 focus:ring-red-300 focus:border-red-400' : 'border-slate-200 focus:ring-indigo-500/30 focus:border-indigo-400'}`}
                  >
                    <option value="">Select…</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={attestation[field.key] || ''}
                    onChange={(e) => setField(field.key, e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  />
                ) : (
                  <div className="relative">
                    {field.prefix && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                        {field.prefix}
                      </span>
                    )}
                    <input
                      type={field.type}
                      value={attestation[field.key] || ''}
                      onChange={(e) => setField(field.key, e.target.value)}
                      className={`w-full rounded-lg border bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 ${thresholdErrors[field.key] ? 'border-red-300 focus:ring-red-300 focus:border-red-400' : 'border-slate-200 focus:ring-indigo-500/30 focus:border-indigo-400'} ${
                        field.prefix ? 'pl-7' : ''
                      }`}
                    />
                  </div>
                )}
                {field.help && (
                  <p className="text-xs text-slate-500 mt-1">{field.help}</p>
                )}
                {thresholdErrors[field.key] && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {thresholdErrors[field.key]}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Self-attestation confirmation checks */}
          {getAttestationChecks().length > 0 && (
            <div className="card p-6 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Self-Attestation Confirmation
              </h3>
              <p className="text-xs text-slate-500">
                You must confirm the following before continuing:
              </p>
              {getAttestationChecks().map((check, idx) => (
                <label
                  key={idx}
                  className={`flex items-start gap-3 rounded-lg p-3 cursor-pointer border transition ${
                    selfAttestChecks[idx]
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selfAttestChecks[idx] || false}
                    onChange={(e) => {
                      const next = [...selfAttestChecks];
                      while (next.length < getAttestationChecks().length) next.push(false);
                      next[idx] = e.target.checked;
                      setSelfAttestChecks(next);
                    }}
                    className="mt-0.5 h-4 w-4 accent-emerald-600 rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700 leading-relaxed">
                    {check}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Documents */}
      {step === 3 && method && (
        <div className="space-y-5 animate-fade-in">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Upload supporting documents
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Upload each required document for your verification method. PDF, JPG, PNG — up to 10MB each.
            </p>
          </div>

          {/* Document checklist */}
          <div className="space-y-3">
            {REQUIRED_DOCUMENTS[method].map((reqDoc: RequiredDocument) => {
              const uploaded = uploadedDocs.filter(d => d.type === reqDoc.type);
              const isUploaded = uploaded.length > 0;

              return (
                <div
                  key={reqDoc.type}
                  className={`card p-4 transition-all ${
                    isUploaded
                      ? 'ring-1 ring-emerald-200 bg-emerald-50/30'
                      : reqDoc.required
                      ? 'ring-1 ring-slate-200'
                      : 'ring-1 ring-slate-100 bg-slate-50/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isUploaded
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {isUploaded ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <FileCheck2 className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {reqDoc.label}
                        </h3>
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            reqDoc.required
                              ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
                              : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
                          }`}
                        >
                          {reqDoc.required ? 'Required' : 'Optional'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {reqDoc.description}
                      </p>
                      {isUploaded && (
                        <div className="mt-2 space-y-1">
                          {uploaded.map((doc, i) => (
                            <div
                              key={i}
                              className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md mr-2"
                            >
                              <Check className="h-3 w-3" />
                              <span className="truncate max-w-[200px]">{doc.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {!isUploaded && (
                        <div className="mt-3">
                          <FileUpload
                            onUpload={(file) => handleUpload(file, reqDoc.type)}
                            uploading={uploading}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          {uploadedDocs.length > 0 && (
            <div className="card p-4 bg-slate-50/50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Upload Summary
              </p>
              <div className="text-sm text-slate-700">
                <span className="font-semibold text-emerald-700">{uploadedDocs.length}</span>{' '}
                document{uploadedDocs.length === 1 ? '' : 's'} uploaded
                {(() => {
                  const requiredTypes = REQUIRED_DOCUMENTS[method].filter(d => d.required).map(d => d.type);
                  const uploadedTypes = new Set(uploadedDocs.map(d => d.type));
                  const remaining = requiredTypes.filter(t => !uploadedTypes.has(t)).length;
                  return remaining > 0 ? (
                    <span className="text-orange-600 ml-1">
                      &middot; {remaining} required document{remaining === 1 ? '' : 's'} remaining
                    </span>
                  ) : (
                    <span className="text-emerald-600 ml-1">&middot; All required documents uploaded</span>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Review & Submit */}
      {step === 4 && (
        <div className="space-y-5 animate-fade-in">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Review & submit
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Double-check your details before submission.
            </p>
          </div>

          <div className="card divide-y divide-slate-100">
            <ReviewRow label="Investor Type" value={investorType || '—'} />
            <ReviewRow
              label="Verification Method"
              value={(method && METHOD_LABELS[method]) || '—'}
            />
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Attestation Data
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {Object.entries(attestation).map(([key, val]) => (
                  <div
                    key={key}
                    className="bg-slate-50/70 border border-slate-100 rounded-lg px-3 py-2"
                  >
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm font-medium text-slate-900 mt-0.5 break-words">
                      {val}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 py-4 flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-emerald-600" />
              <p className="text-sm text-slate-700">
                <span className="font-semibold">{uploadedDocs.length}</span>{' '}
                document{uploadedDocs.length === 1 ? '' : 's'} uploaded
              </p>
            </div>
          </div>

          <label
            className={`flex items-start gap-3 rounded-xl p-4 cursor-pointer border transition ${
              attestationConfirmed
                ? 'bg-amber-50 border-amber-300'
                : 'bg-amber-50/60 border-amber-200 hover:bg-amber-50'
            }`}
          >
            <input
              type="checkbox"
              checked={attestationConfirmed}
              onChange={(e) => setAttestationConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <div className="text-sm text-amber-900">
              <p className="font-semibold">Attestation confirmation</p>
              <p className="mt-1 leading-relaxed">
                I hereby certify that all information provided above is true,
                complete, and accurate. I understand that providing false
                information constitutes fraud and may result in legal
                consequences. I consent to the verification of the information
                and documents provided herein for the purpose of determining my
                accredited investor status under SEC Rule 501 of Regulation D.
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center mt-8">
        <button
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {step < 2 && (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext()}
            className="inline-flex items-center gap-1.5 bg-gradient-to-b from-indigo-500 to-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {step === 2 && (
          <button
            onClick={handleCreateAndGoToDocuments}
            disabled={!canNext()}
            className="inline-flex items-center gap-1.5 bg-gradient-to-b from-indigo-500 to-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Save & Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {step === 3 && (
          <button
            onClick={() => setStep(4)}
            disabled={!canNext()}
            className="inline-flex items-center gap-1.5 bg-gradient-to-b from-indigo-500 to-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Review
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {step === 4 && (
          <button
            onClick={handleSubmit}
            disabled={!canNext() || submitting}
            className="inline-flex items-center gap-1.5 bg-gradient-to-b from-emerald-500 to-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? 'Submitting…' : 'Submit Request'}
            <Check className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-4 flex items-center justify-between gap-4">
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-medium text-slate-900 text-right truncate">
        {value}
      </p>
    </div>
  );
}
