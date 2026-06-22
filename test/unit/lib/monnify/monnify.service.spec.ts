import {
  createMonnifyWebhookSignature,
  MONNIFY_BASE_URLS,
} from 'src/lib/monnify/config/monnify.helper';
import { MonnifyService } from 'src/lib/monnify/monnify.service';

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });

const createJwt = (payload: Record<string, unknown>): string => {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url',
  );

  return `header.${encodedPayload}.signature`;
};

const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

const getFetchInit = (callIndex: number): RequestInit =>
  fetchMock.mock.calls[callIndex]?.[1] ?? {};

const getFetchHeaders = (callIndex: number): Record<string, string> =>
  getFetchInit(callIndex).headers as Record<string, string>;

const getFetchBody = (
  callIndex: number,
): Record<string, unknown> | Array<Record<string, unknown>> => {
  const body = getFetchInit(callIndex).body;

  if (typeof body !== 'string') {
    throw new Error('Expected JSON request body');
  }

  return JSON.parse(body) as
    | Record<string, unknown>
    | Array<Record<string, unknown>>;
};

describe('MonnifyService', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    const token = createJwt({
      exp: Math.floor(Date.now() / 1000) + 300,
      sub: 'merchant',
    });
    process.env = {
      ...originalEnv,
      MONNIFY_ENVIRONMENT: 'sandbox',
      MONNIFY_API_KEY: 'api-key',
      MONNIFY_SECRET_KEY: 'secret-key',
      MONNIFY_CONTRACT_CODE: 'contract-code',
    };
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          requestSuccessful: true,
          responseMessage: 'success',
          responseCode: '0',
          responseBody: { accessToken: token },
        }),
      )
      .mockImplementation(() =>
        Promise.resolve(
          jsonResponse({
            requestSuccessful: true,
            responseMessage: 'success',
            responseCode: '0',
            responseBody: {},
          }),
        ),
      );
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it('logs in with Basic auth and initializes transactions with bearer auth', async () => {
    const service = new MonnifyService();

    await service.initializeTransaction({
      amount: 10000,
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      paymentReference: 'pay-ref',
      paymentDescription: 'Order payment',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${MONNIFY_BASE_URLS.sandbox}/api/v1/auth/login`,
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(getFetchHeaders(0).Authorization).toBe(
      `Basic ${Buffer.from('api-key:secret-key').toString('base64')}`,
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${MONNIFY_BASE_URLS.sandbox}/api/v1/merchant/transactions/init-transaction`,
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(getFetchHeaders(1).Authorization).toMatch(/^Bearer /);
    expect(getFetchBody(1)).toMatchObject({
      amount: 10000,
      currencyCode: 'NGN',
      contractCode: 'contract-code',
      paymentReference: 'pay-ref',
    });
  });

  it('uses explicit constructor options for base URL and credentials', async () => {
    const service = new MonnifyService({
      baseUrl: 'https://monnify.example.test///',
      apiKey: 'option-api-key',
      secretKey: 'option-secret-key',
      contractCode: 'option-contract-code',
    });

    await service.initializeTransaction({
      amount: 10000,
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      paymentReference: 'pay-ref',
      paymentDescription: 'Order payment',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://monnify.example.test/api/v1/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(getFetchHeaders(0).Authorization).toBe(
      `Basic ${Buffer.from('option-api-key:option-secret-key').toString('base64')}`,
    );
    expect(getFetchBody(1)).toMatchObject({
      contractCode: 'option-contract-code',
    });
  });

  it('reuses access tokens for transaction query requests', async () => {
    const service = new MonnifyService();

    await service.queryTransactionStatus({ paymentReference: 'pay ref' });
    await service.getTransactionStatus('MNFY|123');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `${MONNIFY_BASE_URLS.sandbox}/api/v2/merchant/transactions/query?paymentReference=pay+ref`,
    );
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      `${MONNIFY_BASE_URLS.sandbox}/api/v2/transactions/MNFY%7C123`,
    );
  });

  it('refreshes stale access tokens before later requests', async () => {
    fetchMock.mockReset();
    const staleToken = createJwt({
      exp: Math.floor(Date.now() / 1000) + 30,
      sub: 'merchant',
    });
    const freshToken = createJwt({
      exp: Math.floor(Date.now() / 1000) + 300,
      sub: 'merchant',
    });
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          requestSuccessful: true,
          responseMessage: 'success',
          responseCode: '0',
          responseBody: { accessToken: staleToken },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          requestSuccessful: true,
          responseMessage: 'success',
          responseCode: '0',
          responseBody: {},
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          requestSuccessful: true,
          responseMessage: 'success',
          responseCode: '0',
          responseBody: { accessToken: freshToken },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          requestSuccessful: true,
          responseMessage: 'success',
          responseCode: '0',
          responseBody: {},
        }),
      );
    const service = new MonnifyService();

    await service.queryTransactionStatus({ paymentReference: 'pay-ref' });
    await service.getTransactionStatus('MNFY|123');

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      `${MONNIFY_BASE_URLS.sandbox}/api/v1/auth/login`,
      `${MONNIFY_BASE_URLS.sandbox}/api/v2/merchant/transactions/query?paymentReference=pay-ref`,
      `${MONNIFY_BASE_URLS.sandbox}/api/v1/auth/login`,
      `${MONNIFY_BASE_URLS.sandbox}/api/v2/transactions/MNFY%7C123`,
    ]);
    expect(getFetchHeaders(3).Authorization).toBe(`Bearer ${freshToken}`);
  });

  it('creates reserved accounts with contract code and bank defaults', async () => {
    const service = new MonnifyService();

    await service.createReservedAccount({
      accountReference: 'customer-ref',
      accountName: 'Jane Doe',
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      bvn: '12345678901',
    });

    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `${MONNIFY_BASE_URLS.sandbox}/api/v2/bank-transfer/reserved-accounts`,
    );
    expect(getFetchBody(1)).toMatchObject({
      accountReference: 'customer-ref',
      currencyCode: 'NGN',
      contractCode: 'contract-code',
      getAllAvailableBanks: true,
      bvn: '12345678901',
    });
  });

  it('builds transfer, subaccount, and refund requests', async () => {
    const service = new MonnifyService();

    await service.initiateSingleTransfer({
      amount: 50000,
      reference: 'transfer-ref',
      narration: 'Vendor payout',
      destinationBankCode: '058',
      destinationAccountNumber: '0123456789',
    });
    await service.createSubAccounts([
      {
        bankCode: '058',
        accountNumber: '0123456789',
        email: 'vendor@example.com',
        defaultSplitPercentage: 20,
      },
    ]);
    await service.initiateRefund({
      transactionReference: 'MNFY|123',
      refundReference: 'refund-ref',
      refundAmount: 1000,
      refundReason: 'Customer request',
    });

    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `${MONNIFY_BASE_URLS.sandbox}/api/v2/disbursements/single`,
    );
    expect(getFetchBody(1)).toMatchObject({
      currency: 'NGN',
      amount: 50000,
      reference: 'transfer-ref',
      destinationBankCode: '058',
    });
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      `${MONNIFY_BASE_URLS.sandbox}/api/v1/sub-accounts`,
    );
    expect(getFetchBody(2)).toEqual([
      {
        currencyCode: 'NGN',
        bankCode: '058',
        accountNumber: '0123456789',
        email: 'vendor@example.com',
        defaultSplitPercentage: 20,
      },
    ]);
    expect(fetchMock.mock.calls[3]?.[0]).toBe(
      `${MONNIFY_BASE_URLS.sandbox}/api/v1/refunds/initiate-refund`,
    );
    expect(getFetchBody(3)).toMatchObject({
      transactionReference: 'MNFY|123',
      refundReference: 'refund-ref',
      refundAmount: 1000,
    });
  });

  it('blocks contract-dependent calls when contract code is missing', async () => {
    process.env.MONNIFY_CONTRACT_CODE = '';
    const service = new MonnifyService();

    await expect(
      service.initializeBankTransfer({
        amount: 10000,
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        paymentReference: 'pay-ref',
        paymentDescription: 'Order payment',
      }),
    ).rejects.toThrow('MONNIFY_CONTRACT_CODE is not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('verifies webhooks with configured merchant secret', () => {
    const service = new MonnifyService();
    const payload = JSON.stringify({
      eventType: 'SUCCESSFUL_TRANSACTION',
      eventData: { paymentReference: 'pay-ref' },
    });
    const signature = createMonnifyWebhookSignature(payload, 'secret-key');

    expect(service.verifyWebhookSignature(payload, signature)).toBe(true);
    expect(service.verifyWebhookSignature(payload, 'bad-signature')).toBe(
      false,
    );
  });
});
