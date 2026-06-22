import {
  buildMonoQuery,
  getMonoBaseUrl,
  getMonoSecretKey,
  normalizeMonoEnvironment,
  requestMono,
} from './config/mono.helper';
import type {
  MonoBvnLookupInput,
  MonoDisbursementSourceAccountInput,
  MonoEnvironment,
  MonoInitiateAccountLinkingInput,
  MonoInitiatePaymentInput,
  MonoRequestOptions,
  MonoResponse,
  MonoServiceOptions,
} from './config/mono.types';

export class MonoService {
  private readonly baseUrl: string;
  private readonly secretKey: string;

  constructor(options: MonoServiceOptions = {}) {
    const environment = normalizeMonoEnvironment(
      options.environment ??
        process.env.MONO_ENVIRONMENT ??
        process.env.NODE_ENV,
    ) as MonoEnvironment;

    this.baseUrl = getMonoBaseUrl(options.baseUrl ?? process.env.MONO_BASE_URL);
    this.secretKey = options.secretKey ?? getMonoSecretKey(environment) ?? '';
  }

  async request<T = unknown>(
    endpoint: string,
    options?: MonoRequestOptions,
  ): Promise<T> {
    return requestMono<T>({
      baseUrl: this.baseUrl,
      secretKey: this.secretKey,
      endpoint,
      options,
    });
  }

  async initiateAccountLinking(
    input: MonoInitiateAccountLinkingInput,
  ): Promise<MonoResponse> {
    return this.request('/v2/accounts/initiate', {
      method: 'POST',
      body: input,
    });
  }

  async exchangeToken(code: string): Promise<MonoResponse> {
    return this.request('/v2/accounts/auth', {
      method: 'POST',
      body: { code },
    });
  }

  async getAccount(accountId: string): Promise<MonoResponse> {
    return this.request(`/v2/accounts/${encodeURIComponent(accountId)}`);
  }

  async getTransactions(
    accountId: string,
    query: Record<string, string | number | boolean | undefined> = {},
  ): Promise<MonoResponse> {
    return this.request(
      `/v2/accounts/${encodeURIComponent(accountId)}/transactions${buildMonoQuery(query)}`,
    );
  }

  async initiatePayment(
    input: MonoInitiatePaymentInput,
  ): Promise<MonoResponse> {
    return this.request('/v2/payments/initiate', {
      method: 'POST',
      body: input,
    });
  }

  async verifyPayment(reference: string): Promise<MonoResponse> {
    return this.request(`/v2/payments/verify/${encodeURIComponent(reference)}`);
  }

  async createDisbursementSourceAccount(
    input: MonoDisbursementSourceAccountInput,
  ): Promise<MonoResponse> {
    return this.request('/v3/payments/disburse/source-accounts', {
      method: 'POST',
      body: input,
    });
  }

  async initiateBvnLookup(input: MonoBvnLookupInput): Promise<MonoResponse> {
    return this.request('/v2/lookup/bvn/initiate', {
      method: 'POST',
      body: input,
    });
  }
}
