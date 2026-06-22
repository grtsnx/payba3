import {
  BadGatewayException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { handleResponse } from 'src/middleware';
import type {
  MonoEnvironment,
  MonoRequestContext,
  MonoRequestOptions,
} from './mono.types';

export const MONO_BASE_URL = 'https://api.withmono.com';

export const getMonoBaseUrl = (baseUrlOverride?: string): string =>
  (baseUrlOverride ?? MONO_BASE_URL).replace(/\/+$/, '');

export const getMonoSecretKey = (
  environment: MonoEnvironment,
): string | undefined =>
  (environment === 'live'
    ? process.env.MONO_LIVE_SECRET_KEY
    : process.env.MONO_SECRET_KEY
  )?.trim();

export const assertMonoSecretKey = (secretKey: string): string => {
  if (!secretKey) {
    throw new InternalServerErrorException('MONO_SECRET_KEY is not configured');
  }

  return secretKey;
};

export const buildMonoHeaders = (
  secretKey: string,
): Record<string, string> => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'mono-sec-key': secretKey,
});

export const buildMonoRequestInit = (
  secretKey: string,
  options: MonoRequestOptions,
): RequestInit => ({
  method: options.method ?? 'GET',
  headers: buildMonoHeaders(secretKey),
  body: options.body ? JSON.stringify(options.body) : undefined,
  redirect: 'error',
});

export const parseMonoResponse = async (
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

export const getMonoErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Mono request failed';

export const requestMono = async <T = unknown>({
  baseUrl,
  secretKey,
  endpoint,
  options = {},
}: MonoRequestContext): Promise<T> => {
  const key = assertMonoSecretKey(secretKey);

  let response: Response;

  try {
    response = await fetch(
      `${baseUrl}${endpoint}`,
      buildMonoRequestInit(key, options),
    );
  } catch (error) {
    throw new BadGatewayException({
      message: 'Mono request failed',
      data: getMonoErrorMessage(error),
    });
  }

  const body = await parseMonoResponse(response);

  if (!response.ok) {
    throw new handleResponse(
      HttpStatus.BAD_REQUEST,
      'Mono request failed',
      body,
    );
  }

  return body as T;
};

export const buildMonoQuery = (
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
