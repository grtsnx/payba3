export type QoreIDEnvironment =
  | 'development'
  | 'production'
  | 'test'
  | 'provision';

export type QoreIDCredentials = {
  clientId?: string;
  secret?: string;
};

export type QoreIDTokenResponse = {
  accessToken: string;
  expiresIn: number;
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

export type QoreIDVerifyCacResponse = Record<string, unknown>;

export type QoreIDRequestContext = {
  baseUrl: string;
  endpoint: string;
  options?: QoreIDRequestOptions;
};
