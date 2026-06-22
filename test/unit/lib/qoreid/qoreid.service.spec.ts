import { QOREID_BASE_URLS } from 'src/lib/qoreid/config/qoreid.helper';
import { QoreIDService } from 'src/lib/qoreid/qoreid.service';

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

describe('QoreIDService', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      QOREID_ENVIRONMENT: 'sandbox',
      QOREID_CLIENT: 'qore-client',
      QOREID_SECRET: 'qore-secret',
    };
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: 'qore-token',
          expiresIn: 120,
        }),
      )
      .mockImplementation(() =>
        Promise.resolve(jsonResponse({ status: true, data: {} })),
      );
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it('fetches an access token and creates hosted verification sessions', async () => {
    const service = new QoreIDService();

    await service.createSession({
      customerReference: 'customer-ref',
      flow: 'kyc',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${QOREID_BASE_URLS.sandbox}/token`,
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(getFetchBody(0)).toEqual({
      clientId: 'qore-client',
      secret: 'qore-secret',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${QOREID_BASE_URLS.sandbox}/v1/sessions`,
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(getFetchHeaders(1)).toMatchObject({
      authorization: 'Bearer qore-token',
    });
    expect(getFetchBody(1)).toMatchObject({
      customerReference: 'customer-ref',
      flow: 'kyc',
    });
  });

  it('verifies CAC Basic by default and reuses the token', async () => {
    const service = new QoreIDService();

    await service.verifyCacNumber('RC123456');
    await service.verifyCacNumber('RC654321', {
      level: 'premium',
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      `${QOREID_BASE_URLS.sandbox}/v1/ng/identities/cac-basic`,
    );
    expect(getFetchBody(1)).toEqual({ regNumber: 'RC123456' });
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      `${QOREID_BASE_URLS.sandbox}/v3/ng/identities/cac-premium`,
    );
    expect(getFetchBody(2)).toEqual({ regNumber: 'RC654321' });
  });

  it('uses live credentials and base URL overrides', async () => {
    process.env.QOREID_ENVIRONMENT = 'live';
    process.env.QOREID_BASE_URL = 'https://qoreid.example.test///';
    process.env.QOREID_LIVE_CLIENT = 'live-client';
    process.env.QOREID_LIVE_SECRET = 'live-secret';
    const service = new QoreIDService();

    await service.createSession({ customerReference: 'customer-ref' });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://qoreid.example.test/token',
    );
    expect(getFetchBody(0)).toEqual({
      clientId: 'live-client',
      secret: 'live-secret',
    });
  });

  it('uses explicit constructor options without reading env credentials', async () => {
    const service = new QoreIDService({
      baseUrl: 'https://qoreid-options.example.test///',
      clientId: 'option-client',
      secret: 'option-secret',
    });

    await service.createSession({ customerReference: 'customer-ref' });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://qoreid-options.example.test/token',
    );
    expect(getFetchBody(0)).toEqual({
      clientId: 'option-client',
      secret: 'option-secret',
    });
  });

  it('refreshes expired access tokens before later verification calls', async () => {
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: 'expired-qore-token',
          expiresIn: 1,
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ status: true, data: {} }))
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: 'fresh-qore-token',
          expiresIn: 120,
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ status: true, data: {} }));
    const service = new QoreIDService({
      clientId: 'qore-client',
      secret: 'qore-secret',
    });

    await service.createSession({ customerReference: 'customer-ref' });
    await service.verifyCacNumber('RC654321');

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      `${QOREID_BASE_URLS.sandbox}/token`,
      `${QOREID_BASE_URLS.sandbox}/v1/sessions`,
      `${QOREID_BASE_URLS.sandbox}/token`,
      `${QOREID_BASE_URLS.sandbox}/v1/ng/identities/cac-basic`,
    ]);
    expect(getFetchHeaders(3)).toMatchObject({
      authorization: 'Bearer fresh-qore-token',
    });
  });
});
