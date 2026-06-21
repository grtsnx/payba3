import type {
  SafehavenBaseUrls,
  SafehavenEnvironment,
  SafehavenRequestHeaders,
  SafehavenRequestOptions,
} from './safe.types';

export const SAFEHAVEN_BASE_URLS: SafehavenBaseUrls = {
  sandbox: 'https://api.sandbox.safehavenmfb.com',
  live: 'https://api.safehavenmfb.com',
};

export const getSafehavenBaseUrl = (
  environment: SafehavenEnvironment,
  baseUrlOverride?: string,
): string =>
  (baseUrlOverride ?? SAFEHAVEN_BASE_URLS[environment]).replace(/\/+$/, '');

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
    return error.message;
  }

  return error;
};
