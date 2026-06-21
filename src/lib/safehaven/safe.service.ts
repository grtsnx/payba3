import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildSafehavenTokenPayload,
  createSafehavenTokenCache,
  getSafehavenBaseUrl,
  getValidSafehavenAccessToken,
  requestSafehaven,
} from './config/safe.helper';
import type {
  CreateSafehavenSubAccountPayload,
  SafehavenEnvironment,
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
    const response = await requestSafehaven<SafehavenTokenResponse>({
      baseUrl: this.baseUrl,
      endpoint: '/oauth2/token',
      timeoutMs: this.timeoutMs,
      isProduction: this.isProduction,
      options: {
        method: 'POST',
        body: buildSafehavenTokenPayload(this.clientId, this.clientAssertion),
      },
    });

    this.token = createSafehavenTokenCache(response);

    return response;
  }

  async createSubAccount(
    payload: CreateSafehavenSubAccountPayload,
  ): Promise<SafehavenSubAccountResponse> {
    const accessToken = await getValidSafehavenAccessToken(this.token, () =>
      this.getAccessToken(),
    );

    return requestSafehaven<SafehavenSubAccountResponse>({
      baseUrl: this.baseUrl,
      endpoint: '/accounts/v2/subaccount',
      timeoutMs: this.timeoutMs,
      isProduction: this.isProduction,
      options: {
        method: 'POST',
        accessToken,
        headers: {
          ClientID: this.clientId,
        },
        body: {
          autoSweep: false,
          ...payload,
        },
      },
    });
  }
}
