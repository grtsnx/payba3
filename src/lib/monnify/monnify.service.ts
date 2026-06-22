import { Injectable } from '@nestjs/common';
import {
  assertMonnifyContractCode,
  buildMonnifyQuery,
  fetchMonnifyToken,
  getMonnifyBaseUrl,
  getMonnifyCredentials,
  getValidMonnifyAccessToken,
  requestMonnify,
  verifyMonnifyWebhookSignature,
} from './config/monnify.helper';
import type {
  MonnifyCredentials,
  MonnifyEnvironment,
  MonnifyInitializeTransactionInput,
  MonnifyRefundInput,
  MonnifyRequestOptions,
  MonnifyReservedAccountInput,
  MonnifyResponse,
  MonnifySubAccountInput,
  MonnifyTokenCache,
  MonnifyTransactionStatusQuery,
  MonnifyTransferInput,
} from './config/monnify.types';

@Injectable()
export class MonnifyService {
  private readonly baseUrl: string;
  private readonly credentials: MonnifyCredentials;
  private token?: MonnifyTokenCache;

  constructor() {
    const environment = (process.env.MONNIFY_ENVIRONMENT ??
      'sandbox') as MonnifyEnvironment;

    this.baseUrl = getMonnifyBaseUrl(environment, process.env.MONNIFY_BASE_URL);
    this.credentials = getMonnifyCredentials(environment);
  }

  async getAccessToken(): Promise<string> {
    this.token = await getValidMonnifyAccessToken(this.token, () =>
      fetchMonnifyToken(this.baseUrl, this.credentials),
    );

    return this.token.accessToken;
  }

  async request<T = unknown>(
    endpoint: string,
    options: MonnifyRequestOptions = {},
  ): Promise<T> {
    const token = options.token ?? (await this.getAccessToken());

    return requestMonnify<T>({
      baseUrl: this.baseUrl,
      endpoint,
      options: {
        ...options,
        token,
      },
    });
  }

  async initializeTransaction(
    input: MonnifyInitializeTransactionInput,
  ): Promise<MonnifyResponse> {
    return this.request('/api/v1/merchant/transactions/init-transaction', {
      method: 'POST',
      body: {
        ...input,
        currencyCode: input.currencyCode ?? 'NGN',
        contractCode: assertMonnifyContractCode(
          input.contractCode ?? this.credentials.contractCode,
        ),
      },
    });
  }

  async initializeBankTransfer(
    input: MonnifyInitializeTransactionInput,
  ): Promise<MonnifyResponse> {
    return this.request('/api/v1/merchant/bank-transfer/init-payment', {
      method: 'POST',
      body: {
        ...input,
        currencyCode: input.currencyCode ?? 'NGN',
        contractCode: assertMonnifyContractCode(
          input.contractCode ?? this.credentials.contractCode,
        ),
      },
    });
  }

  async getTransactionStatus(
    transactionReference: string,
  ): Promise<MonnifyResponse> {
    return this.request(
      `/api/v2/transactions/${encodeURIComponent(transactionReference)}`,
    );
  }

  async queryTransactionStatus(
    query: MonnifyTransactionStatusQuery,
  ): Promise<MonnifyResponse> {
    return this.request(
      `/api/v2/merchant/transactions/query${buildMonnifyQuery(query)}`,
    );
  }

  async createReservedAccount(
    input: MonnifyReservedAccountInput,
  ): Promise<MonnifyResponse> {
    return this.request('/api/v2/bank-transfer/reserved-accounts', {
      method: 'POST',
      body: {
        currencyCode: 'NGN',
        contractCode: assertMonnifyContractCode(
          input.contractCode ?? this.credentials.contractCode,
        ),
        getAllAvailableBanks: true,
        ...input,
      },
    });
  }

  async getReservedAccountDetails(
    accountReference: string,
  ): Promise<MonnifyResponse> {
    return this.request(
      `/api/v2/bank-transfer/reserved-accounts/${encodeURIComponent(accountReference)}`,
    );
  }

  async initiateSingleTransfer(
    input: MonnifyTransferInput,
  ): Promise<MonnifyResponse> {
    return this.request('/api/v2/disbursements/single', {
      method: 'POST',
      body: {
        currency: 'NGN',
        ...input,
      },
    });
  }

  async createSubAccounts(
    input: MonnifySubAccountInput[],
  ): Promise<MonnifyResponse> {
    return this.request('/api/v1/sub-accounts', {
      method: 'POST',
      body: input.map((account) => ({
        currencyCode: 'NGN',
        ...account,
      })),
    });
  }

  async initiateRefund(input: MonnifyRefundInput): Promise<MonnifyResponse> {
    return this.request('/api/v1/refunds/initiate-refund', {
      method: 'POST',
      body: input,
    });
  }

  verifyWebhookSignature(body: unknown, signature: string): boolean {
    return verifyMonnifyWebhookSignature(
      body,
      signature,
      this.credentials.secretKey,
    );
  }
}
