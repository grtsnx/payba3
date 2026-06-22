import {
  getValidQoreIDAccessToken,
  isQoreIDTokenResponse,
} from './qoreid.helper';
import type { QoreIDTokenCache } from './qoreid.types';

describe('QoreID helpers', () => {
  it('identifies token responses', () => {
    expect(
      isQoreIDTokenResponse({ accessToken: 'token', expiresIn: 3600 }),
    ).toBe(true);
    expect(isQoreIDTokenResponse({ accessToken: 'token' })).toBe(false);
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
