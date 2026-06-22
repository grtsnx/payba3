import {
  BadGatewayException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { handleResponse } from '../../shared/response.helper';
import type {
  NormalizedQoreIDEnvironment,
  QoreIDCacLevel,
  QoreIDCacVersion,
  QoreIDCredentials,
  QoreIDEnvironment,
  QoreIDRequestContext,
  QoreIDRequestOptions,
  QoreIDTokenCache,
  QoreIDTokenResponse,
} from './qoreid.types';

const TOKEN_REFRESH_BUFFER_MS = 60_000;
const DEFAULT_TOKEN_TTL_SECONDS = 50 * 60;

export const QOREID_BASE_URLS: Record<NormalizedQoreIDEnvironment, string> = {
  sandbox: 'https://api.qoreid.com',
  live: 'https://api.qoreid.com',
};

export const QOREID_BASE_URL = QOREID_BASE_URLS.sandbox;

export const normalizeQoreIDEnvironment = (
  environment?: string,
): NormalizedQoreIDEnvironment =>
  environment === 'live' || environment === 'production' ? 'live' : 'sandbox';

export const getQoreIDBaseUrl = (
  environment: QoreIDEnvironment,
  baseUrlOverride?: string,
): string =>
  (
    baseUrlOverride ?? QOREID_BASE_URLS[normalizeQoreIDEnvironment(environment)]
  ).replace(/\/+$/, '');

export const getQoreIDCredentials = (
  environment: QoreIDEnvironment,
): QoreIDCredentials => {
  const normalizedEnvironment = normalizeQoreIDEnvironment(environment);

  return normalizedEnvironment === 'live'
    ? {
        clientId: process.env.QOREID_LIVE_CLIENT,
        secret: process.env.QOREID_LIVE_SECRET,
      }
    : {
        clientId: process.env.QOREID_CLIENT,
        secret: process.env.QOREID_SECRET,
      };
};

export const buildQoreIDHeaders = (token?: string): Record<string, string> => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  ...(token ? { authorization: `Bearer ${token}` } : {}),
});

export const buildQoreIDRequestInit = (
  options: QoreIDRequestOptions,
): RequestInit => ({
  method: options.method ?? 'GET',
  headers: buildQoreIDHeaders(options.token),
  body: options.body ? JSON.stringify(options.body) : undefined,
  redirect: 'error',
});

export const parseQoreIDResponse = async (
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

export const isQoreIDTokenResponse = (
  value: unknown,
): value is QoreIDTokenResponse =>
  typeof value === 'object' &&
  value !== null &&
  (typeof (value as QoreIDTokenResponse).accessToken === 'string' ||
    typeof (value as QoreIDTokenResponse).access_token === 'string');

export const getQoreIDAccessTokenFromResponse = (
  response: QoreIDTokenResponse,
): string | undefined => response.accessToken ?? response.access_token;

export const getQoreIDExpiresInFromResponse = (
  response: QoreIDTokenResponse,
): number =>
  response.expiresIn ?? response.expires_in ?? DEFAULT_TOKEN_TTL_SECONDS;

export const getQoreIDErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'QoreID request failed';

export const assertQoreIDCredentials = (
  credentials: QoreIDCredentials,
): Required<QoreIDCredentials> => {
  if (!credentials.clientId || !credentials.secret) {
    throw new InternalServerErrorException(
      'QoreID credentials are not configured',
    );
  }

  return {
    clientId: credentials.clientId,
    secret: credentials.secret,
  };
};

export const requestQoreID = async <T>({
  baseUrl,
  endpoint,
  options = {},
}: QoreIDRequestContext): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(
      `${baseUrl}${endpoint}`,
      buildQoreIDRequestInit(options),
    );
  } catch (error) {
    throw new BadGatewayException({
      message: 'QoreID request failed',
      data: getQoreIDErrorMessage(error),
    });
  }

  const body = await parseQoreIDResponse(response);

  if (!response.ok) {
    throw new handleResponse(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'An error occurred with the verification service',
      body,
    );
  }

  return body as T;
};

export const fetchQoreIDToken = async (
  baseUrl: string,
  credentials: QoreIDCredentials,
): Promise<QoreIDTokenCache> => {
  const requiredCredentials = assertQoreIDCredentials(credentials);
  const response = await requestQoreID<unknown>({
    baseUrl,
    endpoint: '/token',
    options: {
      method: 'POST',
      body: {
        clientId: requiredCredentials.clientId,
        secret: requiredCredentials.secret,
      },
    },
  });

  if (!isQoreIDTokenResponse(response)) {
    throw new handleResponse(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Invalid response from QoreID token endpoint',
      response,
    );
  }

  const accessToken = getQoreIDAccessTokenFromResponse(response);

  if (!accessToken) {
    throw new handleResponse(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Invalid response from QoreID token endpoint',
      response,
    );
  }

  return {
    accessToken,
    expiresAt: Date.now() + getQoreIDExpiresInFromResponse(response) * 1000,
  };
};

export const isQoreIDTokenFresh = (
  token?: QoreIDTokenCache,
): token is QoreIDTokenCache =>
  Boolean(token && token.expiresAt - TOKEN_REFRESH_BUFFER_MS > Date.now());

export const getValidQoreIDAccessToken = async (
  token: QoreIDTokenCache | undefined,
  refreshToken: () => Promise<QoreIDTokenCache>,
): Promise<QoreIDTokenCache> => {
  if (isQoreIDTokenFresh(token)) {
    return token;
  }

  return refreshToken();
};

export const buildQoreIDCacEndpoint = (
  version: QoreIDCacVersion = 'v1',
  level: QoreIDCacLevel = 'basic',
): string => `/${version}/ng/identities/cac-${level}`;
