import { Global, Module } from '@nestjs/common';
import { SafehavenService } from './safe.service';

@Global()
@Module({
  providers: [SafehavenService],
  exports: [SafehavenService],
})
export class SafehavenModule {}
