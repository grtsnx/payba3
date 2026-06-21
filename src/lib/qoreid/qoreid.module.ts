import { Module, Global } from '@nestjs/common';
import { QoreIDService } from './qoreid.service';

@Global()
@Module({
  providers: [QoreIDService],
  exports: [QoreIDService],
})
export class QoreIDModule {}
