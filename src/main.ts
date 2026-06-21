import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app/app.module';
import { AllExceptionsFilter } from 'src/middleware';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import * as moment from 'moment-timezone';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { Logger as PinoLogger, LoggerErrorInterceptor } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';

const parseCsv = (value?: string): string[] =>
  value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    bufferLogs: true,
  });
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';
  const apiDocsEnabled = configService.get<boolean>(
    'ENABLE_API_DOCS',
    !isProduction,
  );
  const corsOrigins = parseCsv(configService.get<string>('CORS_ORIGINS'));
  const trustProxyHops = configService.get<number>('TRUST_PROXY_HOPS', 0);

  app.disable('x-powered-by');
  app.useBodyParser('json', {
    limit: configService.get<string>('REQUEST_BODY_LIMIT', '100kb'),
  });
  app.useBodyParser('urlencoded', {
    extended: false,
    limit: configService.get<string>('REQUEST_BODY_LIMIT', '100kb'),
    parameterLimit: configService.get<number>(
      'URLENCODED_PARAMETER_LIMIT',
      100,
    ),
  });

  if (trustProxyHops > 0) {
    app.set('trust proxy', trustProxyHops);
  }

  app.useLogger(app.get(PinoLogger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  // Global Exception Filter
  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          objectSrc: ["'none'"],
          scriptSrc: apiDocsEnabled
            ? ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"]
            : ["'self'"],
          styleSrc: apiDocsEnabled
            ? ["'self'", 'https:', "'unsafe-inline'"]
            : ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: apiDocsEnabled
            ? ["'self'", 'https://api.scalar.com']
            : ["'self'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  // Compression
  app.use(compression());

  // Enable CORS
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, corsOrigins.includes(origin));
    },
    credentials: false,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'ClientID'],
    maxAge: 600,
  });

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Set default timezone globally
  moment.tz.setDefault('UTC');

  // Configure Swagger
  const config = new DocumentBuilder()
    .setTitle('payba3 API')
    .setDescription('The payba3 API documentation')
    .setVersion('1.0')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);

  if (apiDocsEnabled) {
    // Set up Scalar API Reference
    app.use(
      '/reference',
      apiReference({
        theme: 'default',
        url: '/docs-json',
      }),
    );

    // Set up standard Swagger UI
    SwaggerModule.setup('docs', app, documentFactory);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  Logger.log(`🚀 Application is running on: http://localhost:${port}`);
  if (apiDocsEnabled) {
    Logger.log(
      `📚 Scalar API Reference available at: http://localhost:${port}/reference`,
    );
    Logger.log(`📜 Swagger UI available at: http://localhost:${port}/docs`);
  }
}
bootstrap().catch((err) => {
  console.error('Error during bootstrap', err);
  process.exit(1);
});
