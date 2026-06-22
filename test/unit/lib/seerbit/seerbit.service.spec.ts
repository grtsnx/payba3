import { SEERBIT_BASE_URLS } from 'src/lib/seerbit/config/seerbit.helper';
import { SeerbitService } from 'src/lib/seerbit/seerbit.service';

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

const virtualAccountResponse = {
  status: 'SUCCESS',
  data: {
    code: '00',
    message: 'Successful',
    payments: {
      reference: 'customer-ref',
      walletName: 'Jane Doe',
      bankName: 'Test Bank',
      accountNumber: '5010000000',
    },
  },
};

describe('SeerbitService', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SEERBIT_ENVIRONMENT: 'sandbox',
      SEERBIT_PUBLIC_KEY: 'seerbit-public',
      SEERBIT_SECRET_KEY: 'seerbit-secret',
    };
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'SUCCESS',
          data: {
            EncryptedSecKey: {
              encryptedKey: 'encrypted-token',
            },
          },
        }),
      )
      .mockImplementation(() =>
        Promise.resolve(jsonResponse(virtualAccountResponse)),
      );
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it('generates bearer tokens and creates virtual accounts', async () => {
    const service = new SeerbitService();

    await expect(
      service.createVirtualAccount({
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        reference: 'customer-ref',
        bankVerificationNumber: '12345678901',
      }),
    ).resolves.toMatchObject({
      status: 'SUCCESS',
      data: {
        payments: {
          accountNumber: '5010000000',
        },
      },
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${SEERBIT_BASE_URLS.sandbox}/encrypt/keys`,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(getFetchBody(0)).toEqual({
      key: 'seerbit-secret.seerbit-public',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${SEERBIT_BASE_URLS.sandbox}/virtual-accounts`,
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(getFetchHeaders(1)).toMatchObject({
      Authorization: 'Bearer encrypted-token',
    });
    expect(getFetchBody(1)).toMatchObject({
      publicKey: 'seerbit-public',
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      reference: 'customer-ref',
      bankVerificationNumber: '12345678901',
      currency: 'NGN',
      country: 'NG',
    });
  });

  it('reuses generated bearer tokens for virtual account lookups', async () => {
    const service = new SeerbitService();

    await service.createVirtualAccount({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      reference: 'customer-ref',
    });
    await service.getVirtualAccount('customer/ref');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      `${SEERBIT_BASE_URLS.sandbox}/virtual-accounts/customer%2Fref`,
    );
    expect(getFetchInit(2).headers).toMatchObject({
      Authorization: 'Bearer encrypted-token',
    });
  });

  it('throws when virtual account creation does not return an account number', async () => {
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'SUCCESS',
          data: {
            EncryptedSecKey: {
              encryptedKey: 'encrypted-token',
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'SUCCESS',
          data: {
            code: '00',
            message: 'Missing account number',
            payments: {},
          },
        }),
      );
    const service = new SeerbitService();

    await expect(
      service.createVirtualAccount({
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        reference: 'customer-ref',
      }),
    ).rejects.toThrow('Missing account number');
  });

  it('returns null for missing virtual account lookups', async () => {
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'SUCCESS',
          data: {
            EncryptedSecKey: {
              encryptedKey: 'encrypted-token',
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'SUCCESS',
          data: {
            code: '00',
            message: 'Not found',
            payments: {},
          },
        }),
      );
    const service = new SeerbitService();

    await expect(service.getVirtualAccount('missing-ref')).resolves.toBeNull();
  });
});
