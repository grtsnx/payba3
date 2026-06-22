import { Global, Module } from '@nestjs/common';
import { OPayService } from './opay.service';

@Global()
@Module({
  providers: [OPayService],
  exports: [OPayService],
})
export class OPayModule {}
