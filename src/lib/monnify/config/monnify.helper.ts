import {
  BadGatewayException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { handleResponse } from 'src/middleware';
import type {
  MonnifyAuthResponse,
  MonnifyBaseUrls,
  MonnifyCredentials,
  MonnifyEnvironment,
  MonnifyResponse,
  MonnifyRequestContext,
  MonnifyRequestOptions,
  MonnifyTokenCache,
} from './monnify.types';

const TOKEN_REFRESH_BUFFER_MS = 60_000;
const DEFAULT_TOKEN_TTL_MS = 50 * 60 * 1000;

export const MONNIFY_BASE_URLS: MonnifyBaseUrls = {
  sandbox: 'https://sandbox.monnify.com',
  live: 'https://api.monnify.com',
};

export const getMonnifyBaseUrl = (
  environment: MonnifyEnvironment,
  baseUrlOverride?: string,
): string =>
  (baseUrlOverride ?? MONNIFY_BASE_URLS[environment]).replace(/\/+$/, '');

export const getMonnifyCredentials = (
  environment: MonnifyEnvironment,
): MonnifyCredentials => ({
  apiKey:
    (environment === 'live'
      ? process.env.MONNIFY_LIVE_API_KEY
      : process.env.MONNIFY_API_KEY
    )?.trim() ?? '',
  secretKey:
    (environment === 'live'
      ? process.env.MONNIFY_LIVE_SECRET_KEY
      : process.env.MONNIFY_SECRET_KEY
    )?.trim() ?? '',
  contractCode:
    (environment === 'live'
      ? process.env.MONNIFY_LIVE_CONTRACT_CODE
      : process.env.MONNIFY_CONTRACT_CODE
    )?.trim() ?? '',
});

export const assertMonnifyCredentials = (
  credentials: MonnifyCredentials,
): void => {
  if (!credentials.apiKey || !credentials.secretKey) {
    throw new InternalServerErrorException(
      'MONNIFY_API_KEY and MONNIFY_SECRET_KEY are required',
    );
  }
};

export const assertMonnifySecretKey = (secretKey: string): string => {
  if (!secretKey) {
    throw new InternalServerErrorException(
      'MONNIFY_SECRET_KEY is not configured',
    );
  }

  return secretKey;
};

export const assertMonnifyContractCode = (contractCode: string): string => {
  if (!contractCode) {
    throw new InternalServerErrorException(
      'MONNIFY_CONTRACT_CODE is not configured',
    );
  }

  return contractCode;
};

export const buildMonnifyHeaders = (
  options: MonnifyRequestOptions,
): Record<string, string> => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
});

export const buildMonnifyRequestInit = (
  options: MonnifyRequestOptions,
): RequestInit => ({
  method: options.method ?? 'GET',
  headers: buildMonnifyHeaders(options),
  body: options.body ? JSON.stringify(options.body) : undefined,
  redirect: 'error',
});

export const buildMonnifyQuery = (
  params: Record<string, string | number | boolean | undefined>,
): string => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

export const parseMonnifyResponse = async (
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

export const getMonnifyErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Monnify request failed';

export const isMonnifyResponse = (value: unknown): value is MonnifyResponse =>
  typeof value === 'object' &&
  value !== null &&
  'requestSuccessful' in value &&
  'responseMessage' in value;

export const throwMonnifyResponseError = (body: MonnifyResponse): never => {
  throw new handleResponse(
    HttpStatus.BAD_REQUEST,
    body.responseMessage || 'Monnify request failed',
    body,
  );
};

export const requestMonnify = async <T = unknown>({
  baseUrl,
  endpoint,
  options = {},
}: MonnifyRequestContext): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(
      `${baseUrl}${endpoint}`,
      buildMonnifyRequestInit(options),
    );
  } catch (error) {
    throw new BadGatewayException({
      message: 'Monnify request failed',
      data: getMonnifyErrorMessage(error),
    });
  }

  const body = await parseMonnifyResponse(response);

  if (!response.ok) {
    throw new handleResponse(
      HttpStatus.BAD_REQUEST,
      'Monnify request failed',
      body,
    );
  }

  if (isMonnifyResponse(body) && body.requestSuccessful === false) {
    throwMonnifyResponseError(body);
  }

  return body as T;
};

export const getMonnifyBasicAuth = (
  credentials: MonnifyCredentials,
): string => {
  assertMonnifyCredentials(credentials);

  return Buffer.from(`${credentials.apiKey}:${credentials.secretKey}`).toString(
    'base64',
  );
};

export const fetchMonnifyToken = async (
  baseUrl: string,
  credentials: MonnifyCredentials,
): Promise<MonnifyTokenCache> => {
  let response: Response;

  try {
    response = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${getMonnifyBasicAuth(credentials)}`,
      },
      redirect: 'error',
    });
  } catch (error) {
    throw new BadGatewayException({
      message: 'Monnify token request failed',
      data: getMonnifyErrorMessage(error),
    });
  }

  const body = (await parseMonnifyResponse(response)) as MonnifyAuthResponse;

  if (!response.ok || !body.responseBody?.accessToken) {
    throw new handleResponse(
      HttpStatus.BAD_REQUEST,
      'Failed to obtain Monnify access token',
      body,
    );
  }

  return createMonnifyTokenCache(body.responseBody.accessToken);
};

export const decodeJwtPayload = (token: string): Record<string, unknown> => {
  const payload = token.split('.')[1];

  if (!payload) {
    return {};
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );

    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<
      string,
      unknown
    >;
  } catch {
    return {};
  }
};

export const createMonnifyTokenCache = (
  accessToken: string,
): MonnifyTokenCache => {
  const payload = decodeJwtPayload(accessToken);
  const exp = typeof payload.exp === 'number' ? payload.exp * 1000 : undefined;

  return {
    accessToken,
    expiresAt: exp ?? Date.now() + DEFAULT_TOKEN_TTL_MS,
  };
};

export const isMonnifyTokenFresh = (
  token?: MonnifyTokenCache,
): token is MonnifyTokenCache =>
  Boolean(token && token.expiresAt - TOKEN_REFRESH_BUFFER_MS > Date.now());

export const getValidMonnifyAccessToken = async (
  token: MonnifyTokenCache | undefined,
  refreshToken: () => Promise<MonnifyTokenCache>,
): Promise<MonnifyTokenCache> => {
  if (isMonnifyTokenFresh(token)) {
    return token;
  }

  return refreshToken();
};

export const stringifyMonnifyWebhookPayload = (
  body: unknown,
): string | Buffer => {
  if (typeof body === 'string' || Buffer.isBuffer(body)) {
    return body;
  }

  return JSON.stringify(body ?? {});
};

export const createMonnifyWebhookSignature = (
  body: unknown,
  secretKey: string,
): string =>
  crypto
    .createHmac('sha512', assertMonnifySecretKey(secretKey))
    .update(stringifyMonnifyWebhookPayload(body))
    .digest('hex');

export const verifyMonnifyWebhookSignature = (
  body: unknown,
  signature: string,
  secretKey: string,
): boolean => {
  if (!/^[a-f0-9]+$/i.test(signature) || signature.length % 2 !== 0) {
    return false;
  }

  const expected = Buffer.from(
    createMonnifyWebhookSignature(body, secretKey),
    'hex',
  );
  const received = Buffer.from(signature, 'hex');

  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
};
