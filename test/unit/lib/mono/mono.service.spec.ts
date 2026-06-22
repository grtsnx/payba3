import { MonoService } from 'src/lib/mono/mono.service';

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });

const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

const getFetchInit = (callIndex: number): RequestInit =>
  fetchMock.mock.calls[callIndex]?.[1] ?? {};

const getFetchHeaders = (callIndex: number): Record<string, string> =>
  getFetchInit(callIndex).headers as Record<string, string>;

const getFetchBody = (callIndex: number): unknown => {
  const body = getFetchInit(callIndex).body;

  if (typeof body !== 'string') {
    throw new Error('Expected JSON request body');
  }

  return JSON.parse(body) as unknown;
};

describe('MonoService', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      MONO_SECRET_KEY: 'mono-secret',
    };
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ status: 'successful' })),
    );
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it('verifies payments by reference using the provider endpoint', async () => {
    const service = new MonoService();

    await service.verifyPayment('pay ref/123');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.withmono.com/v2/payments/verify/pay%20ref%2F123',
      expect.objectContaining({
        method: 'GET',
      }),
    );
    expect(getFetchHeaders(0)).toMatchObject({
      'mono-sec-key': 'mono-secret',
    });
  });

  it('builds account-linking, token-exchange, and account-data requests', async () => {
    const service = new MonoService();

    await service.initiateAccountLinking({
      reference: 'link-ref',
      customer: { email: 'customer@example.com' },
    });
    await service.exchangeToken('temporary-code');
    await service.getAccount('account/id');
    await service.getTransactions('account/id', {
      from: '2026-01-01',
      page: 2,
      include: true,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.withmono.com/v2/accounts/initiate',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(getFetchBody(0)).toMatchObject({
      reference: 'link-ref',
      customer: { email: 'customer@example.com' },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.withmono.com/v2/accounts/auth',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(getFetchBody(1)).toEqual({ code: 'temporary-code' });
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://api.withmono.com/v2/accounts/account%2Fid',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      'https://api.withmono.com/v2/accounts/account%2Fid/transactions?from=2026-01-01&page=2&include=true',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('builds payment, disbursement-source, and BVN lookup requests', async () => {
    const service = new MonoService();

    await service.initiatePayment({
      amount: 150_000,
      type: 'onetime-debit',
      reference: 'payment-ref',
    });
    await service.createDisbursementSourceAccount({
      account_number: '0123456789',
      bank_code: '058',
      account_name: 'Jane Doe',
    });
    await service.initiateBvnLookup({
      bvn: '12345678901',
      reference: 'bvn-ref',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.withmono.com/v2/payments/initiate',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(getFetchBody(0)).toMatchObject({
      amount: 150_000,
      reference: 'payment-ref',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.withmono.com/v3/payments/disburse/source-accounts',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(getFetchBody(1)).toMatchObject({
      account_number: '0123456789',
      bank_code: '058',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://api.withmono.com/v2/lookup/bvn/initiate',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(getFetchBody(2)).toMatchObject({
      bvn: '12345678901',
      reference: 'bvn-ref',
    });
  });
});
