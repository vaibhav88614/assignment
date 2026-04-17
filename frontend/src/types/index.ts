export enum UserRole {
  INVESTOR = 'INVESTOR',
  REVIEWER = 'REVIEWER',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
}

export enum InvestorType {
  INDIVIDUAL = 'INDIVIDUAL',
  ENTITY = 'ENTITY',
}

export enum VerificationMethod {
  INCOME = 'INCOME',
  NET_WORTH = 'NET_WORTH',
  PROFESSIONAL_CREDENTIAL = 'PROFESSIONAL_CREDENTIAL',
  PROFESSIONAL_ROLE = 'PROFESSIONAL_ROLE',
  ENTITY_ASSETS = 'ENTITY_ASSETS',
  ENTITY_ALL_OWNERS_ACCREDITED = 'ENTITY_ALL_OWNERS_ACCREDITED',
  ENTITY_INSTITUTIONAL = 'ENTITY_INSTITUTIONAL',
}

export enum RequestStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  INFO_REQUESTED = 'INFO_REQUESTED',
  ADDITIONAL_INFO_PROVIDED = 'ADDITIONAL_INFO_PROVIDED',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  EXPIRED = 'EXPIRED',
}

export enum DocumentType {
  TAX_RETURN = 'TAX_RETURN',
  W2 = 'W2',
  BANK_STATEMENT = 'BANK_STATEMENT',
  BROKERAGE_STATEMENT = 'BROKERAGE_STATEMENT',
  CPA_LETTER = 'CPA_LETTER',
  ATTORNEY_LETTER = 'ATTORNEY_LETTER',
  RIA_LETTER = 'RIA_LETTER',
  LICENSE_PROOF = 'LICENSE_PROOF',
  ENTITY_FORMATION_DOC = 'ENTITY_FORMATION_DOC',
  FINANCIAL_STATEMENT = 'FINANCIAL_STATEMENT',
  OTHER = 'OTHER',
}

export interface VerificationRequest {
  id: string;
  investor_id: string;
  assigned_reviewer_id: string | null;
  investor_type: InvestorType;
  verification_method: VerificationMethod;
  status: RequestStatus;
  self_attestation_data: Record<string, unknown> | null;
  denial_reason: string | null;
  info_deadline: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationRequestDetail extends VerificationRequest {
  investor_name: string;
  investor_email: string;
  reviewer_name: string | null;
  document_count: number;
  message_count: number;
  has_letter: boolean;
  letter_id: string | null;
}

export interface VerificationRequestList {
  items: VerificationRequest[];
  total: number;
  page: number;
  page_size: number;
}

export interface Document {
  id: string;
  request_id: string;
  document_type: DocumentType;
  original_filename: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface Message {
  id: string;
  request_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  content: string;
  is_system_message: boolean;
  created_at: string;
}

export interface VerificationLetter {
  id: string;
  request_id: string;
  letter_number: string;
  investor_name: string;
  verification_method: string;
  issued_at: string;
  expires_at: string;
  is_valid: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AdminStats {
  users_by_role: Record<string, number>;
  requests_by_status: Record<string, number>;
  total_letters_issued: number;
}
