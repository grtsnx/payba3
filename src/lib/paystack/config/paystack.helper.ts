import * as crypto from 'crypto';
import {
  BadGatewayException,
  HttpStatus,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { handleResponse } from 'src/middleware';
import type {
  NormalizedPaystackEnvironment,
  PaystackEnvironment,
  PaystackErrorResponse,
  PaystackRequestContext,
  PaystackRequestOptions,
  PaystackWebhookHeaders,
} from './paystack.types';

export const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export const normalizePaystackEnvironment = (
  environment?: string,
): NormalizedPaystackEnvironment =>
  environment === 'live' || environment === 'production' ? 'live' : 'sandbox';

export const getPaystackSecret = (
  environment: PaystackEnvironment,
): string | undefined =>
  normalizePaystackEnvironment(environment) === 'sandbox'
    ? process.env.PAYSTACK_SECRET_KEY
    : process.env.PAYSTACK_SECRET_KEY_LIVE;

export const getPaystackPreferredBank = (
  environment: PaystackEnvironment,
): string =>
  normalizePaystackEnvironment(environment) === 'sandbox'
    ? 'test-bank'
    : 'titan-paystack';

export const buildPaystackHeaders = (
  secret: string,
): Record<string, string> => ({
  Authorization: `Bearer ${secret}`,
  'Content-Type': 'application/json',
});

export const buildPaystackRequestInit = (
  secret: string,
  options: PaystackRequestOptions,
): RequestInit => ({
  method: options.method ?? 'GET',
  headers: buildPaystackHeaders(secret),
  body: options.body ? JSON.stringify(options.body) : undefined,
  redirect: 'error',
});

export const assertPaystackSecret = (secret: string): string => {
  if (!secret) {
    throw new InternalServerErrorException('Paystack secret key not set');
  }

  return secret;
};

export const parsePaystackResponse = async (
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

export const isPaystackErrorResponse = (
  value: unknown,
): value is PaystackErrorResponse =>
  typeof value === 'object' &&
  value !== null &&
  ('status' in value || 'message' in value);

export const getPaystackErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Request failed';

export const requestPaystack = async <T = unknown>({
  baseUrl,
  secret,
  endpoint,
  options = {},
}: PaystackRequestContext): Promise<T> => {
  const paystackSecret = assertPaystackSecret(secret);
  let response: Response;

  try {
    response = await fetch(
      `${baseUrl}${endpoint}`,
      buildPaystackRequestInit(paystackSecret, options),
    );
  } catch (error) {
    throw new BadGatewayException({
      message: 'Paystack request failed',
      data: getPaystackErrorMessage(error),
    });
  }

  const responseBody = await parsePaystackResponse(response);

  if (response.status === 401) {
    throw new UnauthorizedException('Unauthorized request to Paystack');
  }

  if (!response.ok) {
    if (
      isPaystackErrorResponse(responseBody) &&
      responseBody.status === false
    ) {
      throw new handleResponse(
        HttpStatus.BAD_REQUEST,
        responseBody.message ?? 'Paystack request failed',
        responseBody,
      );
    }

    throw new handleResponse(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Request failed',
      responseBody,
    );
  }

  return responseBody as T;
};

export const getPaystackSignature = (
  headers: PaystackWebhookHeaders,
): string | undefined => {
  const signature = headers['x-paystack-signature'];

  return Array.isArray(signature) ? signature[0] : signature;
};

export const createPaystackSignatureHash = (
  body: unknown,
  secret: string,
): string => {
  const payload =
    typeof body === 'string' || Buffer.isBuffer(body)
      ? body
      : JSON.stringify(body ?? {});

  return crypto.createHmac('sha512', secret).update(payload).digest('hex');
};

export const isTimingSafeEqual = (
  expectedSignature: string,
  receivedSignature: string,
): boolean => {
  const expected = Buffer.from(expectedSignature, 'hex');
  const received = Buffer.from(receivedSignature, 'hex');

  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
};
