import {
  createSafehavenTokenCache,
  getSafehavenClientHeaderValue,
  getSafehavenBaseUrl,
  getValidSafehavenAccessToken,
  getValidSafehavenToken,
  SAFEHAVEN_BASE_URLS,
} from 'src/lib/safehaven/config/safe.helper';
import type { SafehavenTokenCache } from 'src/lib/safehaven/config/safe.types';

describe('Safehaven helpers', () => {
  it('selects sandbox/live base URLs and trims overrides', () => {
    expect(getSafehavenBaseUrl('sandbox')).toBe(SAFEHAVEN_BASE_URLS.sandbox);
    expect(getSafehavenBaseUrl('live')).toBe(SAFEHAVEN_BASE_URLS.live);
    expect(getSafehavenBaseUrl('sandbox', 'https://example.test///')).toBe(
      'https://example.test',
    );
  });

  it('stores token expiry from expires_in seconds', () => {
    const now = Date.now();
    const cache = createSafehavenTokenCache({
      access_token: 'token',
      client_id: 'client',
      token_type: 'Bearer',
      expires_in: 120,
      refresh_token: 'refresh',
      ibs_client_id: 'ibs-client',
      ibs_user_id: 'ibs-user',
    });

    expect(cache.accessToken).toBe('token');
    expect(cache.clientId).toBe('client');
    expect(cache.ibsClientId).toBe('ibs-client');
    expect(cache.ibsUserId).toBe('ibs-user');
    expect(cache.expiresAt).toBeGreaterThanOrEqual(now + 119_000);
  });

  it('reuses fresh access tokens and refreshes stale ones', async () => {
    const freshToken: SafehavenTokenCache = {
      accessToken: 'fresh',
      clientId: 'client',
      ibsClientId: 'ibs-client',
      ibsUserId: 'ibs-user',
      expiresAt: Date.now() + 120_000,
    };
    const staleToken: SafehavenTokenCache = {
      accessToken: 'stale',
      clientId: 'client',
      ibsClientId: 'ibs-client',
      ibsUserId: 'ibs-user',
      expiresAt: Date.now() + 10_000,
    };
    const refreshToken = jest.fn().mockResolvedValue({
      access_token: 'new',
      client_id: 'client',
      token_type: 'Bearer',
      expires_in: 120,
      refresh_token: 'refresh',
      ibs_client_id: 'ibs-client',
      ibs_user_id: 'ibs-user',
    });

    await expect(
      getValidSafehavenAccessToken(freshToken, refreshToken),
    ).resolves.toBe('fresh');
    expect(refreshToken).not.toHaveBeenCalled();

    await expect(
      getValidSafehavenAccessToken(staleToken, refreshToken),
    ).resolves.toBe('new');
    expect(refreshToken).toHaveBeenCalledTimes(1);
  });

  it('returns refreshed token metadata for account request headers', async () => {
    const staleToken: SafehavenTokenCache = {
      accessToken: 'stale',
      clientId: 'client',
      ibsClientId: 'old-ibs-client',
      ibsUserId: 'old-ibs-user',
      expiresAt: Date.now() + 10_000,
    };
    const refreshToken = jest.fn().mockResolvedValue({
      access_token: 'new',
      client_id: 'client',
      token_type: 'Bearer',
      expires_in: 120,
      refresh_token: 'refresh',
      ibs_client_id: 'new-ibs-client',
      ibs_user_id: 'new-ibs-user',
    });

    const token = await getValidSafehavenToken(staleToken, refreshToken);

    expect(token.accessToken).toBe('new');
    expect(getSafehavenClientHeaderValue(token, 'fallback-client')).toBe(
      'new-ibs-client',
    );
  });
});
