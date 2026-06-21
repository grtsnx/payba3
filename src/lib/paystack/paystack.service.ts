import {
  BadGatewayException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { handleResponse } from 'src/middleware';
import {
  buildPaystackRequestInit,
  createPaystackSignatureHash,
  getPaystackErrorMessage,
  getPaystackPreferredBank,
  getPaystackSecret,
  getPaystackSignature,
  isPaystackErrorResponse,
  isTimingSafeEqual,
  parsePaystackResponse,
  PAYSTACK_BASE_URL,
} from './config/paystack.helper';
import type {
  PaystackBank,
  PaystackChargeAuthorizationInput,
  PaystackCreateCustomerInput,
  PaystackCreateSubscriptionInput,
  PaystackCreateTransferRecipientInput,
  PaystackEnvironment,
  PaystackInitiateTransferInput,
  PaystackListSubscriptionsOptions,
  PaystackOneTimeCheckoutInput,
  PaystackResponse,
  PaystackSubscriptionCheckoutInput,
  PaystackWebhookEvent,
  PaystackWebhookHeaders,
  PaystackRequestOptions,
} from './config/paystack.types';

@Injectable()
export class PaystackService {
  private readonly paystackSecret: string;
  private readonly preferredBank: string;
  private readonly baseUrl = PAYSTACK_BASE_URL;

  constructor() {
    const environment = (process.env.NODE_ENV ?? 'development') as PaystackEnvironment;
    const key = getPaystackSecret(environment);

    if (!key) {
      throw new Error(
        'Paystack secret key is not configured. Set PAYSTACK_SECRET_KEY or PAYSTACK_SECRET_KEY_LIVE.',
      );
    }

    this.paystackSecret = key;
    this.preferredBank = getPaystackPreferredBank(environment);
  }

  private async makeRequest<T = unknown>(
    endpoint: string,
    options: PaystackRequestOptions = {},
  ): Promise<T> {
    if (!this.paystackSecret) {
      throw new InternalServerErrorException('Paystack secret key not set');
    }

    let response: Response;

    try {
      response = await fetch(
        `${this.baseUrl}${endpoint}`,
        buildPaystackRequestInit(this.paystackSecret, options),
      );
    } catch (error) {
      throw new BadGatewayException({
        message: 'Paystack request failed',
        data: getPaystackErrorMessage(error),
      });
    }

    const responseBody = await parsePaystackResponse(response);

    if (response.status === HttpStatus.UNAUTHORIZED) {
      throw new UnauthorizedException('Unauthorized request to Paystack');
    }

    if (!response.ok) {
      if (isPaystackErrorResponse(responseBody) && responseBody.status === false) {
        throw new handleResponse(
          HttpStatus.BAD_REQUEST,
          responseBody.message ?? 'Paystack request failed',
          responseBody,
        );
      }

      throw new handleResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Request failed',
        responseBody,
      );
    }

    return responseBody as T;
  }

  async createPaystackCustomer(
    email: string,
    firstName: string,
    lastName: string,
    phone: string,
  ): Promise<unknown> {
    return this.makeRequest('/customer', {
      method: 'POST',
      body: {
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
      },
    });
  }

  async createDedicatedAccount(customerCode: string): Promise<unknown> {
    return this.makeRequest('/dedicated_account', {
      method: 'POST',
      body: {
        customer: customerCode,
        preferred_bank: this.preferredBank,
      },
    });
  }

  async retrieveDedicatedAccount(customerCode: string): Promise<unknown> {
    return this.makeRequest(`/dedicated_account/${customerCode}`);
  }

  async retrieveCustomerCode(email: string): Promise<string | undefined> {
    const response = await this.makeRequest<PaystackResponse<PaystackCustomer[]>>(
      `/customer?email=${encodeURIComponent(email)}`,
    );

    return response.data[0]?.customer_code;
  }

  async initializeTransaction(
    email: string,
    amount: number,
    currency: string,
    callback_url?: string,
  ): Promise<unknown> {
    return this.makeRequest('/transaction/initialize', {
      method: 'POST',
      body: {
        email,
        amount: amount * 100,
        currency,
        callback_url,
      },
    });
  }

  async initializeSubscriptionCheckout(
    data: PaystackSubscriptionCheckoutInput,
  ): Promise<unknown> {
    const payload: Record<string, unknown> = {
      email: data.email,
      plan: data.plan,
      callback_url: data.callback_url,
      metadata: data.metadata,
      currency: data.currency ?? 'NGN',
    };

    if (data.amountInKobo != null && data.amountInKobo > 0) {
      payload.amount = Math.round(data.amountInKobo);
    }

    return this.makeRequest('/transaction/initialize', {
      method: 'POST',
      body: payload,
    });
  }

  async listCustomerSubscriptions(
    opts: PaystackListSubscriptionsOptions,
  ): Promise<unknown> {
    const params = new URLSearchParams();
    if (opts.customerId != null) {
      params.set('customer', String(opts.customerId));
    }
    if (opts.planId != null) {
      params.set('plan', String(opts.planId));
    }
    params.set('perPage', String(opts.perPage ?? 50));
    const qs = params.toString();
    return this.makeRequest(`/subscription${qs ? `?${qs}` : ''}`);
  }

  async verifyTransaction(reference: string): Promise<unknown> {
    return this.makeRequest(`/transaction/verify/${reference}`);
  }

  async initializeOneTimeCheckout(
    data: PaystackOneTimeCheckoutInput,
  ): Promise<unknown> {
    return this.makeRequest('/transaction/initialize', {
      method: 'POST',
      body: {
        email: data.email,
        amount: Math.round(data.amountInKobo),
        currency: data.currency ?? 'NGN',
        callback_url: data.callback_url,
        metadata: data.metadata,
        reference: data.reference,
      },
    });
  }

  async chargeAuthorization(data: PaystackChargeAuthorizationInput): Promise<unknown> {
    return this.makeRequest('/transaction/charge_authorization', {
      method: 'POST',
      body: {
        email: data.email,
        amount: Math.round(data.amountInKobo),
        authorization_code: data.authorization_code,
        reference: data.reference,
        metadata: data.metadata,
        currency: data.currency ?? 'NGN',
      },
    });
  }

  async getBanks(): Promise<PaystackResponse<PaystackBank[]>> {
    return this.makeRequest<PaystackResponse<PaystackBank[]>>('/bank');
  }

  async getBankById(bankId: number): Promise<PaystackBank | null> {
    const response = await this.getBanks();
    return response.data.find((bank) => bank.id === bankId) ?? null;
  }

  async getBankByCode(bankCode: string): Promise<PaystackBank | null> {
    const response = await this.getBanks();
    return response.data.find((bank) => bank.code === bankCode) ?? null;
  }

  async resolveBankAccount(
    accountNumber: string,
    bankCode: string,
  ): Promise<unknown> {
    try {
      const response = await this.makeRequest<PaystackResponse>(
        `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof handleResponse && error.getStatus() === HttpStatus.BAD_REQUEST) {
        throw new handleResponse(
          HttpStatus.BAD_REQUEST,
          'Invalid account number or bank code',
        );
      }

      throw new handleResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to resolve account details',
      );
    }
  }

  verifyWebhookSignature(body: unknown, headers: PaystackWebhookHeaders): void {
    const signature = getPaystackSignature(headers);
    if (!signature) {
      throw new UnauthorizedException('Invalid Paystack signature');
    }

    const hash = createPaystackSignatureHash(body, this.paystackSecret);

    if (!isTimingSafeEqual(hash, signature)) {
      throw new handleResponse(
        HttpStatus.FORBIDDEN,
        'Invalid Paystack signature',
      );
    }
  }

  handlePaystackWebhook(
    body: PaystackWebhookEvent,
    headers: PaystackWebhookHeaders,
  ): unknown {
    this.verifyWebhookSignature(body, headers);

    if (body.event !== 'charge.success') {
      return false;
    }

    return body.data;
  }

  async fetchPlan(planCode: string): Promise<unknown> {
    return this.makeRequest(`/plan/${planCode}`);
  }

  async createSubscription(data: PaystackCreateSubscriptionInput): Promise<unknown> {
    if (!data.authorization?.trim()) {
      throw new handleResponse(
        HttpStatus.BAD_REQUEST,
        'No saved payment method. Complete Paystack checkout to authorize billing.',
        {
          code: 'no_active_authorizations_for_customer',
          type: 'validation_error',
          meta: {
            nextStep:
              'Pass the plan code to transaction/initialize and complete payment first.',
          },
        },
      );
    }

    return this.makeRequest('/subscription', {
      method: 'POST',
      body: data,
    });
  }

  async fetchSubscription(idOrCode: string): Promise<unknown> {
    return this.makeRequest(`/subscription/${idOrCode}`);
  }

  async disableSubscription(code: string, token: string): Promise<unknown> {
    return this.makeRequest('/subscription/disable', {
      method: 'POST',
      body: {
        code,
        token,
      },
    });
  }

  async createCustomer(data: PaystackCreateCustomerInput): Promise<unknown> {
    return this.makeRequest('/customer', {
      method: 'POST',
      body: data,
    });
  }

  async fetchCustomerByEmail(email: string): Promise<unknown> {
    return this.makeRequest(`/customer?email=${encodeURIComponent(email)}`);
  }

  async createTransferRecipient(
    data: PaystackCreateTransferRecipientInput,
  ): Promise<unknown> {
    return this.makeRequest('/transferrecipient', {
      method: 'POST',
      body: data,
    });
  }

  async deleteTransferRecipient(idOrCode: string): Promise<unknown> {
    return this.makeRequest(`/transferrecipient/${idOrCode}`, {
      method: 'DELETE',
    });
  }

  async initiateTransfer(data: PaystackInitiateTransferInput): Promise<unknown> {
    return this.makeRequest('/transfer', {
      method: 'POST',
      body: data,
    });
  }

  async getPaystackBalance(): Promise<unknown> {
    return this.makeRequest('/balance');
  }
}
