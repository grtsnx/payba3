import { HttpStatus, Injectable } from '@nestjs/common';
import { handleResponse } from 'src/middleware';
import {
  assertSeerbitKeys,
  generateSeerbitBearerToken,
  requestSeerbit,
  SEERBIT_BASE_URL,
} from './config/seerbit.helper';
import type {
  SeerbitCreateVirtualAccountInput,
  SeerbitCreateVirtualAccountResult,
} from './config/seerbit.types';

@Injectable()
export class SeerbitService {
  private readonly baseUrl = SEERBIT_BASE_URL;
  private readonly publicKey: string;
  private readonly secretKey: string;
  private bearerToken: string | null = null;

  constructor() {
    this.publicKey = process.env.SEERBIT_PUBLIC_KEY?.trim() ?? '';
    this.secretKey = process.env.SEERBIT_SECRET_KEY?.trim() ?? '';
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
          bankVerificationNumber: '',
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
