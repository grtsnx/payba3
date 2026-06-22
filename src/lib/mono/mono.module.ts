import { Global, Module } from '@nestjs/common';
import { MonoService } from './mono.service';

@Global()
@Module({
  providers: [MonoService],
  exports: [MonoService],
})
export class MonoModule {}
