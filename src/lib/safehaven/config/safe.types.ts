export type SafehavenEnvironment = 'sandbox' | 'live';

export type SafehavenHttpMethod = 'GET' | 'POST';

export type SafehavenBaseUrls = Record<SafehavenEnvironment, string>;

export type SafehavenTokenResponse = {
  access_token: string;
  client_id: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  ibs_client_id: string;
  ibs_user_id: string;
};

export type SafehavenTokenCache = {
  accessToken: string;
  clientId: string;
  ibsClientId: string;
  ibsUserId: string;
  expiresAt: number;
};

export type SafehavenIdentityType =
  | 'NIN'
  | 'vNIN'
  | 'BVN'
  | 'BVNUSSD'
  | 'vID'
  | (string & {});

export type CreateSafehavenSubAccountPayload = {
  phoneNumber: string;
  identityType: SafehavenIdentityType;
  identityId?: string;
  identityNumber?: string;
  otp?: string;
  callbackUrl?: string;
  emailAddress: string;
  externalReference: string;
  autoSweep?: boolean;
};

export type SafehavenSubAccountResponse = {
  statusCode: number;
  message: string;
  data: Record<string, unknown>;
};

export type SafehavenRequestOptions = {
  method?: SafehavenHttpMethod;
  body?: unknown;
  accessToken?: string;
  headers?: Record<string, string>;
};

export type SafehavenRequestHeaders = Record<string, string>;

export type SafehavenRequestContext = {
  baseUrl: string;
  endpoint: string;
  options?: SafehavenRequestOptions;
  timeoutMs: number;
  isProduction: boolean;
};
