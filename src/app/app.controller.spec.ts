import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: HealthCheckService,
          useValue: { check: jest.fn() },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: { checkHeap: jest.fn() },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('returns the API welcome response', () => {
    expect(appController.getHello()).toBe('Hello World!');
  });
});
