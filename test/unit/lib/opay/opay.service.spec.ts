import { OPayService } from 'src/lib/opay/opay.service';

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });

const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

const getFetchInit = (callIndex: number): RequestInit =>
  fetchMock.mock.calls[callIndex]?.[1] ?? {};

const getFetchHeaders = (callIndex: number): Record<string, string> =>
  getFetchInit(callIndex).headers as Record<string, string>;

const getFetchBody = (callIndex: number): Record<string, unknown> => {
  const body = getFetchInit(callIndex).body;

  if (typeof body !== 'string') {
    throw new Error('Expected JSON request body');
  }

  return JSON.parse(body) as Record<string, unknown>;
};

describe('OPayService', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      OPAY_MERCHANT_ID: 'merchant',
      OPAY_PUBLIC_KEY: 'public',
      OPAY_SECRET_KEY: 'secret',
    };
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ code: '00000', message: 'SUCCESS' })),
    );
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it('queries refund status with the current provider endpoint', async () => {
    const service = new OPayService();

    await service.queryRefundStatus({ reference: 'refund-ref' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://testapi.opaycheckout.com/api/v1/international/payment/refund/query',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('uses public-key auth only for cashier creation', async () => {
    const service = new OPayService();

    await service.createCashierPayment({
      reference: 'cashier-ref',
      amount: { total: 25_000, currency: 'NGN' },
      returnUrl: 'https://example.test/return',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://testapi.opaycheckout.com/api/v1/international/cashier/create',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(getFetchHeaders(0)).toMatchObject({
      Authorization: 'Bearer public',
      MerchantId: 'merchant',
    });
    expect(getFetchBody(0)).toMatchObject({
      country: 'NG',
      reference: 'cashier-ref',
      amount: { total: 25_000, currency: 'NGN' },
    });
  });

  it('uses signed auth for direct payment creation', async () => {
    const service = new OPayService();

    await service.createPayment({
      reference: 'direct-ref',
      amount: { total: 25_000, currency: 'NGN' },
      payMethod: 'BankTransfer',
    });

    const init = getFetchInit(0);
    const headers = init.headers as Record<string, string>;

    expect(fetchMock).toHaveBeenCalledWith(
      'https://testapi.opaycheckout.com/api/v1/international/payment/create',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(headers.Authorization).toMatch(/^Bearer [a-f0-9]{128}$/);
    expect(headers.Authorization).not.toBe('Bearer public');
    expect(getFetchBody(0)).toMatchObject({
      country: 'NG',
      reference: 'direct-ref',
      payMethod: 'BankTransfer',
    });
  });

  it.each([
    {
      name: 'payment status',
      call: (service: OPayService) =>
        service.queryPaymentStatus({ reference: 'order-ref' }),
      endpoint: '/api/v1/international/cashier/status',
      body: { reference: 'order-ref' },
    },
    {
      name: 'payment cancellation',
      call: (service: OPayService) =>
        service.cancelPayment({ orderNo: 'order-no' }),
      endpoint: '/api/v1/international/cashier/close',
      body: { orderNo: 'order-no' },
    },
    {
      name: 'OTP send',
      call: (service: OPayService) => service.sendOtp({ orderNo: 'order-no' }),
      endpoint: '/api/v1/international/payment/otp/send',
      body: { orderNo: 'order-no' },
    },
    {
      name: 'OTP input',
      call: (service: OPayService) =>
        service.inputOtp({ orderNo: 'order-no', otp: '123456' }),
      endpoint: '/api/v1/international/payment/otp/input',
      body: { orderNo: 'order-no', otp: '123456' },
    },
    {
      name: 'PIN input',
      call: (service: OPayService) =>
        service.inputPin({ orderNo: 'order-no', pin: '1234' }),
      endpoint: '/api/v1/international/payment/pin/input',
      body: { orderNo: 'order-no', pin: '1234' },
    },
  ])('builds signed $name requests', async ({ call, endpoint, body }) => {
    const service = new OPayService();

    await call(service);

    expect(fetchMock).toHaveBeenCalledWith(
      `https://testapi.opaycheckout.com${endpoint}`,
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(getFetchHeaders(0).Authorization).toMatch(/^Bearer [a-f0-9]{128}$/);
    expect(getFetchHeaders(0).MerchantId).toBe('merchant');
    expect(getFetchBody(0)).toMatchObject({
      country: 'NG',
      ...body,
    });
  });

  it('adds default refundWay for refund creation', async () => {
    const service = new OPayService();

    await service.createRefund({
      reference: 'refund-ref',
      originalReference: 'payment-ref',
      amount: { total: 10_000, currency: 'NGN' },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://testapi.opaycheckout.com/api/v1/international/payment/refund/create',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(getFetchBody(0)).toMatchObject({
      country: 'NG',
      refundWay: 'Original',
      reference: 'refund-ref',
      originalReference: 'payment-ref',
    });
  });
});
