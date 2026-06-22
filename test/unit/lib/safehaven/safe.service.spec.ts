import { SafehavenService } from 'src/lib/safehaven/safe.service';
import type { SafehavenServiceOptions } from 'src/lib/safehaven/config/safe.types';

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });

const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

const createOptions = (
  overrides: SafehavenServiceOptions = {},
): SafehavenServiceOptions => ({
  environment: 'sandbox',
  clientId: 'safe-client',
  clientAssertion: 'safe-assertion',
  timeoutMs: 5000,
  isProduction: false,
  ...overrides,
});

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

describe('SafehavenService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: 'safe-access-token',
          client_id: 'safe-client',
          token_type: 'Bearer',
          expires_in: 120,
          refresh_token: 'safe-refresh-token',
          ibs_client_id: 'ibs-client',
          ibs_user_id: 'ibs-user',
        }),
      )
      .mockImplementation(() =>
        Promise.resolve(
          jsonResponse({
            statusCode: 200,
            message: 'Account Created Successfully.',
            data: { accountNumber: '5010000000' },
          }),
        ),
      );
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
    global.fetch = originalFetch;
  });

  it('exchanges client credentials and creates subaccounts with IBS ClientID', async () => {
    const service = new SafehavenService(createOptions());

    await expect(
      service.createSubAccount({
        phoneNumber: '08000000000',
        identityType: 'vID',
        identityId: 'identity-id',
        emailAddress: 'customer@example.com',
        externalReference: 'customer-ref',
      }),
    ).resolves.toMatchObject({
      statusCode: 200,
      data: { accountNumber: '5010000000' },
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.sandbox.safehavenmfb.com/oauth2/token',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(getFetchBody(0)).toEqual({
      grant_type: 'client_credentials',
      client_assertion_type:
        'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_id: 'safe-client',
      client_assertion: 'safe-assertion',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.sandbox.safehavenmfb.com/accounts/v2/subaccount',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(getFetchHeaders(1)).toMatchObject({
      authorization: 'Bearer safe-access-token',
      ClientID: 'ibs-client',
    });
    expect(getFetchBody(1)).toMatchObject({
      autoSweep: false,
      identityType: 'vID',
      identityId: 'identity-id',
      externalReference: 'customer-ref',
    });
  });

  it('reuses fresh access tokens for later subaccount calls', async () => {
    const service = new SafehavenService(createOptions());
    const payload = {
      phoneNumber: '08000000000',
      identityType: 'vID' as const,
      identityId: 'identity-id',
      emailAddress: 'customer@example.com',
      externalReference: 'customer-ref',
    };

    await service.createSubAccount(payload);
    await service.createSubAccount({
      ...payload,
      externalReference: 'customer-ref-2',
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.sandbox.safehavenmfb.com/oauth2/token',
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'https://api.sandbox.safehavenmfb.com/accounts/v2/subaccount',
    );
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      'https://api.sandbox.safehavenmfb.com/accounts/v2/subaccount',
    );
    expect(getFetchBody(2)).toMatchObject({
      externalReference: 'customer-ref-2',
    });
  });

  it('refreshes expired access tokens before later subaccount calls', async () => {
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: 'expired-access-token',
          client_id: 'safe-client',
          token_type: 'Bearer',
          expires_in: 1,
          refresh_token: 'safe-refresh-token',
          ibs_client_id: 'expired-ibs-client',
          ibs_user_id: 'ibs-user',
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          statusCode: 200,
          message: 'Account Created Successfully.',
          data: { accountNumber: '5010000000' },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: 'fresh-access-token',
          client_id: 'safe-client',
          token_type: 'Bearer',
          expires_in: 120,
          refresh_token: 'safe-refresh-token-2',
          ibs_client_id: 'fresh-ibs-client',
          ibs_user_id: 'ibs-user',
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          statusCode: 200,
          message: 'Account Created Successfully.',
          data: { accountNumber: '5010000001' },
        }),
      );
    const service = new SafehavenService(createOptions());
    const payload = {
      phoneNumber: '08000000000',
      identityType: 'vID' as const,
      identityId: 'identity-id',
      emailAddress: 'customer@example.com',
      externalReference: 'customer-ref',
    };

    await service.createSubAccount(payload);
    await service.createSubAccount({
      ...payload,
      externalReference: 'customer-ref-2',
    });

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      'https://api.sandbox.safehavenmfb.com/oauth2/token',
      'https://api.sandbox.safehavenmfb.com/accounts/v2/subaccount',
      'https://api.sandbox.safehavenmfb.com/oauth2/token',
      'https://api.sandbox.safehavenmfb.com/accounts/v2/subaccount',
    ]);
    expect(getFetchHeaders(3)).toMatchObject({
      authorization: 'Bearer fresh-access-token',
      ClientID: 'fresh-ibs-client',
    });
  });

  it('uses live or overridden base URLs from config', async () => {
    const service = new SafehavenService(
      createOptions({
        environment: 'live',
        baseUrl: 'https://safehaven.example.test///',
      }),
    );

    await service.getAccessToken();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://safehaven.example.test/oauth2/token',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
