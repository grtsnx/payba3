import {
  buildSafehavenTokenPayload,
  createSafehavenTokenCache,
  getSafehavenBaseUrl,
  getSafehavenClientHeaderValue,
  getSafehavenCredentials,
  getValidSafehavenToken,
  normalizeSafehavenEnvironment,
  requestSafehaven,
} from './config/safe.helper';
import type {
  CreateSafehavenSubAccountPayload,
  SafehavenEnvironment,
  SafehavenServiceOptions,
  SafehavenSubAccountResponse,
  SafehavenTokenCache,
  SafehavenTokenResponse,
} from './config/safe.types';

export class SafehavenService {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientAssertion: string;
  private readonly isProduction: boolean;
  private readonly timeoutMs: number;
  private token?: SafehavenTokenCache;

  constructor(options: SafehavenServiceOptions = {}) {
    const environment = normalizeSafehavenEnvironment(
      options.environment ??
        process.env.SAFEHAVEN_ENVIRONMENT ??
        process.env.NODE_ENV,
    ) as SafehavenEnvironment;
    const credentials = getSafehavenCredentials(environment);

    this.isProduction =
      options.isProduction ?? process.env.NODE_ENV === 'production';
    this.baseUrl = getSafehavenBaseUrl(
      environment,
      options.baseUrl ?? process.env.SAFEHAVEN_BASE_URL,
    );
    this.clientId =
      options.clientId ??
      options.credentials?.clientId ??
      credentials.clientId ??
      '';
    this.clientAssertion =
      options.clientAssertion ??
      options.credentials?.clientAssertion ??
      credentials.clientAssertion ??
      '';
    this.timeoutMs =
      options.timeoutMs ?? (Number(process.env.SAFEHAVEN_TIMEOUT_MS) || 10_000);
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
    const token = await getValidSafehavenToken(this.token, () =>
      this.getAccessToken(),
    );
    this.token = token;

    return requestSafehaven<SafehavenSubAccountResponse>({
      baseUrl: this.baseUrl,
      endpoint: '/accounts/v2/subaccount',
      timeoutMs: this.timeoutMs,
      isProduction: this.isProduction,
      options: {
        method: 'POST',
        accessToken: token.accessToken,
        headers: {
          ClientID: getSafehavenClientHeaderValue(token, this.clientId),
        },
        body: {
          autoSweep: false,
          ...payload,
        },
      },
    });
  }
}
