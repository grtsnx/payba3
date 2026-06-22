import {
  getPayba3ErrorMessage,
  handleResponse,
  PAYBA3_HTTP_STATUS,
} from '../../shared';
import type {
  NormalizedSafehavenEnvironment,
  SafehavenBaseUrls,
  SafehavenCredentials,
  SafehavenEnvironment,
  SafehavenRequestContext,
  SafehavenRequestHeaders,
  SafehavenRequestOptions,
  SafehavenTokenCache,
  SafehavenTokenResponse,
} from './safe.types';

const TOKEN_REFRESH_BUFFER_MS = 60_000;

export const SAFEHAVEN_BASE_URLS: SafehavenBaseUrls = {
  sandbox: 'https://api.sandbox.safehavenmfb.com',
  live: 'https://api.safehavenmfb.com',
};

export const normalizeSafehavenEnvironment = (
  environment?: string,
): NormalizedSafehavenEnvironment =>
  environment === 'live' || environment === 'production' ? 'live' : 'sandbox';

export const getSafehavenBaseUrl = (
  environment: SafehavenEnvironment,
  baseUrlOverride?: string,
): string =>
  (
    baseUrlOverride ??
    SAFEHAVEN_BASE_URLS[normalizeSafehavenEnvironment(environment)]
  ).replace(/\/+$/, '');

export const getSafehavenCredentials = (
  environment: SafehavenEnvironment,
): SafehavenCredentials => {
  const isLive = normalizeSafehavenEnvironment(environment) === 'live';

  return {
    clientId:
      (isLive
        ? process.env.SAFEHAVEN_LIVE_CLIENT_ID
        : process.env.SAFEHAVEN_CLIENT_ID
      )?.trim() ??
      process.env.SAFEHAVEN_CLIENT_ID?.trim() ??
      '',
    clientAssertion:
      (isLive
        ? process.env.SAFEHAVEN_LIVE_CLIENT_ASSERTION
        : process.env.SAFEHAVEN_CLIENT_ASSERTION
      )?.trim() ??
      process.env.SAFEHAVEN_CLIENT_ASSERTION?.trim() ??
      '',
  };
};

export const buildSafehavenHeaders = (
  options: SafehavenRequestOptions,
): SafehavenRequestHeaders => ({
  accept: 'application/json',
  'content-type': 'application/json',
  ...(options.accessToken
    ? { authorization: `Bearer ${options.accessToken}` }
    : {}),
  ...options.headers,
});

export const parseSafehavenResponse = async (
  response: Response,
): Promise<unknown> => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

export const getSafehavenErrorData = (
  error: unknown,
  isProduction: boolean,
): unknown => {
  if (isProduction) {
    return undefined;
  }

  if (error instanceof Error) {
    return getPayba3ErrorMessage(error, 'Safehaven request failed');
  }

  return error;
};

export const assertSafehavenClientId = (clientId: string): string => {
  if (!clientId) {
    throw new handleResponse(
      PAYBA3_HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'SAFEHAVEN_CLIENT_ID is not configured',
    );
  }

  return clientId;
};

export const assertSafehavenClientAssertion = (
  clientAssertion: string,
): string => {
  if (!clientAssertion) {
    throw new handleResponse(
      PAYBA3_HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'SAFEHAVEN_CLIENT_ASSERTION is not configured',
    );
  }

  return clientAssertion;
};

export const buildSafehavenTokenPayload = (
  clientId: string,
  clientAssertion: string,
): Record<string, string> => ({
  grant_type: 'client_credentials',
  client_assertion_type:
    'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
  client_id: assertSafehavenClientId(clientId),
  client_assertion: assertSafehavenClientAssertion(clientAssertion),
});

export const createSafehavenTokenCache = (
  response: SafehavenTokenResponse,
): SafehavenTokenCache => ({
  accessToken: response.access_token,
  clientId: response.client_id,
  ibsClientId: response.ibs_client_id,
  ibsUserId: response.ibs_user_id,
  expiresAt: Date.now() + response.expires_in * 1000,
});

export const isSafehavenTokenFresh = (
  token?: SafehavenTokenCache,
): token is SafehavenTokenCache =>
  Boolean(token && token.expiresAt - TOKEN_REFRESH_BUFFER_MS > Date.now());

export const getValidSafehavenAccessToken = async (
  token: SafehavenTokenCache | undefined,
  refreshToken: () => Promise<SafehavenTokenResponse>,
): Promise<string> => {
  const tokenCache = await getValidSafehavenToken(token, refreshToken);

  return tokenCache.accessToken;
};

export const getValidSafehavenToken = async (
  token: SafehavenTokenCache | undefined,
  refreshToken: () => Promise<SafehavenTokenResponse>,
): Promise<SafehavenTokenCache> => {
  if (isSafehavenTokenFresh(token)) {
    return token;
  }

  const response = await refreshToken();
  return createSafehavenTokenCache(response);
};

export const getSafehavenClientHeaderValue = (
  token: SafehavenTokenCache,
  fallbackClientId: string,
): string => token.ibsClientId || fallbackClientId;

export const throwSafehavenRequestError = (
  status: number,
  responseBody: unknown,
  isProduction: boolean,
): never => {
  if (status === 401) {
    throw new handleResponse(
      PAYBA3_HTTP_STATUS.UNAUTHORIZED,
      'Unauthorized request to Safehaven',
      getSafehavenErrorData(responseBody, isProduction),
    );
  }

  throw new handleResponse(
    PAYBA3_HTTP_STATUS.BAD_GATEWAY,
    'Safehaven request failed',
    getSafehavenErrorData(responseBody, isProduction),
  );
};

export const requestSafehaven = async <T>({
  baseUrl,
  endpoint,
  options = {},
  timeoutMs,
  isProduction,
}: SafehavenRequestContext): Promise<T> => {
  const headers = buildSafehavenHeaders(options);
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  let response: Response;

  try {
    response = await fetch(`${baseUrl}${endpoint}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      redirect: 'error',
      signal: abortController.signal,
    });
  } catch (error) {
    if (abortController.signal.aborted) {
      throw new handleResponse(
        PAYBA3_HTTP_STATUS.GATEWAY_TIMEOUT,
        'Safehaven request timed out',
      );
    }

    throw new handleResponse(
      PAYBA3_HTTP_STATUS.BAD_GATEWAY,
      'Safehaven request failed',
      getSafehavenErrorData(error, isProduction),
    );
  } finally {
    clearTimeout(timeout);
  }

  const responseBody = await parseSafehavenResponse(response);

  if (!response.ok) {
    throwSafehavenRequestError(response.status, responseBody, isProduction);
  }

  return responseBody as T;
};
