import {
  getOPayBaseUrl,
  getOPayCredentials,
  normalizeOPayEnvironment,
  requestOPay,
  verifyOPayCallbackSignature,
} from './config/opay.helper';
import type {
  OPayCredentials,
  OPayEnvironment,
  OPayOtpPayload,
  OPayPaymentPayload,
  OPayRefundPayload,
  OPayRequestOptions,
  OPayResponse,
  OPayServiceOptions,
  OPayStatusPayload,
} from './config/opay.types';

export class OPayService {
  private readonly baseUrl: string;
  private readonly credentials: OPayCredentials;

  constructor(options: OPayServiceOptions = {}) {
    const environment = normalizeOPayEnvironment(
      options.environment ??
        process.env.OPAY_ENVIRONMENT ??
        process.env.NODE_ENV,
    ) as OPayEnvironment;
    const envCredentials = getOPayCredentials(environment);

    this.baseUrl = getOPayBaseUrl(
      environment,
      options.baseUrl ?? process.env.OPAY_BASE_URL,
    );
    this.credentials = {
      merchantId:
        options.merchantId ??
        options.credentials?.merchantId ??
        envCredentials.merchantId,
      publicKey:
        options.publicKey ??
        options.credentials?.publicKey ??
        envCredentials.publicKey,
      secretKey:
        options.secretKey ??
        options.credentials?.secretKey ??
        envCredentials.secretKey,
    };
  }

  async request<T = unknown>(
    endpoint: string,
    options: OPayRequestOptions,
  ): Promise<T> {
    return requestOPay<T>({
      baseUrl: this.baseUrl,
      credentials: this.credentials,
      endpoint,
      options,
    });
  }

  async createCashierPayment(input: OPayPaymentPayload): Promise<OPayResponse> {
    return this.request('/api/v1/international/cashier/create', {
      method: 'POST',
      authMode: 'publicKey',
      body: { country: 'NG', ...input },
    });
  }

  async createPayment(input: OPayPaymentPayload): Promise<OPayResponse> {
    return this.request('/api/v1/international/payment/create', {
      method: 'POST',
      authMode: 'signature',
      body: { country: 'NG', ...input },
    });
  }

  async queryPaymentStatus(input: OPayStatusPayload): Promise<OPayResponse> {
    return this.request('/api/v1/international/cashier/status', {
      method: 'POST',
      authMode: 'signature',
      body: { country: 'NG', ...input },
    });
  }

  async cancelPayment(input: OPayStatusPayload): Promise<OPayResponse> {
    return this.request('/api/v1/international/cashier/close', {
      method: 'POST',
      authMode: 'signature',
      body: { country: 'NG', ...input },
    });
  }

  async createRefund(input: OPayRefundPayload): Promise<OPayResponse> {
    return this.request('/api/v1/international/payment/refund/create', {
      method: 'POST',
      authMode: 'signature',
      body: { country: 'NG', refundWay: 'Original', ...input },
    });
  }

  async queryRefundStatus(input: OPayStatusPayload): Promise<OPayResponse> {
    return this.request('/api/v1/international/payment/refund/query', {
      method: 'POST',
      authMode: 'signature',
      body: { country: 'NG', ...input },
    });
  }

  async sendOtp(input: OPayOtpPayload): Promise<OPayResponse> {
    return this.request('/api/v1/international/payment/otp/send', {
      method: 'POST',
      authMode: 'signature',
      body: { country: 'NG', ...input },
    });
  }

  async inputOtp(
    input: Required<Pick<OPayOtpPayload, 'orderNo' | 'otp'>> & OPayOtpPayload,
  ): Promise<OPayResponse> {
    return this.request('/api/v1/international/payment/otp/input', {
      method: 'POST',
      authMode: 'signature',
      body: { country: 'NG', ...input },
    });
  }

  async inputPin(
    input: Required<Pick<OPayOtpPayload, 'orderNo' | 'pin'>> & OPayOtpPayload,
  ): Promise<OPayResponse> {
    return this.request('/api/v1/international/payment/pin/input', {
      method: 'POST',
      authMode: 'signature',
      body: { country: 'NG', ...input },
    });
  }

  verifyCallback(body: unknown, signature: string): boolean {
    return verifyOPayCallbackSignature(
      body,
      signature,
      this.credentials.secretKey,
    );
  }
}
