import {
  createMonnifyTokenCache,
  decodeJwtPayload,
  getMonnifyBaseUrl,
  getValidMonnifyAccessToken,
  MONNIFY_BASE_URLS,
} from 'src/lib/monnify/config/monnify.helper';
import type { MonnifyTokenCache } from 'src/lib/monnify/config/monnify.types';

const createJwt = (payload: Record<string, unknown>): string => {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url',
  );

  return `header.${encodedPayload}.signature`;
};

describe('Monnify helpers', () => {
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
});
