import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app/app.module';
import { AllExceptionsFilter } from 'src/middleware';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import * as moment from 'moment-timezone';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { Logger as PinoLogger, LoggerErrorInterceptor } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
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
          scriptSrc: ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
          styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://api.scalar.com'],
        },
      },
    }),
  );

  // Compression
  app.use(compression());

  // Enable CORS
  app.enableCors();

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

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  Logger.log(`🚀 Application is running on: http://localhost:${port}`);
  Logger.log(
    `📚 Scalar API Reference available at: http://localhost:${port}/reference`,
  );
  Logger.log(`📜 Swagger UI available at: http://localhost:${port}/docs`);
}
bootstrap().catch((err) => {
  console.error('Error during bootstrap', err);
  process.exit(1);
});
