import { handleResponse, PAYBA3_HTTP_STATUS } from '../shared';
import {
  createPaystackSignatureHash,
  getPaystackPreferredBank,
  getPaystackSecret,
  getPaystackSignature,
  isTimingSafeEqual,
  PAYSTACK_BASE_URL,
  requestPaystack,
} from './config/paystack.helper';
import type {
  PaystackBank,
  PaystackChargeAuthorizationInput,
  PaystackCustomer,
  PaystackCreateCustomerInput,
  PaystackCreateSubscriptionInput,
  PaystackCreateTransferRecipientInput,
  PaystackEnvironment,
  PaystackInitiateTransferInput,
  PaystackListSubscriptionsOptions,
  PaystackOneTimeCheckoutInput,
  PaystackResponse,
  PaystackServiceOptions,
  PaystackSubscriptionCheckoutInput,
  PaystackWebhookEvent,
  PaystackWebhookHeaders,
} from './config/paystack.types';

export class PaystackService {
  private readonly paystackSecret: string;
  private readonly preferredBank: string;
  private readonly baseUrl: string;

  constructor(options: PaystackServiceOptions = {}) {
    const environment = (process.env.PAYSTACK_ENVIRONMENT ??
      process.env.NODE_ENV ??
      'sandbox') as PaystackEnvironment;
    this.baseUrl = (options.baseUrl ?? PAYSTACK_BASE_URL).replace(/\/+$/, '');
    this.paystackSecret =
      options.secretKey ??
      getPaystackSecret(options.environment ?? environment) ??
      '';
    this.preferredBank =
      options.preferredBank ??
      getPaystackPreferredBank(options.environment ?? environment);
  }

  async createPaystackCustomer(
    email: string,
    firstName: string,
    lastName: string,
    phone: string,
  ): Promise<unknown> {
    return requestPaystack({
      baseUrl: this.baseUrl,
      secret: this.paystackSecret,
      endpoint: '/customer',
      options: {
        method: 'POST',
        body: {
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
        },
      },
    });
  }

  async createDedicatedAccount(customerCode: string): Promise<unknown> {
    return requestPaystack({
      baseUrl: this.baseUrl,
      secret: this.paystackSecret,
      endpoint: '/dedicated_account',
      options: {
        method: 'POST',
        body: {
          customer: customerCode,
          preferred_bank: this.preferredBank,
        },
      },
    });
  }

  async retrieveDedicatedAccount(dedicatedAccountId: string): Promise<unknown> {
    return requestPaystack({
      baseUrl: this.baseUrl,
      secret: this.paystackSecret,
      endpoint: `/dedicated_account/${encodeURIComponent(dedicatedAccountId)}`,
    });
  }

  async retrieveCustomerCode(email: string): Promise<string | undefined> {
    const response = await requestPaystack<
      PaystackResponse<PaystackCustomer[]>
    >({
      baseUrl: this.baseUrl,
      secret: this.paystackSecret,
      endpoint: `/customer?email=${encodeURIComponent(email)}`,
    });

    return response.data[0]?.customer_code;
  }

