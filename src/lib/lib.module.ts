import { Module } from '@nestjs/common';
import { SafehavenModule } from './safehaven/safe.module';

@Module({
  imports: [SafehavenModule],
})
export class LibModule {}
