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
  expiresAt: number;
};

export type CreateSafehavenSubAccountPayload = {
  phoneNumber: string;
  identityType: string;
  identityId: string;
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
