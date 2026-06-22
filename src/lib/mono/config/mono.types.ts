export type MonoEnvironment = 'sandbox' | 'live';

export type MonoHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type MonoRequestOptions = {
  method?: MonoHttpMethod;
  body?: unknown;
};

export type MonoRequestContext = {
  baseUrl: string;
  secretKey: string;
  endpoint: string;
  options?: MonoRequestOptions;
};

export type MonoResponse<T = unknown> = {
  status?: string;
  message?: string;
  data?: T;
  [key: string]: unknown;
};

export type MonoInitiateAccountLinkingInput = {
  customer?: Record<string, unknown>;
  scope?: string;
  reference?: string;
  redirect_url?: string;
  meta?: Record<string, unknown>;
};

export type MonoInitiatePaymentInput = {
  amount: number;
  type?: string;
  description?: string;
  reference?: string;
  customer?: Record<string, unknown>;
  redirect_url?: string;
  meta?: Record<string, unknown>;
  [key: string]: unknown;
};

export type MonoBvnLookupInput = {
  bvn: string;
  scope?: string;
  reference?: string;
  redirect_url?: string;
  [key: string]: unknown;
};

export type MonoDisbursementSourceAccountInput = {
  account_number: string;
  bank_code: string;
  account_name?: string;
  [key: string]: unknown;
};
