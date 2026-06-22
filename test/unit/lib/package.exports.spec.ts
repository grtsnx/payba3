import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createPayba3,
  Payba3Error,
  Payba3Service,
  PAYBA3_CHANNELS,
} from 'src/index';
import * as publicExports from 'src/index';

const rootDir = process.cwd();

const collectPublicCoreFiles = (dir: string): string[] => {
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      return collectPublicCoreFiles(path);
    }

    if (
      !entry.name.endsWith('.ts') ||
      entry.name.endsWith('.spec.ts') ||
      entry.name.endsWith('.module.ts') ||
      entry.name === 'lib.module.ts'
    ) {
      return [];
    }

    return [path];
  });
};

describe('public package exports', () => {
  it('exports a framework-neutral factory and provider clients', () => {
    const payba3 = createPayba3({
      paystack: { secretKey: 'paystack-secret' },
      safehaven: {
        clientId: 'safe-client',
        clientAssertion: 'safe-assertion',
      },
      qoreid: {
        clientId: 'qore-client',
        secret: 'qore-secret',
      },
    });

    expect(payba3).toBeInstanceOf(Payba3Service);
    expect(payba3.use('paystack').constructor.name).toBe('PaystackService');
    expect(PAYBA3_CHANNELS).toEqual([
      'mono',
      'monnify',
      'opay',
      'paystack',
      'qoreid',
      'safehaven',
      'seerbit',
    ]);
  });

  it('does not expose the local Nest module from the root package', () => {
    expect('LibModule' in publicExports).toBe(false);
  });

  it('keeps the public core source free of Nest imports', () => {
    const publicFiles = [
      join(rootDir, 'src/index.ts'),
      ...collectPublicCoreFiles(join(rootDir, 'src/lib')),
    ];

    expect(publicFiles.length).toBeGreaterThan(0);

    for (const file of publicFiles) {
      const source = readFileSync(file, 'utf8');

      expect(source).not.toContain('@nestjs/');
    }
  });

  it('uses Payba3Error as the framework-neutral error surface', () => {
    const error = new Payba3Error('Example failure', {
      statusCode: 400,
      provider: 'paystack',
      code: 'example_failure',
      data: { reference: 'ref' },
    });

    expect(error.getStatus()).toBe(400);
    expect(error.getResponse()).toEqual({
      statusCode: 400,
      statusType: 'BAD_REQUEST',
      message: 'Example failure',
      provider: 'paystack',
      code: 'example_failure',
      data: { reference: 'ref' },
    });
  });
});
