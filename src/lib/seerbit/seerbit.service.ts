import {
  Injectable,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { handleResponse } from 'src/middleware';
import { getDvaProviderEnv } from 'src/lib/wallet/dva-provider.config';

export interface SeerbitCreateVirtualAccountInput {
  fullName: string;
  email: string;
  reference: string;
  currency?: string;
  country?: string;
}

export interface SeerbitVirtualAccountPayments {
  reference: string;
  walletName: string;
  bankName: string;
  accountNumber: string;
}

export interface SeerbitCreateVirtualAccountResult {
  status: string;
  data: {
    code: string;
    payments: SeerbitVirtualAccountPayments;
    message: string;
  };
}

@Injectable()
export class SeerbitService {
  private readonly baseUrl = 'https://seerbitapi.com/api/v2';
  private readonly publicKey: string;
  private readonly secretKey: string;
  private bearerToken: string | null = null;

  constructor(private readonly httpService: HttpService) {
    this.publicKey = process.env.SEERBIT_PUBLIC_KEY?.trim() ?? '';
    this.secretKey = process.env.SEERBIT_SECRET_KEY?.trim() ?? '';

    try {
      if (getDvaProviderEnv() === 'seerbit') {
        if (!this.publicKey || !this.secretKey) {
          throw new Error(
            'Seerbit keys are not configured. Set SEERBIT_PUBLIC_KEY and SEERBIT_SECRET_KEY.',
          );
        }
      }
    } catch {
      // DVA_PROVIDER invalid at boot — Seerbit keys validated on first use
    }
  }

  private async generateBearerToken(): Promise<string> {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/encrypt/keys`,
        { key: `${this.secretKey}.${this.publicKey}` },
        { headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const encryptedKey = response.data?.data?.EncryptedSecKey?.encryptedKey as
      | string
      | undefined;

    if (response.data?.status !== 'SUCCESS' || !encryptedKey) {
      throw new handleResponse(
        HttpStatus.BAD_REQUEST,
        'Failed to obtain Seerbit bearer token',
        response.data,
      );
    }

    return encryptedKey;
  }

  /**
   * Seerbit bearer token generated from SECRET_KEY.PUBLIC_KEY.
   * Generated once per process lifetime (static in-memory).
   */
  async getBearerToken(): Promise<string> {
    if (!this.publicKey || !this.secretKey) {
      throw new InternalServerErrorException('Seerbit secret keys not set');
    }

    if (!this.bearerToken) {
      this.bearerToken = await this.generateBearerToken();
    }

    return this.bearerToken;
  }

  async createVirtualAccount(
    input: SeerbitCreateVirtualAccountInput,
  ): Promise<SeerbitCreateVirtualAccountResult> {
    const token = await this.getBearerToken();
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/virtual-accounts`,
        {
          publicKey: this.publicKey,
          fullName: input.fullName,
          bankVerificationNumber: '',
          currency: input.currency ?? 'NGN',
          country: input.country ?? 'NG',
          reference: input.reference,
          email: input.email,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      ),
    );
    const body = response.data as SeerbitCreateVirtualAccountResult;

    if (body?.status !== 'SUCCESS' || !body?.data?.payments?.accountNumber) {
      throw new handleResponse(
        HttpStatus.BAD_REQUEST,
        body?.data?.message ?? 'Failed to create Seerbit virtual account',
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
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/virtual-accounts/${encodeURIComponent(reference)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );
      const body = response.data as SeerbitCreateVirtualAccountResult;
      if (body?.status === 'SUCCESS' && body?.data?.payments?.accountNumber) {
        return body;
      }
      return null;
    } catch {
      return null;
    }
  }
}
