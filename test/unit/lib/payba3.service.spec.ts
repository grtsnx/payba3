import { createPayba3, Payba3Service } from 'src/lib/payba3.service';
import type { Payba3ChannelMap } from 'src/lib/payba3.types';
import { Payba3Error } from 'src/lib/shared';

const createChannels = (): Payba3ChannelMap =>
  ({
    mono: { name: 'mono' },
    monnify: { name: 'monnify' },
    opay: { name: 'opay' },
    paystack: { name: 'paystack' },
    qoreid: { name: 'qoreid' },
    safehaven: { name: 'safehaven' },
    seerbit: { name: 'seerbit' },
  }) as unknown as Payba3ChannelMap;

describe('Payba3Service', () => {
  it('lists supported channels', () => {
    const channels = createChannels();
    const service = new Payba3Service({ channels });

    expect(service.list()).toEqual([
      'mono',
      'monnify',
      'opay',
      'paystack',
      'qoreid',
      'safehaven',
      'seerbit',
    ]);
  });

  it('returns the selected provider service', () => {
    const channels = createChannels();
    const service = new Payba3Service({ channels });

    expect(service.use('paystack')).toBe(channels.paystack);
    expect(service.use('safehaven')).toBe(channels.safehaven);
  });

  it('throws for unsupported channels', () => {
    const channels = createChannels();
    const service = new Payba3Service({ channels });

    expect(() => service.use('unknown' as never)).toThrow(Payba3Error);
    expect(() => service.use('unknown' as never)).toThrow(
      'Unsupported payment channel: unknown',
    );
  });

  it('creates framework-neutral default channel clients', () => {
    const service = createPayba3({
      paystack: { secretKey: 'paystack-secret' },
      safehaven: {
        clientId: 'safe-client',
        clientAssertion: 'safe-assertion',
      },
      qoreid: {
        clientId: 'qore-client',
        secret: 'qore-secret',
      },
    });

    expect(service.use('paystack').constructor.name).toBe('PaystackService');
    expect(service.use('safehaven').constructor.name).toBe('SafehavenService');
    expect(service.use('qoreid').constructor.name).toBe('QoreIDService');
  });
});
