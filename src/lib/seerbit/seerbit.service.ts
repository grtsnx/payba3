import { HttpStatus, Injectable } from '@nestjs/common';
import { handleResponse } from '../shared/response.helper';
import {
  assertSeerbitKeys,
  generateSeerbitBearerToken,
  getSeerbitBaseUrl,
  getSeerbitCredentials,
  requestSeerbit,
} from './config/seerbit.helper';
import type {
  SeerbitCreateVirtualAccountInput,
  SeerbitCreateVirtualAccountResult,
  SeerbitEnvironment,
} from './config/seerbit.types';

@Injectable()
export class SeerbitService {
  private readonly baseUrl: string;
  private readonly publicKey: string;
  private readonly secretKey: string;
  private bearerToken: string | null = null;

  constructor() {
    const environment = (process.env.SEERBIT_ENVIRONMENT ??
      'sandbox') as SeerbitEnvironment;
    const credentials = getSeerbitCredentials(environment);

    this.baseUrl = getSeerbitBaseUrl(environment, process.env.SEERBIT_BASE_URL);
    this.publicKey = credentials.publicKey;
    this.secretKey = credentials.secretKey;
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
        HttpStatus.BAD_REQUEST,
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
