import type { MonoService } from './mono/mono.service';
import type { MonnifyService } from './monnify/monnify.service';
import type { OPayService } from './opay/opay.service';
import type { PaystackService } from './paystack/paystack.service';
import type { QoreIDService } from './qoreid/qoreid.service';
import type { SafehavenService } from './safehaven/safe.service';
import type { SeerbitService } from './seerbit/seerbit.service';

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
