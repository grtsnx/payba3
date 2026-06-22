import { Injectable } from '@nestjs/common';
import {
  getOPayBaseUrl,
  getOPayCredentials,
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
  OPayStatusPayload,
} from './config/opay.types';

@Injectable()
export class OPayService {
  private readonly baseUrl: string;
  private readonly credentials: OPayCredentials;

  constructor() {
    const environment = (process.env.OPAY_ENVIRONMENT ??
      'sandbox') as OPayEnvironment;

    this.baseUrl = getOPayBaseUrl(environment, process.env.OPAY_BASE_URL);
    this.credentials = getOPayCredentials(environment);
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
