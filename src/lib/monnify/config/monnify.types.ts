export type MonnifyEnvironment = 'sandbox' | 'live';

export type MonnifyHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type MonnifyCredentials = {
  apiKey: string;
  secretKey: string;
  contractCode: string;
};

export type MonnifyBaseUrls = Record<MonnifyEnvironment, string>;

export type MonnifyTokenCache = {
  accessToken: string;
  expiresAt: number;
};

export type MonnifyAuthResponse = {
  requestSuccessful: boolean;
  responseMessage: string;
  responseCode: string;
  responseBody?: {
    accessToken?: string;
    [key: string]: unknown;
  };
};

export type MonnifyRequestOptions = {
  method?: MonnifyHttpMethod;
  body?: unknown;
  token?: string;
};

export type MonnifyRequestContext = {
  baseUrl: string;
  endpoint: string;
  options?: MonnifyRequestOptions;
};

export type MonnifyResponse<T = unknown> = {
  requestSuccessful: boolean;
  responseMessage: string;
  responseCode: string;
  responseBody?: T;
};

export type MonnifyInitializeTransactionInput = {
  amount: number;
  customerName: string;
  customerEmail: string;
  paymentReference: string;
  paymentDescription: string;
  currencyCode?: string;
  contractCode?: string;
  redirectUrl?: string;
  paymentMethods?: string[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type MonnifyReservedAccountInput = {
  accountReference: string;
  accountName: string;
  currencyCode?: string;
  contractCode?: string;
  customerEmail: string;
  customerName: string;
  bvn?: string;
  nin?: string;
  getAllAvailableBanks?: boolean;
  preferredBanks?: string[];
  [key: string]: unknown;
};

export type MonnifyTransferInput = {
  amount: number;
  reference: string;
  narration: string;
  destinationBankCode: string;
  destinationAccountNumber: string;
  currency?: string;
  sourceAccountNumber?: string;
  [key: string]: unknown;
};

export type MonnifyRefundInput = {
  transactionReference: string;
  refundReference: string;
  refundAmount: number;
  refundReason?: string;
  customerNote?: string;
  [key: string]: unknown;
};

export type MonnifySubAccountInput = {
  currencyCode?: string;
  bankCode: string;
  accountNumber: string;
  email: string;
  defaultSplitPercentage: number;
  [key: string]: unknown;
};
