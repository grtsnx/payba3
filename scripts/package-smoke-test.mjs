import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const installerIndex = process.argv.indexOf('--installer');
const installer =
  installerIndex === -1 ? 'npm' : (process.argv[installerIndex + 1] ?? 'npm');

if (!['npm', 'bun'].includes(installer)) {
  throw new Error(`Unsupported installer "${installer}". Use npm or bun.`);
}

const run = (command, args, options = {}) =>
  execFileSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
    ...options,
  });

if (!existsSync(path.join(rootDir, 'dist/index.js'))) {
  run('npm', ['run', 'build']);
}

const packOutput = execFileSync(
  'npm',
  ['pack', '--json', '--ignore-scripts'],
  {
    cwd: rootDir,
    encoding: 'utf8',
    env: process.env,
  },
);
const [{ filename }] = JSON.parse(packOutput);
const tarballPath = path.join(rootDir, filename);
const tempDir = mkdtempSync(path.join(tmpdir(), `payba3-${installer}-smoke-`));
const peerPackages = [
  '@nestjs/common@^11.0.1',
  '@nestjs/config@^4.0.4',
  '@nestjs/core@^11.0.1',
  'reflect-metadata@^0.2.2',
  'rxjs@^7.8.1',
];

const smokeSource = `
const pkg = require('payba3');
const required = [
  'LibModule',
  'Payba3Service',
  'PAYBA3_CHANNELS',
  'PaystackService',
  'SafehavenService',
  'QoreIDService'
];
const missing = required.filter((key) => !(key in pkg));
if (missing.length > 0) {
  throw new Error('Missing exports: ' + missing.join(', '));
}
for (const channel of ['paystack', 'safehaven', 'seerbit', 'opay', 'mono', 'monnify', 'qoreid']) {
  if (!pkg.PAYBA3_CHANNELS.includes(channel)) {
    throw new Error('Missing channel: ' + channel);
  }
}
console.log('payba3 import smoke passed:', pkg.PAYBA3_CHANNELS.join(', '));
`;

try {
  writeFileSync(
    path.join(tempDir, 'package.json'),
    `${JSON.stringify({ private: true, type: 'commonjs' }, null, 2)}\n`,
  );

  if (installer === 'npm') {
    run(
      'npm',
      [
        'install',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        tarballPath,
        ...peerPackages,
      ],
      { cwd: tempDir },
    );
    run('node', ['-e', smokeSource], { cwd: tempDir });
  } else {
    run('bun', ['add', tarballPath, ...peerPackages], { cwd: tempDir });
    run('bun', ['--eval', smokeSource], { cwd: tempDir });
  }

  console.log(`Package ${installer} smoke test passed.`);
} finally {
  rmSync(tarballPath, { force: true });
  rmSync(tempDir, { recursive: true, force: true });
}
