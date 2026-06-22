import {
  buildOPayHeaders,
  createOPaySignature,
  getOPayBaseUrl,
  OPAY_BASE_URLS,
  verifyOPayCallbackSignature,
} from './opay.helper';
import type { OPayCredentials } from './opay.types';

describe('OPay helpers', () => {
  const credentials: OPayCredentials = {
    merchantId: 'merchant',
    publicKey: 'public',
    secretKey: 'secret',
  };

  it('selects environment base URLs', () => {
    expect(getOPayBaseUrl('sandbox')).toBe(OPAY_BASE_URLS.sandbox);
    expect(getOPayBaseUrl('live')).toBe(OPAY_BASE_URLS.live);
  });

  it('uses public key auth for cashier requests', () => {
    expect(
      buildOPayHeaders(credentials, {
        authMode: 'publicKey',
        body: { reference: 'ref' },
      }),
    ).toMatchObject({
      Authorization: 'Bearer public',
      MerchantId: 'merchant',
    });
  });

  it('uses stable HMAC signatures for signed requests and callbacks', () => {
    const payload = {
      amount: { currency: 'NGN', total: 1000 },
      country: 'NG',
      reference: 'ref',
    };
    const signature = createOPaySignature(payload, credentials.secretKey);

    expect(signature).toMatch(/^[a-f0-9]{128}$/);
    expect(verifyOPayCallbackSignature(payload, signature, 'secret')).toBe(
      true,
    );
    expect(verifyOPayCallbackSignature(payload, signature, 'wrong')).toBe(
      false,
    );
  });
});
