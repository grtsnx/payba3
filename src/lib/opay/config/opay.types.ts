export type OPayEnvironment = 'sandbox' | 'live';

export type OPayHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type OPayAuthMode = 'publicKey' | 'signature';

export type OPayCredentials = {
  merchantId: string;
  publicKey: string;
  secretKey: string;
};

export type OPayBaseUrls = Record<OPayEnvironment, string>;

export type OPayAmount = {
  total: number;
  currency: string;
};

export type OPayProduct = {
  name: string;
  description: string;
};

export type OPayUserInfo = {
  userId?: string;
  userName?: string;
  userEmail?: string;
  userMobile?: string;
};

export type OPayPaymentPayload = {
  reference: string;
  country?: string;
  amount: OPayAmount;
  product?: OPayProduct;
  payMethod?: string;
  returnUrl?: string;
  callbackUrl?: string;
  cancelUrl?: string;
  expireAt?: number;
  userInfo?: OPayUserInfo;
  [key: string]: unknown;
};

export type OPayStatusPayload = {
  country?: string;
  reference?: string;
  orderNo?: string;
};

export type OPayRefundPayload = {
  reference: string;
  originalReference: string;
  country?: string;
  amount: OPayAmount;
  refundWay?: string;
  callbackUrl?: string;
  refundReason?: string;
  receiver?: Record<string, unknown>;
};

export type OPayOtpPayload = {
  orderNo: string;
  country?: string;
  otp?: string;
  pin?: string;
};

export type OPayRequestOptions = {
  method?: OPayHttpMethod;
  authMode: OPayAuthMode;
  body?: unknown;
};

export type OPayRequestContext = {
  baseUrl: string;
  credentials: OPayCredentials;
  endpoint: string;
  options: OPayRequestOptions;
};

export type OPayResponse<T = unknown> = {
  code: string;
  message: string;
  data?: T;
};
