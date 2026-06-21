import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildSafehavenHeaders,
  getSafehavenBaseUrl,
  getSafehavenErrorData,
  parseSafehavenResponse,
} from './config/safe.helper';
import type {
  CreateSafehavenSubAccountPayload,
  SafehavenEnvironment,
  SafehavenRequestOptions,
  SafehavenSubAccountResponse,
  SafehavenTokenCache,
  SafehavenTokenResponse,
} from './config/safe.types';

@Injectable()
export class SafehavenService {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientAssertion: string;
  private readonly isProduction: boolean;
  private readonly timeoutMs: number;
  private token?: SafehavenTokenCache;

  constructor(private readonly configService: ConfigService) {
    this.isProduction =
      this.configService.get<string>('NODE_ENV', 'development') ===
      'production';
    const environment = this.configService.get<SafehavenEnvironment>(
      'SAFEHAVEN_ENVIRONMENT',
      'sandbox',
    );

    this.baseUrl = getSafehavenBaseUrl(
      environment,
      this.configService.get<string>('SAFEHAVEN_BASE_URL'),
    );
    this.clientId = this.configService.get<string>('SAFEHAVEN_CLIENT_ID') ?? '';
    this.clientAssertion =
      this.configService.get<string>('SAFEHAVEN_CLIENT_ASSERTION') ?? '';
    this.timeoutMs = this.configService.get<number>(
      'SAFEHAVEN_TIMEOUT_MS',
      10_000,
    );
  }

  async getAccessToken(): Promise<SafehavenTokenResponse> {
    const response = await this.request<SafehavenTokenResponse>(
      '/oauth2/token',
      {
        method: 'POST',
        body: {
          grant_type: 'client_credentials',
          client_assertion_type:
            'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          client_id: this.getClientId(),
          client_assertion: this.getClientAssertion(),
        },
      },
    );

    this.token = {
      accessToken: response.access_token,
      expiresAt: Date.now() + response.expires_in * 1000,
    };

    return response;
  }

  async createSubAccount(
    payload: CreateSafehavenSubAccountPayload,
  ): Promise<SafehavenSubAccountResponse> {
    const accessToken = await this.getValidAccessToken();

    return this.request<SafehavenSubAccountResponse>(
      '/accounts/v2/subaccount',
      {
        method: 'POST',
        accessToken,
        headers: {
          ClientID: this.getClientId(),
        },
        body: {
          autoSweep: false,
          ...payload,
        },
      },
    );
  }

  private async getValidAccessToken(): Promise<string> {
    const tokenRefreshBufferMs = 60_000;

    if (
      this.token &&
      this.token.expiresAt - tokenRefreshBufferMs > Date.now()
    ) {
      return this.token.accessToken;
    }

    const token = await this.getAccessToken();
    return token.access_token;
  }

  private async request<T>(
    endpoint: string,
    options: SafehavenRequestOptions = {},
  ): Promise<T> {
    const headers = buildSafehavenHeaders(options);
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), this.timeoutMs);

    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        redirect: 'error',
        signal: abortController.signal,
      });
    } catch (error) {
      if (abortController.signal.aborted) {
        throw new GatewayTimeoutException('Safehaven request timed out');
      }

      throw new BadGatewayException({
        message: 'Safehaven request failed',
        data: getSafehavenErrorData(error, this.isProduction),
      });
    } finally {
      clearTimeout(timeout);
    }

    const responseBody = await parseSafehavenResponse(response);

    if (!response.ok) {
      this.throwSafehavenError(response.status, responseBody);
    }

    return responseBody as T;
  }

  private throwSafehavenError(status: number, responseBody: unknown): never {
    if (status === 401) {
      throw new UnauthorizedException({
        message: 'Unauthorized request to Safehaven',
        data: getSafehavenErrorData(responseBody, this.isProduction),
      });
    }

    throw new BadGatewayException({
      message: 'Safehaven request failed',
      data: getSafehavenErrorData(responseBody, this.isProduction),
    });
  }

  private getClientId(): string {
    if (!this.clientId) {
      throw new InternalServerErrorException(
        'SAFEHAVEN_CLIENT_ID is not configured',
      );
    }

    return this.clientId;
  }

  private getClientAssertion(): string {
    if (!this.clientAssertion) {
      throw new InternalServerErrorException(
        'SAFEHAVEN_CLIENT_ASSERTION is not configured',
      );
    }

    return this.clientAssertion;
  }
}
