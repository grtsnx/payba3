import {
  createPaystackSignatureHash,
  getPaystackPreferredBank,
  getPaystackSecret,
} from 'src/lib/paystack/config/paystack.helper';
import { PaystackService } from 'src/lib/paystack/paystack.service';

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

describe('PaystackService', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.PAYSTACK_ENVIRONMENT;
    delete process.env.PAYSTACK_SECRET_KEY;
    delete process.env.PAYSTACK_SECRET_KEY_LIVE;
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        jsonResponse({
          status: true,
          message: 'ok',
          data: {},
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

  it('does not throw at startup when Paystack is not configured', () => {
    expect(() => new PaystackService()).not.toThrow();
  });

  it('fails only when a Paystack call is made without credentials', async () => {
    const service = new PaystackService();

    await expect(service.getPaystackBalance()).rejects.toThrow(
      'Paystack secret key not set',
    );
  });

  it('uses provider-specific environment keys', () => {
    process.env.PAYSTACK_SECRET_KEY = 'test-secret';
    process.env.PAYSTACK_SECRET_KEY_LIVE = 'live-secret';

    expect(getPaystackSecret('sandbox')).toBe('test-secret');
    expect(getPaystackSecret('live')).toBe('live-secret');
    expect(getPaystackPreferredBank('sandbox')).toBe('test-bank');
    expect(getPaystackPreferredBank('live')).toBe('titan-paystack');
  });

  it('verifies raw webhook bodies without reserializing them', () => {
    process.env.PAYSTACK_SECRET_KEY = 'test-secret';
    const service = new PaystackService();
    const rawBody = '{"event":"charge.success","data":{"id":123}}';
    const signature = createPaystackSignatureHash(rawBody, 'test-secret');

    expect(() =>
      service.verifyWebhookSignature(rawBody, {
        'x-paystack-signature': signature,
      }),
    ).not.toThrow();
  });

  it('initializes transactions in subunits with bearer auth', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'test-secret';
    const service = new PaystackService();

    await service.initializeTransaction(
      'buyer@example.com',
      2500,
      'NGN',
      'https://example.test/callback',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.paystack.co/transaction/initialize',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(getFetchHeaders(0)).toMatchObject({
      Authorization: 'Bearer test-secret',
      'Content-Type': 'application/json',
    });
    expect(getFetchBody(0)).toEqual({
      email: 'buyer@example.com',
      amount: 250000,
      currency: 'NGN',
      callback_url: 'https://example.test/callback',
    });
  });

  it('creates and retrieves dedicated accounts with correct identifiers', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'test-secret';
    const service = new PaystackService();

    await service.createDedicatedAccount('CUS_123');
    await service.retrieveDedicatedAccount('dva/id 123');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.paystack.co/dedicated_account',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(getFetchBody(0)).toEqual({
      customer: 'CUS_123',
      preferred_bank: 'test-bank',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.paystack.co/dedicated_account/dva%2Fid%20123',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('retrieves customer codes and filters banks from provider responses', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'test-secret';
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          status: true,
          message: 'ok',
          data: [{ customer_code: 'CUS_found' }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: true,
          message: 'ok',
          data: [
            { id: 1, code: '058', name: 'GTBank' },
            { id: 2, code: '044', name: 'Access' },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: true,
          message: 'ok',
          data: [
            { id: 1, code: '058', name: 'GTBank' },
            { id: 2, code: '044', name: 'Access' },
          ],
        }),
      );
    const service = new PaystackService();

    await expect(
      service.retrieveCustomerCode('buyer+tag@example.com'),
    ).resolves.toBe('CUS_found');
    await expect(service.getBankByCode('044')).resolves.toMatchObject({
      id: 2,
      code: '044',
    });
    await expect(service.getBankById(1)).resolves.toMatchObject({
      id: 1,
      code: '058',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.paystack.co/customer?email=buyer%2Btag%40example.com',
      expect.any(Object),
    );
  });

  it('creates transfer recipients and initiates transfers', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'test-secret';
    const service = new PaystackService();

    await service.createTransferRecipient({
      type: 'nuban',
      name: 'Jane Doe',
      account_number: '0123456789',
      bank_code: '058',
      currency: 'NGN',
    });
    await service.initiateTransfer({
      source: 'balance',
      amount: 100000,
      recipient: 'RCP_123',
      reference: 'transfer-ref',
      reason: 'Payout',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.paystack.co/transferrecipient',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(getFetchBody(0)).toMatchObject({
      type: 'nuban',
      account_number: '0123456789',
      bank_code: '058',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.paystack.co/transfer',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(getFetchBody(1)).toMatchObject({
      source: 'balance',
      amount: 100000,
      recipient: 'RCP_123',
      reference: 'transfer-ref',
    });
  });

  it('handles charge.success webhooks and rejects invalid signatures', () => {
    process.env.PAYSTACK_SECRET_KEY = 'test-secret';
    const service = new PaystackService();
    const body = { event: 'charge.success', data: { reference: 'ref' } };
    const signature = createPaystackSignatureHash(body, 'test-secret');

    expect(
      service.handlePaystackWebhook(body, {
        'x-paystack-signature': signature,
      }),
    ).toEqual({ reference: 'ref' });
    expect(() =>
      service.handlePaystackWebhook(body, {
        'x-paystack-signature': 'bad-signature',
      }),
    ).toThrow('Invalid Paystack signature');
  });

  it('blocks subscription creation without an authorization code', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'test-secret';
    const service = new PaystackService();

    await expect(
      service.createSubscription({
        customer: 'CUS_123',
        plan: 'PLN_123',
        authorization: '',
      }),
    ).rejects.toThrow('No saved payment method');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
