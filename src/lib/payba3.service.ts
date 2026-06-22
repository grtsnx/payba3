import { Injectable, NotFoundException } from '@nestjs/common';
import { MonoService } from './mono/mono.service';
import { MonnifyService } from './monnify/monnify.service';
import { OPayService } from './opay/opay.service';
import { PaystackService } from './paystack/paystack.service';
import { QoreIDService } from './qoreid/qoreid.service';
import { SafehavenService } from './safehaven/safe.service';
import { SeerbitService } from './seerbit/seerbit.service';
import {
  PAYBA3_CHANNELS,
  type Payba3ChannelMap,
  type Payba3ChannelName,
} from './payba3.types';

@Injectable()
export class Payba3Service {
  private readonly channels: Payba3ChannelMap;

  constructor(
    mono: MonoService,
    monnify: MonnifyService,
    opay: OPayService,
    paystack: PaystackService,
    qoreid: QoreIDService,
    safehaven: SafehavenService,
    seerbit: SeerbitService,
  ) {
    this.channels = {
      mono,
      monnify,
      opay,
      paystack,
      qoreid,
      safehaven,
      seerbit,
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
      throw new NotFoundException(`Unsupported payment channel: ${channel}`);
    }

    return this.channels[channel];
  }
}
