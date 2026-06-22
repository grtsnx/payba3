import * as crypto from 'crypto';
import {
  BadGatewayException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { handleResponse } from 'src/middleware';
import type {
  OPayBaseUrls,
  OPayCredentials,
  OPayEnvironment,
  OPayRequestContext,
  OPayRequestOptions,
  OPayResponse,
} from './opay.types';

export const OPAY_BASE_URLS: OPayBaseUrls = {
  sandbox: 'https://testapi.opaycheckout.com',
  live: 'https://liveapi.opaycheckout.com',
};

export const getOPayBaseUrl = (
  environment: OPayEnvironment,
  baseUrlOverride?: string,
): string =>
  (baseUrlOverride ?? OPAY_BASE_URLS[environment]).replace(/\/+$/, '');

export const getOPayCredentials = (
  environment: OPayEnvironment,
): OPayCredentials => ({
  merchantId:
    (environment === 'live'
      ? process.env.OPAY_LIVE_MERCHANT_ID
      : process.env.OPAY_MERCHANT_ID
    )?.trim() ?? '',
  publicKey:
    (environment === 'live'
      ? process.env.OPAY_LIVE_PUBLIC_KEY
      : process.env.OPAY_PUBLIC_KEY
    )?.trim() ?? '',
  secretKey:
    (environment === 'live'
      ? process.env.OPAY_LIVE_SECRET_KEY
      : process.env.OPAY_SECRET_KEY
    )?.trim() ?? '',
});

export const assertOPayCredentials = (
  credentials: OPayCredentials,
  authMode: OPayRequestOptions['authMode'],
): void => {
  if (!credentials.merchantId) {
    throw new InternalServerErrorException(
      'OPAY_MERCHANT_ID is not configured',
    );
  }

  if (authMode === 'publicKey' && !credentials.publicKey) {
    throw new InternalServerErrorException('OPAY_PUBLIC_KEY is not configured');
  }

  if (authMode === 'signature' && !credentials.secretKey) {
    throw new InternalServerErrorException('OPAY_SECRET_KEY is not configured');
  }
};

export const sortObjectKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  if (typeof value === 'object' && value !== null) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortObjectKeys((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
};

export const stringifyOPayPayload = (body: unknown): string =>
  JSON.stringify(sortObjectKeys(body ?? {}));

export const createOPaySignature = (body: unknown, secretKey: string): string =>
  crypto
    .createHmac('sha512', secretKey)
    .update(stringifyOPayPayload(body))
    .digest('hex');

export const buildOPayHeaders = (
  credentials: OPayCredentials,
  options: OPayRequestOptions,
): Record<string, string> => {
  const token =
    options.authMode === 'publicKey'
      ? credentials.publicKey
      : createOPaySignature(options.body, credentials.secretKey);

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    MerchantId: credentials.merchantId,
  };
};

export const buildOPayRequestInit = (
  credentials: OPayCredentials,
  options: OPayRequestOptions,
): RequestInit => ({
  method: options.method ?? 'POST',
  headers: buildOPayHeaders(credentials, options),
  body: options.body ? JSON.stringify(options.body) : undefined,
  redirect: 'error',
});

export const parseOPayResponse = async (
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

export const isOPayResponse = (value: unknown): value is OPayResponse =>
  typeof value === 'object' &&
  value !== null &&
  'code' in value &&
  'message' in value;

export const getOPayErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'OPay request failed';

export const requestOPay = async <T = unknown>({
  baseUrl,
  credentials,
  endpoint,
  options,
}: OPayRequestContext): Promise<T> => {
  assertOPayCredentials(credentials, options.authMode);

  let response: Response;

  try {
    response = await fetch(
      `${baseUrl}${endpoint}`,
      buildOPayRequestInit(credentials, options),
    );
  } catch (error) {
    throw new BadGatewayException({
      message: 'OPay request failed',
      data: getOPayErrorMessage(error),
    });
  }

  const body = await parseOPayResponse(response);

  if (!response.ok) {
    throw new handleResponse(
      HttpStatus.BAD_REQUEST,
      'OPay request failed',
      body,
    );
  }

  if (isOPayResponse(body) && body.code !== '00000') {
    throw new handleResponse(
      HttpStatus.BAD_REQUEST,
      body.message || 'OPay request failed',
      body,
    );
  }

  return body as T;
};

export const verifyOPayCallbackSignature = (
  body: unknown,
  signature: string,
  secretKey: string,
): boolean => {
  const expected = createOPaySignature(body, secretKey);
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(signature, 'hex');

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
};
