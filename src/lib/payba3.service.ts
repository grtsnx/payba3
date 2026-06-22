import { MonoService } from './mono/mono.service';
import { MonnifyService } from './monnify/monnify.service';
import { OPayService } from './opay/opay.service';
import { PaystackService } from './paystack/paystack.service';
import { QoreIDService } from './qoreid/qoreid.service';
import { SafehavenService } from './safehaven/safe.service';
import { SeerbitService } from './seerbit/seerbit.service';
import { Payba3Error, PAYBA3_HTTP_STATUS } from './shared';
import {
  PAYBA3_CHANNELS,
  type Payba3Config,
  type Payba3ChannelMap,
  type Payba3ChannelName,
} from './payba3.types';

export class Payba3Service {
  private readonly channels: Payba3ChannelMap;

  constructor(config: Payba3Config = {}) {
    this.channels = {
      mono: config.channels?.mono ?? new MonoService(config.mono),
      monnify: config.channels?.monnify ?? new MonnifyService(config.monnify),
      opay: config.channels?.opay ?? new OPayService(config.opay),
      paystack:
        config.channels?.paystack ?? new PaystackService(config.paystack),
      qoreid: config.channels?.qoreid ?? new QoreIDService(config.qoreid),
      safehaven:
        config.channels?.safehaven ?? new SafehavenService(config.safehaven),
      seerbit: config.channels?.seerbit ?? new SeerbitService(config.seerbit),
    };
  }

  list(): Payba3ChannelName[] {
    return [...PAYBA3_CHANNELS];
  }

  has(channel: string): channel is Payba3ChannelName {
    return PAYBA3_CHANNELS.includes(channel as Payba3ChannelName);
  }

  use<T extends Payba3ChannelName>(channel: T): Payba3ChannelMap[T];
  use(channel: string): Payba3ChannelMap[Payba3ChannelName];
  use(channel: string): Payba3ChannelMap[Payba3ChannelName] {
    if (!this.has(channel)) {
      throw new Payba3Error(`Unsupported payment channel: ${channel}`, {
        statusCode: PAYBA3_HTTP_STATUS.NOT_FOUND,
      });
    }

    return this.channels[channel];
  }
}

export const createPayba3 = (config: Payba3Config = {}): Payba3Service =>
  new Payba3Service(config);
