import {
  getPayba3ErrorMessage,
  handleResponse,
  PAYBA3_HTTP_STATUS,
} from '../../shared';
import type {
  SeerbitBaseUrls,
  SeerbitCredentials,
  SeerbitEncryptedKeyResponse,
  SeerbitEnvironment,
  NormalizedSeerbitEnvironment,
  SeerbitRequestContext,
  SeerbitRequestOptions,
} from './seerbit.types';

export const SEERBIT_BASE_URLS: SeerbitBaseUrls = {
  sandbox: 'https://seerbitapi.com/api/v2',
  live: 'https://seerbitapi.com/api/v2',
};

export const SEERBIT_BASE_URL = SEERBIT_BASE_URLS.sandbox;

export const normalizeSeerbitEnvironment = (
  environment?: string,
): NormalizedSeerbitEnvironment =>
  environment === 'live' || environment === 'production' ? 'live' : 'sandbox';

export const getSeerbitBaseUrl = (
  environment: SeerbitEnvironment,
  baseUrlOverride?: string,
): string =>
  (
    baseUrlOverride ??
    SEERBIT_BASE_URLS[normalizeSeerbitEnvironment(environment)]
  ).replace(/\/+$/, '');

export const getSeerbitCredentials = (
  environment: SeerbitEnvironment,
): SeerbitCredentials => ({
  publicKey:
    (normalizeSeerbitEnvironment(environment) === 'live'
      ? process.env.SEERBIT_LIVE_PUBLIC_KEY
      : process.env.SEERBIT_PUBLIC_KEY
    )?.trim() ?? '',
  secretKey:
    (normalizeSeerbitEnvironment(environment) === 'live'
      ? process.env.SEERBIT_LIVE_SECRET_KEY
      : process.env.SEERBIT_SECRET_KEY
    )?.trim() ?? '',
});

export const buildSeerbitHeaders = (
  token?: string,
): Record<string, string> => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

export const buildSeerbitRequestInit = (
  options: SeerbitRequestOptions,
): RequestInit => ({
  method: options.method ?? 'GET',
  headers: buildSeerbitHeaders(options.token),
  body: options.body ? JSON.stringify(options.body) : undefined,
  redirect: 'error',
});

export const parseSeerbitResponse = async (
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

export const assertSeerbitKeys = (
  publicKey: string,
  secretKey: string,
): void => {
  if (!publicKey || !secretKey) {
    throw new handleResponse(
      PAYBA3_HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Seerbit secret keys not set',
    );
  }
};

export const requestSeerbit = async <T>({
  baseUrl,
  endpoint,
  options = {},
}: SeerbitRequestContext): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(
      `${baseUrl}${endpoint}`,
      buildSeerbitRequestInit(options),
    );
  } catch (error) {
    throw new handleResponse(
      PAYBA3_HTTP_STATUS.BAD_GATEWAY,
      'Seerbit request failed',
      {
        data: getPayba3ErrorMessage(error, 'Seerbit request failed'),
      },
    );
  }

  const body = await parseSeerbitResponse(response);

  if (!response.ok) {
    throw new handleResponse(
      PAYBA3_HTTP_STATUS.BAD_REQUEST,
      'Seerbit request failed',
      body,
    );
  }

  return body as T;
};

export const generateSeerbitBearerToken = async (
  baseUrl: string,
  publicKey: string,
  secretKey: string,
): Promise<string> => {
  const response = await requestSeerbit<SeerbitEncryptedKeyResponse>({
    baseUrl,
    endpoint: '/encrypt/keys',
    options: {
      method: 'POST',
      body: { key: `${secretKey}.${publicKey}` },
    },
  });

  const encryptedKey =
    response.data?.EncryptedSecKey?.encryptedKey ??
    response.data?.EncrytedSecKey?.encryptedKey;

  if (response.status !== 'SUCCESS' || !encryptedKey) {
    throw new handleResponse(
      PAYBA3_HTTP_STATUS.BAD_REQUEST,
      'Failed to obtain Seerbit bearer token',
      response,
    );
  }

  return encryptedKey;
};
