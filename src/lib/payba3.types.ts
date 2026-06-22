import type { MonoService } from './mono/mono.service';
import type { MonoServiceOptions } from './mono/config/mono.types';
import type { MonnifyService } from './monnify/monnify.service';
import type { MonnifyServiceOptions } from './monnify/config/monnify.types';
import type { OPayService } from './opay/opay.service';
import type { OPayServiceOptions } from './opay/config/opay.types';
import type { PaystackService } from './paystack/paystack.service';
import type { PaystackServiceOptions } from './paystack/config/paystack.types';
import type { QoreIDService } from './qoreid/qoreid.service';
import type { QoreIDServiceOptions } from './qoreid/config/qoreid.types';
import type { SafehavenService } from './safehaven/safe.service';
import type { SafehavenServiceOptions } from './safehaven/config/safe.types';
import type { SeerbitService } from './seerbit/seerbit.service';
import type { SeerbitServiceOptions } from './seerbit/config/seerbit.types';

export const PAYBA3_CHANNELS = [
  'mono',
  'monnify',
  'opay',
  'paystack',
  'qoreid',
  'safehaven',
  'seerbit',
] as const;

export type Payba3ChannelName = (typeof PAYBA3_CHANNELS)[number];

export type Payba3ChannelMap = {
  mono: MonoService;
  monnify: MonnifyService;
  opay: OPayService;
  paystack: PaystackService;
  qoreid: QoreIDService;
  safehaven: SafehavenService;
  seerbit: SeerbitService;
};

export type Payba3Config = {
  mono?: MonoServiceOptions;
  monnify?: MonnifyServiceOptions;
  opay?: OPayServiceOptions;
  paystack?: PaystackServiceOptions;
  qoreid?: QoreIDServiceOptions;
  safehaven?: SafehavenServiceOptions;
  seerbit?: SeerbitServiceOptions;
  channels?: Partial<Payba3ChannelMap>;
};