  async initializeTransaction(
    email: string,
    amount: number,
    currency: string,
    callback_url?: string,
  ): Promise<unknown> {
    return requestPaystack({
      baseUrl: this.baseUrl,
      secret: this.paystackSecret,
      endpoint: '/transaction/initialize',
      options: {
        method: 'POST',
        body: {
          email,
          amount: amount * 100,
          currency,
          callback_url,
        },
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

    return requestPaystack({
      baseUrl: this.baseUrl,
      secret: this.paystackSecret,
      endpoint: '/transaction/initialize',
      options: {
        method: 'POST',
        body: payload,
      },
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
    return requestPaystack({
      baseUrl: this.baseUrl,
      secret: this.paystackSecret,
      endpoint: `/subscription${qs ? `?${qs}` : ''}`,
    });
  }

  async verifyTransaction(reference: string): Promise<unknown> {
    return requestPaystack({
      baseUrl: this.baseUrl,
      secret: this.paystackSecret,
      endpoint: `/transaction/verify/${reference}`,
    });
  }

  async initializeOneTimeCheckout(
    data: PaystackOneTimeCheckoutInput,
  ): Promise<unknown> {
    return requestPaystack({
      baseUrl: this.baseUrl,
      secret: this.paystackSecret,
      endpoint: '/transaction/initialize',
      options: {
        method: 'POST',
        body: {
          email: data.email,
          amount: Math.round(data.amountInKobo),
          currency: data.currency ?? 'NGN',
          callback_url: data.callback_url,
          metadata: data.metadata,
          reference: data.reference,
        },
      },
    });
  }

  async chargeAuthorization(
    data: PaystackChargeAuthorizationInput,
  ): Promise<unknown> {
    return requestPaystack({
      baseUrl: this.baseUrl,
      secret: this.paystackSecret,
      endpoint: '/transaction/charge_authorization',
      options: {
        method: 'POST',
        body: {
          email: data.email,
          amount: Math.round(data.amountInKobo),
          authorization_code: data.authorization_code,
          reference: data.reference,
          metadata: data.metadata,
          currency: data.currency ?? 'NGN',
        },
      },
    });
  }

  async getBanks(): Promise<PaystackResponse<PaystackBank[]>> {
    return requestPaystack<PaystackResponse<PaystackBank[]>>({
      baseUrl: this.baseUrl,
      secret: this.paystackSecret,
      endpoint: '/bank',
    });
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
      const response = await requestPaystack<PaystackResponse>({
        baseUrl: this.baseUrl,
        secret: this.paystackSecret,
        endpoint: `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
      });
      return response.data;
    } catch (error) {
      if (error instanceof handleResponse && error.getStatus() === 400) {
        throw new handleResponse(
          PAYBA3_HTTP_STATUS.BAD_REQUEST,
          'Invalid account number or bank code',
        );
      }

      throw new handleResponse(
        PAYBA3_HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Failed to resolve account details',
      );
    }
  }

  verifyWebhookSignature(body: unknown, headers: PaystackWebhookHeaders): void {
    const signature = getPaystackSignature(headers);
    if (!signature) {
      throw new handleResponse(
        PAYBA3_HTTP_STATUS.UNAUTHORIZED,
        'Invalid Paystack signature',
      );
    }

    const hash = createPaystackSignatureHash(body, this.paystackSecret);

    if (!isTimingSafeEqual(hash, signature)) {
      throw new handleResponse(
        PAYBA3_HTTP_STATUS.FORBIDDEN,
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
    return requestPaystack({
      baseUrl: this.baseUrl,
      secret: this.paystackSecret,
      endpoint: `/plan/${planCode}`,
    });
  }

  async createSubscription(
    data: PaystackCreateSubscriptionInput,
  ): Promise<unknown> {
    if (!data.authorization?.trim()) {
      throw new handleResponse(
        PAYBA3_HTTP_STATUS.BAD_REQUEST,
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

    return requestPaystack({
      baseUrl: this.baseUrl,
      secret: this.paystackSecret,
      endpoint: '/subscription',
      options: {
        method: 'POST',
        body: data,
      },
    });
  }

  async fetchSubscription(idOrCode: string): Promise<unknown> {
    return requestPaystack({
      baseUrl: this.baseUrl,
      secret: this.paystackSecret,
      endpoint: `/subscription/${idOrCode}`,
    });
  }

  async disableSubscription(code: string, token: string): Promise<unknown> {
    return requestPaystack({
      baseUrl: this.baseUrl,
      secret: this.paystackSecret,
      endpoint: '/subscription/disable',
      options: {
        method: 'POST',
        body: {
          code,
          token,
        },
      },
    });
  }

  async createCustomer(data: PaystackCreateCustomerInput): Promise<unknown> {
    return requestPaystack({
      baseUrl: this.baseUrl,
      secret: this.paystackSecret,
      endpoint: '/customer',
      options: {
        method: 'POST',
        body: data,
      },
    });
  }

  async fetchCustomerByEmail(email: string): Promise<unknown> {
    return requestPaystack({
      baseUrl: this.baseUrl,
      secret: this.paystackSecret,
      endpoint: `/customer?email=${encodeURIComponent(email)}`,
    });
  }

  async createTransferRecipient(
    data: PaystackCreateTransferRecipientInput,
  ): Promise<unknown> {
    return requestPaystack({
      baseUrl: this.baseUrl,
      secret: this.paystackSecret,
      endpoint: '/transferrecipient',
      options: {
        method: 'POST',
        body: data,
      },
    });
  }

  async deleteTransferRecipient(idOrCode: string): Promise<unknown> {
    return requestPaystack({
      baseUrl: this.baseUrl,
      secret: this.paystackSecret,
      endpoint: `/transferrecipient/${idOrCode}`,
      options: {
        method: 'DELETE',
      },
    });
  }

  async initiateTransfer(
    data: PaystackInitiateTransferInput,
  ): Promise<unknown> {
    return requestPaystack({
      baseUrl: this.baseUrl,
      secret: this.paystackSecret,
      endpoint: '/transfer',
      options: {
        method: 'POST',
        body: data,
      },
    });
  }

  async getPaystackBalance(): Promise<unknown> {
    return requestPaystack({
      baseUrl: this.baseUrl,
      secret: this.paystackSecret,
      endpoint: '/balance',
    });
  }
}
