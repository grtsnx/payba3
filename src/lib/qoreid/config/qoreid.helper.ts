import {
  BadGatewayException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { handleResponse } from 'src/middleware';
import type {
  QoreIDCredentials,
  QoreIDEnvironment,
  QoreIDRequestContext,
  QoreIDRequestOptions,
  QoreIDTokenCache,
  QoreIDTokenResponse,
} from './qoreid.types';

const TOKEN_REFRESH_BUFFER_MS = 60_000;

export const QOREID_BASE_URL = 'https://api.qoreid.com';

export const getQoreIDCredentials = (
  environment: QoreIDEnvironment,
): QoreIDCredentials =>
  environment === 'development'
    ? {
        clientId: process.env.QOREID_CLIENT,
        secret: process.env.QOREID_SECRET,
      }
    : {
        clientId: process.env.QOREID_LIVE_CLIENT,
        secret: process.env.QOREID_LIVE_SECRET,
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
  'accessToken' in value &&
  'expiresIn' in value;

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

  return {
    accessToken: response.accessToken,
    expiresAt: Date.now() + response.expiresIn * 1000,
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
