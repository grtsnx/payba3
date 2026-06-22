import {
  buildOPayHeaders,
  createOPayCallbackSignature,
  createOPaySignature,
  getOPayBaseUrl,
  OPAY_BASE_URLS,
  verifyOPayCallbackSignature,
} from 'src/lib/opay/config/opay.helper';
import type { OPayCredentials } from 'src/lib/opay/config/opay.types';

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

  it('uses stable HMAC-SHA512 signatures for signed requests', () => {
    const payload = {
      amount: { currency: 'NGN', total: 1000 },
      country: 'NG',
      reference: 'ref',
    };
    const signature = createOPaySignature(payload, credentials.secretKey);

    expect(signature).toMatch(/^[a-f0-9]{128}$/);
    expect(
      buildOPayHeaders(credentials, {
        authMode: 'signature',
        body: payload,
      }).Authorization,
    ).toBe(`Bearer ${signature}`);
  });

  it('verifies callback payloads with HMAC-SHA3-512', () => {
    const payload = {
      amount: { currency: 'NGN', total: 1000 },
      country: 'NG',
      reference: 'ref',
    };
    const callbackSignature = createOPayCallbackSignature(
      payload,
      credentials.secretKey,
    );
    const requestSignature = createOPaySignature(
      payload,
      credentials.secretKey,
    );

    expect(callbackSignature).toMatch(/^[a-f0-9]{128}$/);
    expect(callbackSignature).not.toBe(requestSignature);
    expect(
      verifyOPayCallbackSignature(payload, callbackSignature, 'secret'),
    ).toBe(true);
    expect(
      verifyOPayCallbackSignature(payload, requestSignature, 'secret'),
    ).toBe(false);
  });
});
