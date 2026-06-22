import {
  buildMonnifyQuery,
  createMonnifyWebhookSignature,
  createMonnifyTokenCache,
  decodeJwtPayload,
  getMonnifyBaseUrl,
  getValidMonnifyAccessToken,
  MONNIFY_BASE_URLS,
  requestMonnify,
  verifyMonnifyWebhookSignature,
} from 'src/lib/monnify/config/monnify.helper';
import type { MonnifyTokenCache } from 'src/lib/monnify/config/monnify.types';

const createJwt = (payload: Record<string, unknown>): string => {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url',
  );

  return `header.${encodedPayload}.signature`;
};

describe('Monnify helpers', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;

  afterEach(() => {
    fetchMock.mockReset();
    global.fetch = originalFetch;
  });

  it('selects sandbox/live base URLs', () => {
    expect(getMonnifyBaseUrl('sandbox')).toBe(MONNIFY_BASE_URLS.sandbox);
    expect(getMonnifyBaseUrl('live')).toBe(MONNIFY_BASE_URLS.live);
  });

  it('decodes JWT payloads and derives token expiry', () => {
    const exp = Math.floor(Date.now() / 1000) + 300;
    const token = createJwt({ exp, sub: 'merchant' });

    expect(decodeJwtPayload(token)).toMatchObject({ exp, sub: 'merchant' });
    expect(createMonnifyTokenCache(token)).toMatchObject({
      accessToken: token,
      expiresAt: exp * 1000,
    });
  });

  it('builds compact query strings without undefined values', () => {
    expect(
      buildMonnifyQuery({
        paymentReference: 'pay ref',
        transactionReference: undefined,
      }),
    ).toBe('?paymentReference=pay+ref');
  });

  it('refreshes stale tokens', async () => {
    const staleToken: MonnifyTokenCache = {
      accessToken: 'old',
      expiresAt: Date.now() + 1_000,
    };
    const refreshToken = jest.fn().mockResolvedValue({
      accessToken: 'new',
      expiresAt: Date.now() + 120_000,
    });

    await expect(
      getValidMonnifyAccessToken(staleToken, refreshToken),
    ).resolves.toMatchObject({
      accessToken: 'new',
    });
    expect(refreshToken).toHaveBeenCalledTimes(1);
  });

  it('verifies webhook signatures with merchant secret', () => {
    const payload = JSON.stringify({
      eventType: 'SUCCESSFUL_TRANSACTION',
      eventData: { paymentReference: 'ref' },
    });
    const signature = createMonnifyWebhookSignature(payload, 'merchant-secret');

    expect(signature).toMatch(/^[a-f0-9]{128}$/);
    expect(
      verifyMonnifyWebhookSignature(payload, signature, 'merchant-secret'),
    ).toBe(true);
    expect(
      verifyMonnifyWebhookSignature(payload, signature, 'wrong-secret'),
    ).toBe(false);
  });

  it('rejects unsuccessful Monnify response bodies', async () => {
    global.fetch = fetchMock;
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          requestSuccessful: false,
          responseMessage: 'Invalid request',
          responseCode: '99',
        }),
        { status: 200 },
      ),
    );

    await expect(
      requestMonnify({
        baseUrl: MONNIFY_BASE_URLS.sandbox,
        endpoint: '/api/v1/example',
      }),
    ).rejects.toThrow('Invalid request');
  });
});
