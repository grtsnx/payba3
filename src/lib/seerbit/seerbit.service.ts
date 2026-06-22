import { handleResponse, PAYBA3_HTTP_STATUS } from '../shared';
import {
  assertSeerbitKeys,
  generateSeerbitBearerToken,
  getSeerbitBaseUrl,
  getSeerbitCredentials,
  normalizeSeerbitEnvironment,
  requestSeerbit,
} from './config/seerbit.helper';
import type {
  SeerbitCreateVirtualAccountInput,
  SeerbitCreateVirtualAccountResult,
  SeerbitEnvironment,
  SeerbitServiceOptions,
} from './config/seerbit.types';

export class SeerbitService {
  private readonly baseUrl: string;
  private readonly publicKey: string;
  private readonly secretKey: string;
  private bearerToken: string | null = null;

  constructor(options: SeerbitServiceOptions = {}) {
    const environment = normalizeSeerbitEnvironment(
      options.environment ??
        process.env.SEERBIT_ENVIRONMENT ??
        process.env.NODE_ENV,
    ) as SeerbitEnvironment;
    const credentials = getSeerbitCredentials(environment);

    this.baseUrl = getSeerbitBaseUrl(
      environment,
      options.baseUrl ?? process.env.SEERBIT_BASE_URL,
    );
    this.publicKey =
      options.publicKey ??
      options.credentials?.publicKey ??
      credentials.publicKey;
    this.secretKey =
      options.secretKey ??
      options.credentials?.secretKey ??
      credentials.secretKey;
  }

  async getBearerToken(): Promise<string> {
    assertSeerbitKeys(this.publicKey, this.secretKey);

    if (!this.bearerToken) {
      this.bearerToken = await generateSeerbitBearerToken(
        this.baseUrl,
        this.publicKey,
        this.secretKey,
      );
    }

    return this.bearerToken;
  }

  async createVirtualAccount(
    input: SeerbitCreateVirtualAccountInput,
  ): Promise<SeerbitCreateVirtualAccountResult> {
    const token = await this.getBearerToken();
    const body = await requestSeerbit<SeerbitCreateVirtualAccountResult>({
      baseUrl: this.baseUrl,
      endpoint: '/virtual-accounts',
      options: {
        method: 'POST',
        token,
        body: {
          publicKey: this.publicKey,
          fullName: input.fullName,
          bankVerificationNumber: input.bankVerificationNumber ?? '',
          currency: input.currency ?? 'NGN',
          country: input.country ?? 'NG',
          reference: input.reference,
          email: input.email,
        },
      },
    });

    if (body.status !== 'SUCCESS' || !body.data?.payments?.accountNumber) {
      throw new handleResponse(
        PAYBA3_HTTP_STATUS.BAD_REQUEST,
        body.data?.message ?? 'Failed to create Seerbit virtual account',
        body,
      );
    }

    return body;
  }

  async getVirtualAccount(
    reference: string,
  ): Promise<SeerbitCreateVirtualAccountResult | null> {
    const token = await this.getBearerToken();

    try {
      const body = await requestSeerbit<SeerbitCreateVirtualAccountResult>({
        baseUrl: this.baseUrl,
        endpoint: `/virtual-accounts/${encodeURIComponent(reference)}`,
        options: { token },
      });

      if (body.status === 'SUCCESS' && body.data?.payments?.accountNumber) {
        return body;
      }

      return null;
    } catch {
      return null;
    }
  }
}
