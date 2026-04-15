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
} from 'lucide-react';
import api from '../api/client';
import FileUpload from '../components/documents/FileUpload';
import {
  InvestorType,
  VerificationMethod,
  DocumentType,
  type VerificationRequest,
} from '../types';
import { METHOD_LABELS, METHOD_DESCRIPTIONS } from '../utils/constants';

const STEPS = ['Investor Type', 'Verification Method', 'Attestation', 'Documents', 'Review & Submit'];

const METHOD_ICONS: Record<VerificationMethod, React.ReactNode> = {
  [VerificationMethod.INCOME]: <DollarSign className="h-6 w-6" />,
  [VerificationMethod.NET_WORTH]: <TrendingUp className="h-6 w-6" />,
  [VerificationMethod.PROFESSIONAL_CREDENTIAL]: <Award className="h-6 w-6" />,
  [VerificationMethod.PROFESSIONAL_ROLE]: <Briefcase className="h-6 w-6" />,
  [VerificationMethod.ENTITY_ASSETS]: <Building className="h-6 w-6" />,
  [VerificationMethod.ENTITY_ALL_OWNERS_ACCREDITED]: <Users className="h-6 w-6" />,
  [VerificationMethod.ENTITY_INSTITUTIONAL]: <Landmark className="h-6 w-6" />,
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

export default function NewRequestPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [investorType, setInvestorType] = useState<InvestorType | null>(null);
  const [method, setMethod] = useState<VerificationMethod | null>(null);
  const [attestation, setAttestation] = useState<Record<string, string>>({});
  const [createdRequest, setCreatedRequest] = useState<VerificationRequest | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const [attestationConfirmed, setAttestationConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const setField = (key: string, value: string) =>
    setAttestation((prev) => ({ ...prev, [key]: value }));

  const getAttestationFields = () => {
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
          { key: 'owner_details', label: 'Owner Names & Accreditation Basis (one per line)', type: 'textarea' },
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
      setUploadedDocs((prev) => [...prev, file.name]);
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

  const canNext = () => {
    switch (step) {
      case 0:
        return investorType !== null;
      case 1:
        return method !== null;
      case 2:
        return getAttestationFields().every((f) => attestation[f.key]?.trim());
      case 3:
        return uploadedDocs.length > 0;
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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        New Verification Request
      </h1>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto">
        {STEPS.map((name, i) => (
          <div key={name} className="flex items-center">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                i === step
                  ? 'bg-indigo-600 text-white'
                  : i < step
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {i < step ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
              <span className="hidden sm:inline">{name}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-6 h-px bg-gray-300 mx-1" />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Step 0: Investor Type */}
      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            What type of investor are you?
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                type: InvestorType.INDIVIDUAL,
                icon: <User className="h-8 w-8" />,
                label: 'Individual',
                desc: 'Natural person qualifying by income, net worth, or credentials',
              },
              {
                type: InvestorType.ENTITY,
                icon: <Building2 className="h-8 w-8" />,
                label: 'Entity',
                desc: 'LLC, corporation, trust, or institutional investor',
              },
            ].map(({ type, icon, label, desc }) => (
              <button
                key={type}
                onClick={() => {
                  setInvestorType(type);
                  setMethod(null);
                }}
                className={`p-6 rounded-xl border-2 text-left transition ${
                  investorType === type
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={investorType === type ? 'text-indigo-600' : 'text-gray-400'}>
                  {icon}
                </div>
                <h3 className="font-semibold text-gray-900 mt-3">{label}</h3>
                <p className="text-sm text-gray-600 mt-1">{desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Method */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            How do you qualify?
          </h2>
          <div className="space-y-3">
            {availableMethods.map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`w-full p-4 rounded-xl border-2 text-left transition flex gap-4 items-start ${
                  method === m
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={method === m ? 'text-indigo-600' : 'text-gray-400'}>
                  {METHOD_ICONS[m]}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {METHOD_LABELS[m]}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {METHOD_DESCRIPTIONS[m]}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Attestation */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Self-Attestation Information
          </h2>
          <p className="text-sm text-gray-600">
            Please provide accurate information. This will be verified against
            your uploaded documents.
          </p>
          <div className="space-y-4 bg-white rounded-xl border border-gray-200 p-6">
            {getAttestationFields().map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={attestation[field.key] || ''}
                    onChange={(e) => setField(field.key, e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select...</option>
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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                ) : (
                  <div className="relative">
                    {field.prefix && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        {field.prefix}
                      </span>
                    )}
                    <input
                      type={field.type}
                      value={attestation[field.key] || ''}
                      onChange={(e) => setField(field.key, e.target.value)}
                      className={`w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        field.prefix ? 'pl-7' : ''
                      }`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Documents */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Upload Supporting Documents
          </h2>
          <p className="text-sm text-gray-600">
            Upload documents that support your attestation. Accepted formats:
            PDF, JPG, PNG (max 10MB each).
          </p>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <FileUpload onUpload={handleUpload} uploading={uploading} />

            {uploadedDocs.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Uploaded ({uploadedDocs.length}):
                </p>
                {uploadedDocs.map((name, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg"
                  >
                    <Check className="h-4 w-4" />
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Review & Submit */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Review & Submit
          </h2>

          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
            <div className="p-4">
              <p className="text-sm text-gray-500">Investor Type</p>
              <p className="font-medium">{investorType}</p>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-500">Verification Method</p>
              <p className="font-medium">
                {method && METHOD_LABELS[method]}
              </p>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-500">Attestation Data</p>
              <div className="mt-1 space-y-1">
                {Object.entries(attestation).map(([key, val]) => (
                  <p key={key} className="text-sm">
                    <span className="text-gray-600">
                      {key.replace(/_/g, ' ')}:
                    </span>{' '}
                    <span className="font-medium">{val}</span>
                  </p>
                ))}
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-500">Documents Uploaded</p>
              <p className="font-medium">{uploadedDocs.length} file(s)</p>
            </div>
          </div>

          <label className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={attestationConfirmed}
              onChange={(e) => setAttestationConfirmed(e.target.checked)}
              className="mt-1 h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
            />
            <div className="text-sm text-amber-900">
              <p className="font-medium">Attestation Confirmation</p>
              <p className="mt-1">
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
      <div className="flex justify-between mt-8">
        <button
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {step < 2 && (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext()}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-medium"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {step === 2 && (
          <button
            onClick={handleCreateAndGoToDocuments}
            disabled={!canNext()}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-medium"
          >
            Save & Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {step === 3 && (
          <button
            onClick={() => setStep(4)}
            disabled={!canNext()}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-medium"
          >
            Review
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {step === 4 && (
          <button
            onClick={handleSubmit}
            disabled={!canNext() || submitting}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
            <Check className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
