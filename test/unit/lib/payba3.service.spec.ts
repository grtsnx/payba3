import { NotFoundException } from '@nestjs/common';
import { Payba3Service } from 'src/lib/payba3.service';
import type { Payba3ChannelMap } from 'src/lib/payba3.types';

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
    const service = new Payba3Service(
      channels.mono,
      channels.monnify,
      channels.opay,
      channels.paystack,
      channels.qoreid,
      channels.safehaven,
      channels.seerbit,
    );

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
    const service = new Payba3Service(
      channels.mono,
      channels.monnify,
      channels.opay,
      channels.paystack,
      channels.qoreid,
      channels.safehaven,
      channels.seerbit,
    );

    expect(service.use('paystack')).toBe(channels.paystack);
    expect(service.use('safehaven')).toBe(channels.safehaven);
  });

  it('throws for unsupported channels', () => {
    const channels = createChannels();
    const service = new Payba3Service(
      channels.mono,
      channels.monnify,
      channels.opay,
      channels.paystack,
      channels.qoreid,
      channels.safehaven,
      channels.seerbit,
    );

    expect(() => service.use('unknown' as never)).toThrow(NotFoundException);
  });
});
