import { Module } from '@nestjs/common';
import { MonoModule } from './mono/mono.module';
import { MonnifyModule } from './monnify/monnify.module';
import { OPayModule } from './opay/opay.module';
import { PaystackModule } from './paystack/paystack.module';
import { QoreIDModule } from './qoreid/qoreid.module';
import { SafehavenModule } from './safehaven/safe.module';
import { SeerbitModule } from './seerbit/seerbit.module';
import { Payba3Service } from './payba3.service';

@Module({
  imports: [
    MonoModule,
    MonnifyModule,
    OPayModule,
    PaystackModule,
    QoreIDModule,
    SafehavenModule,
    SeerbitModule,
  ],
  providers: [Payba3Service],
  exports: [Payba3Service],
})
export class LibModule {}
