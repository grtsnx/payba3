import {
  buildQoreIDCacEndpoint,
  getQoreIDAccessTokenFromResponse,
  getQoreIDBaseUrl,
  getQoreIDExpiresInFromResponse,
  getValidQoreIDAccessToken,
  isQoreIDTokenResponse,
  QOREID_BASE_URLS,
} from 'src/lib/qoreid/config/qoreid.helper';
import type { QoreIDTokenCache } from 'src/lib/qoreid/config/qoreid.types';

describe('QoreID helpers', () => {
  it('identifies token responses', () => {
    expect(
      isQoreIDTokenResponse({ accessToken: 'token', expiresIn: 3600 }),
    ).toBe(true);
    expect(
      isQoreIDTokenResponse({ access_token: 'token', expires_in: 3600 }),
    ).toBe(true);
    expect(isQoreIDTokenResponse({ expiresIn: 3600 })).toBe(false);
  });

  it('normalizes base URLs and token response shapes', () => {
    expect(getQoreIDBaseUrl('sandbox')).toBe(QOREID_BASE_URLS.sandbox);
    expect(getQoreIDBaseUrl('live', 'https://qoreid.example.test///')).toBe(
      'https://qoreid.example.test',
    );
    expect(
      getQoreIDAccessTokenFromResponse({ access_token: 'snake-token' }),
    ).toBe('snake-token');
    expect(getQoreIDExpiresInFromResponse({ accessToken: 'token' })).toBe(3000);
  });

  it('builds CAC identity endpoints by version and level', () => {
    expect(buildQoreIDCacEndpoint()).toBe('/v1/ng/identities/cac-basic');
    expect(buildQoreIDCacEndpoint('v3', 'premium')).toBe(
      '/v3/ng/identities/cac-premium',
    );
  });

  it('refreshes tokens before expiry', async () => {
    const staleToken: QoreIDTokenCache = {
      accessToken: 'old',
      expiresAt: Date.now() + 1_000,
    };
    const refreshToken = jest.fn().mockResolvedValue({
      accessToken: 'new',
      expiresAt: Date.now() + 120_000,
    });

    await expect(
      getValidQoreIDAccessToken(staleToken, refreshToken),
    ).resolves.toMatchObject({
      accessToken: 'new',
    });
    expect(refreshToken).toHaveBeenCalledTimes(1);
  });

  it('reuses fresh tokens', async () => {
    const freshToken: QoreIDTokenCache = {
      accessToken: 'fresh',
      expiresAt: Date.now() + 120_000,
    };
    const refreshToken = jest.fn();

    await expect(
      getValidQoreIDAccessToken(freshToken, refreshToken),
    ).resolves.toBe(freshToken);
    expect(refreshToken).not.toHaveBeenCalled();
  });
});
