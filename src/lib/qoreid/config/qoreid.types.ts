export type QoreIDEnvironment =
  | 'sandbox'
  | 'live'
  | 'development'
  | 'production'
  | 'test'
  | 'provision';

export type NormalizedQoreIDEnvironment = 'sandbox' | 'live';

export type QoreIDCredentials = {
  clientId?: string;
  secret?: string;
};

export type QoreIDServiceOptions = {
  environment?: QoreIDEnvironment;
  baseUrl?: string;
  credentials?: QoreIDCredentials;
  clientId?: string;
  secret?: string;
};

export type QoreIDTokenResponse = {
  accessToken?: string;
  access_token?: string;
  expiresIn?: number;
  expires_in?: number;
};

export type QoreIDTokenCache = {
  accessToken: string;
  expiresAt: number;
};

export type QoreIDRequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  token?: string;
};

export type QoreIDCacVersion = 'v1' | 'v2' | 'v3';

export type QoreIDCacLevel = 'basic' | 'premium';

export type QoreIDVerifyCacOptions = {
  version?: QoreIDCacVersion;
  level?: QoreIDCacLevel;
};

export type QoreIDVerifyCacResponse = Record<string, unknown>;

export type QoreIDCreateSessionInput = Record<string, unknown>;

export type QoreIDCreateSessionResponse = Record<string, unknown>;

export type QoreIDRequestContext = {
  baseUrl: string;
  endpoint: string;
  options?: QoreIDRequestOptions;
};
