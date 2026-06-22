import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const packageJson = JSON.parse(
  readFileSync(path.join(rootDir, 'package.json'), 'utf8'),
);
const packageName = packageJson.name;
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

const tempDir = mkdtempSync(path.join(tmpdir(), `payba3-${installer}-smoke-`));
const packOutput = execFileSync(
  'npm',
  ['pack', '--json', '--ignore-scripts', '--pack-destination', tempDir],
  {
    cwd: rootDir,
    encoding: 'utf8',
    env: process.env,
  },
);
const [{ filename }] = JSON.parse(packOutput);
const tarballPath = path.join(tempDir, filename);
const peerPackages = [];

const smokeSource = `
const { readFileSync } = require('node:fs');
const pkg = require('${packageName}');
const required = [
  'createPayba3',
  'Payba3Service',
  'Payba3Error',
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
const payba3 = pkg.createPayba3();
if (payba3.use('paystack').constructor.name !== 'PaystackService') {
  throw new Error('createPayba3 did not create PaystackService');
}
const llmDocs = [
  '${packageName}/llms.txt',
  '${packageName}/llms/paystack.txt',
  '${packageName}/llms/safehaven.txt',
  '${packageName}/llms/seerbit.txt',
  '${packageName}/llms/opay.txt',
  '${packageName}/llms/mono.txt',
  '${packageName}/llms/monnify.txt',
  '${packageName}/llms/qoreid.txt'
];
for (const doc of llmDocs) {
  const resolved = require.resolve(doc);
  const contents = readFileSync(resolved, 'utf8');
  if (!contents.trim()) {
    throw new Error('Empty LLM doc: ' + doc);
  }
}
console.log('${packageName} import smoke passed:', pkg.PAYBA3_CHANNELS.join(', '));
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
