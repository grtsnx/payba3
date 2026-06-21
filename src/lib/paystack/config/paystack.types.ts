export type PaystackEnvironment = 'development' | 'production' | 'test' | 'provision';

export type PaystackHttpMethod = 'GET' | 'POST' | 'DELETE';

export type PaystackRequestOptions = {
  method?: PaystackHttpMethod;
  body?: unknown;
};

export type PaystackResponse<T = unknown> = {
  status: boolean;
  message: string;
  data: T;
};

export type PaystackErrorResponse = {
  status?: boolean;
  message?: string;
  data?: unknown;
};

export type PaystackCustomer = {
  customer_code: string;
  [key: string]: unknown;
};

export type PaystackBank = {
  id: number;
  code: string;
  [key: string]: unknown;
};

export type PaystackSubscriptionCheckoutInput = {
  email: string;
  plan: string;
  callback_url?: string;
  metadata?: Record<string, string>;
  amountInKobo?: number;
  currency?: string;
};

export type PaystackListSubscriptionsOptions = {
  customerId?: number;
  planId?: number;
  perPage?: number;
};

export type PaystackOneTimeCheckoutInput = {
  email: string;
  amountInKobo: number;
  callback_url?: string;
  metadata?: Record<string, string>;
  currency?: string;
  reference?: string;
};

export type PaystackChargeAuthorizationInput = {
  email: string;
  amountInKobo: number;
  authorization_code: string;
  reference?: string;
  metadata?: Record<string, string>;
  currency?: string;
};

export type PaystackCreateSubscriptionInput = {
  customer: string;
  plan: string;
  authorization: string;
  start_date?: string;
};

export type PaystackCreateCustomerInput = {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
};

export type PaystackCreateTransferRecipientInput = {
  type: string;
  name: string;
  account_number: string;
  bank_code: string;
  currency: string;
};

export type PaystackInitiateTransferInput = {
  source: string;
  amount: number;
  recipient: string;
  reference: string;
  reason: string;
};

export type PaystackWebhookHeaders = Record<string, string | string[] | undefined>;

export type PaystackWebhookEvent = {
  event?: string;
  data?: unknown;
};
