import { Global, Module } from '@nestjs/common';
import { SeerbitService } from './seerbit.service';

@Global()
@Module({
  providers: [SeerbitService],
  exports: [SeerbitService],
})
export class SeerbitModule {}
