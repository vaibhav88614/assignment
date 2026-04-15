import { VerificationMethod, RequestStatus, DocumentType } from '../types';

export const METHOD_LABELS: Record<VerificationMethod, string> = {
  [VerificationMethod.INCOME]: 'Income Test ($200k/$300k)',
  [VerificationMethod.NET_WORTH]: 'Net Worth (>$1M excl. residence)',
  [VerificationMethod.PROFESSIONAL_CREDENTIAL]: 'Professional Credential (Series 7/65/82)',
  [VerificationMethod.PROFESSIONAL_ROLE]: 'Professional Role (Director/Officer/GP)',
  [VerificationMethod.ENTITY_ASSETS]: 'Entity Assets (>$5M)',
  [VerificationMethod.ENTITY_ALL_OWNERS_ACCREDITED]: 'Entity — All Owners Accredited',
  [VerificationMethod.ENTITY_INSTITUTIONAL]: 'Entity — Institutional',
};

export const METHOD_DESCRIPTIONS: Record<VerificationMethod, string> = {
  [VerificationMethod.INCOME]:
    'Annual income exceeding $200,000 individually (or $300,000 with spouse) for each of the past two years, with expectation of the same this year.',
  [VerificationMethod.NET_WORTH]:
    'Net worth over $1 million (individually or with spouse), excluding the value of your primary residence.',
  [VerificationMethod.PROFESSIONAL_CREDENTIAL]:
    'Hold an active Series 7, Series 65, or Series 82 license in good standing.',
  [VerificationMethod.PROFESSIONAL_ROLE]:
    'Director, executive officer, or general partner of the company offering the securities.',
  [VerificationMethod.ENTITY_ASSETS]:
    'Entity with more than $5 million in assets, not formed solely to acquire the offered securities.',
  [VerificationMethod.ENTITY_ALL_OWNERS_ACCREDITED]:
    'Entity in which all equity owners are individually accredited investors.',
  [VerificationMethod.ENTITY_INSTITUTIONAL]:
    'Bank, insurance company, registered investment company, business development company, or similar institution.',
};

export const STATUS_COLORS: Record<RequestStatus, string> = {
  [RequestStatus.DRAFT]: 'bg-gray-100 text-gray-700',
  [RequestStatus.SUBMITTED]: 'bg-blue-100 text-blue-700',
  [RequestStatus.UNDER_REVIEW]: 'bg-yellow-100 text-yellow-700',
  [RequestStatus.INFO_REQUESTED]: 'bg-orange-100 text-orange-700',
  [RequestStatus.ADDITIONAL_INFO_PROVIDED]: 'bg-cyan-100 text-cyan-700',
  [RequestStatus.APPROVED]: 'bg-green-100 text-green-700',
  [RequestStatus.DENIED]: 'bg-red-100 text-red-700',
  [RequestStatus.EXPIRED]: 'bg-gray-200 text-gray-500',
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  [RequestStatus.DRAFT]: 'Draft',
  [RequestStatus.SUBMITTED]: 'Submitted',
  [RequestStatus.UNDER_REVIEW]: 'Under Review',
  [RequestStatus.INFO_REQUESTED]: 'Info Requested',
  [RequestStatus.ADDITIONAL_INFO_PROVIDED]: 'Additional Info Provided',
  [RequestStatus.APPROVED]: 'Approved',
  [RequestStatus.DENIED]: 'Denied',
  [RequestStatus.EXPIRED]: 'Expired',
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.TAX_RETURN]: 'Tax Return',
  [DocumentType.W2]: 'W-2 Form',
  [DocumentType.BANK_STATEMENT]: 'Bank Statement',
  [DocumentType.BROKERAGE_STATEMENT]: 'Brokerage Statement',
  [DocumentType.CPA_LETTER]: 'CPA Letter',
  [DocumentType.ATTORNEY_LETTER]: 'Attorney Letter',
  [DocumentType.RIA_LETTER]: 'RIA Letter',
  [DocumentType.LICENSE_PROOF]: 'License Proof',
  [DocumentType.ENTITY_FORMATION_DOC]: 'Entity Formation Document',
  [DocumentType.FINANCIAL_STATEMENT]: 'Financial Statement',
  [DocumentType.OTHER]: 'Other',
};

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
