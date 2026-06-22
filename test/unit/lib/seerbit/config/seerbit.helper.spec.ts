import {
  generateSeerbitBearerToken,
  getSeerbitBaseUrl,
  getSeerbitCredentials,
  SEERBIT_BASE_URLS,
} from 'src/lib/seerbit/config/seerbit.helper';

describe('Seerbit helpers', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SEERBIT_PUBLIC_KEY: 'test-public',
      SEERBIT_SECRET_KEY: 'test-secret',
      SEERBIT_LIVE_PUBLIC_KEY: 'live-public',
      SEERBIT_LIVE_SECRET_KEY: 'live-secret',
    };
    global.fetch = fetchMock;
  });

  afterEach(() => {
    fetchMock.mockReset();
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it('selects base URLs and environment credentials', () => {
    expect(getSeerbitBaseUrl('sandbox')).toBe(SEERBIT_BASE_URLS.sandbox);
    expect(getSeerbitBaseUrl('live')).toBe(SEERBIT_BASE_URLS.live);
    expect(
      getSeerbitBaseUrl('sandbox', 'https://seerbit.example.test///'),
    ).toBe('https://seerbit.example.test');
    expect(getSeerbitCredentials('sandbox')).toMatchObject({
      publicKey: 'test-public',
      secretKey: 'test-secret',
    });
    expect(getSeerbitCredentials('live')).toMatchObject({
      publicKey: 'live-public',
      secretKey: 'live-secret',
    });
  });

  it.each(['EncryptedSecKey', 'EncrytedSecKey'])(
    'accepts %s encrypted key responses',
    async (field) => {
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 'SUCCESS',
            data: {
              [field]: {
                encryptedKey: 'encrypted-token',
              },
            },
          }),
          { status: 200 },
        ),
      );

      await expect(
        generateSeerbitBearerToken(
          SEERBIT_BASE_URLS.sandbox,
          'test-public',
          'test-secret',
        ),
      ).resolves.toBe('encrypted-token');
    },
  );
});
