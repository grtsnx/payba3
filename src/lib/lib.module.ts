import { Module } from '@nestjs/common';
import { PaystackModule } from './paystack/paystack.module';
import { QoreIDModule } from './qoreid/qoreid.module';
import { SafehavenModule } from './safehaven/safe.module';
import { SeerbitModule } from './seerbit/seerbit.module';

@Module({
  imports: [PaystackModule, QoreIDModule, SafehavenModule, SeerbitModule],
})
export class LibModule {}
