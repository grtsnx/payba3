import { PaystackService } from './paystack.service';

describe('PaystackService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.PAYSTACK_SECRET_KEY;
    delete process.env.PAYSTACK_SECRET_KEY_LIVE;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does not throw at startup when Paystack is not configured', () => {
    expect(() => new PaystackService()).not.toThrow();
  });

  it('fails only when a Paystack call is made without credentials', async () => {
    const service = new PaystackService();

    await expect(service.getPaystackBalance()).rejects.toThrow(
      'Paystack secret key not set',
    );
  });
});
