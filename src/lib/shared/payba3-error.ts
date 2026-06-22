export const PAYBA3_HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  GATEWAY_TIMEOUT: 504,
} as const;

export type Payba3HttpStatusCode =
  (typeof PAYBA3_HTTP_STATUS)[keyof typeof PAYBA3_HTTP_STATUS];

export type Payba3ErrorOptions = {
  statusCode?: number;
  provider?: string;
  code?: string;
  data?: unknown;
  cause?: unknown;
};

export type Payba3ErrorBody = {
  statusCode: number;
  statusType: string;
  message: string;
  provider?: string;
  code?: string;
  data?: unknown;
};

const STATUS_TEXT: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  500: 'INTERNAL_SERVER_ERROR',
  502: 'BAD_GATEWAY',
  504: 'GATEWAY_TIMEOUT',
};

export const getPayba3StatusText = (statusCode: number): string =>
  STATUS_TEXT[statusCode] ?? 'ERROR';

export const getPayba3ErrorMessage = (
  error: unknown,
  fallback: string,
): string => (error instanceof Error ? error.message : fallback);

export class Payba3Error extends Error {
  readonly statusCode: number;
  readonly statusType: string;
  readonly provider?: string;
  readonly code?: string;
  readonly data?: unknown;

  constructor(message: string, options: Payba3ErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = 'Payba3Error';
    this.statusCode =
      options.statusCode ?? PAYBA3_HTTP_STATUS.INTERNAL_SERVER_ERROR;
    this.statusType = getPayba3StatusText(this.statusCode);
    this.provider = options.provider;
    this.code = options.code;
    this.data = options.data;
  }

  getStatus(): number {
    return this.statusCode;
  }

  getResponse(): Payba3ErrorBody {
    const response: Payba3ErrorBody = {
      statusCode: this.statusCode,
      statusType: this.statusType,
      message: this.message,
    };

    if (this.provider !== undefined) {
      response.provider = this.provider;
    }

    if (this.code !== undefined) {
      response.code = this.code;
    }

    if (this.data !== undefined) {
      response.data = this.data;
    }

    return response;
  }
}
