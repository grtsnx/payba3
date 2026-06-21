import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from 'src/middleware';
import { TerminusModule } from '@nestjs/terminus';
import { LibModule } from 'src/lib/lib.module';

@Module({
  imports: [
    LibModule,
    TerminusModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        customSuccessMessage: (req, res) => {
          return `${req.method} ${req.url} - ${res.statusCode}`;
        },
        customErrorMessage: (req, res, err) => {
          return `${req.method} ${req.url} - ${res.statusCode} - ERR: ${err.message}`;
        },
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  ignore: 'pid,hostname,context,req,res,responseTime',
                },
              }
            : undefined,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
