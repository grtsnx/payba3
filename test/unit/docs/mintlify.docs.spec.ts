import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { PAYBA3_CHANNELS } from 'src/lib/payba3.types';

const rootDir = process.cwd();

type NavigationPage =
  | string
  | {
      group?: string;
      page?: string;
      pages?: NavigationPage[];
    };

type MintlifyDocsJson = {
  theme: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    light?: string;
    dark?: string;
  };
  logo?: {
    light?: string;
    dark?: string;
  };
  favicon?: string;
  navigation: {
    groups: Array<{
      group: string;
      pages: NavigationPage[];
    }>;
  };
};

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(join(rootDir, path), 'utf8')) as T;

const readText = (path: string): string =>
  readFileSync(join(rootDir, path), 'utf8');

const collectNavigationPages = (pages: NavigationPage[]): string[] =>
  pages.flatMap((page) => {
    if (typeof page === 'string') {
      return [page];
    }

    if (page.page) {
      return [page.page];
    }

    return collectNavigationPages(page.pages ?? []);
  });

const collectMdxFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(dir, entry.name);

    if (entry.isDirectory()) {
      return collectMdxFiles(absolutePath);
    }

    return entry.isFile() && entry.name.endsWith('.mdx') ? [absolutePath] : [];
  });

const toMintlifyPagePath = (absolutePath: string): string =>
  relative(rootDir, absolutePath)
    .replace(/\\/g, '/')
    .replace(/\.mdx$/, '');

const expectLocalAsset = (path?: string): void => {
  expect(path).toBeDefined();
  expect(existsSync(join(rootDir, path?.replace(/^\//, '') ?? ''))).toBe(true);
};

describe('Mintlify documentation', () => {
  it('defines the required Mintlify configuration surface', () => {
    const docsJson = readJson<MintlifyDocsJson>('docs.json');

    expect(docsJson.theme).toBe('mint');
    expect(docsJson.name).toBe('payba3');
    expect(typeof docsJson.colors.primary).toBe('string');
    expect(Array.isArray(docsJson.navigation.groups)).toBe(true);
    expect(docsJson.description).toContain('payment');
    expect(docsJson.navigation.groups.length).toBeGreaterThanOrEqual(8);
    expectLocalAsset(docsJson.logo?.light);
    expectLocalAsset(docsJson.logo?.dark);
    expectLocalAsset(docsJson.favicon);
  });

  it('keeps every Mintlify navigation page backed by an MDX file', () => {
    const docsJson = readJson<MintlifyDocsJson>('docs.json');
    const navPages = collectNavigationPages(
      docsJson.navigation.groups.flatMap((group) => group.pages),
    );
    const uniqueNavPages = [...new Set(navPages)];

    expect(uniqueNavPages).toHaveLength(navPages.length);

    for (const page of uniqueNavPages) {
      expect(page).toMatch(/^docs\//);
      expect(existsSync(join(rootDir, `${page}.mdx`))).toBe(true);
    }
  });

  it('keeps every docs MDX page reachable from Mintlify navigation', () => {
    const docsJson = readJson<MintlifyDocsJson>('docs.json');
    const navPages = collectNavigationPages(
      docsJson.navigation.groups.flatMap((group) => group.pages),
    ).sort();
    const mdxPages = collectMdxFiles(join(rootDir, 'docs'))
      .map(toMintlifyPagePath)
      .sort();

    expect(navPages).toEqual(mdxPages);
  });

  it('requires useful frontmatter on every Mintlify page', () => {
    const mdxFiles = collectMdxFiles(join(rootDir, 'docs'));

    for (const file of mdxFiles) {
      const contents = readFileSync(file, 'utf8');
      const frontmatter = contents.match(/^---\n([\s\S]*?)\n---/);
      const frontmatterBody = frontmatter?.[1] ?? '';

      expect(frontmatterBody).toContain('title: ');
      expect(frontmatterBody).toContain('description: ');
      expect(contents).toMatch(/^# /m);
    }
  });

  it('documents every public provider channel with setup and usage context', () => {
    for (const channel of PAYBA3_CHANNELS) {
      const providerDoc = readText(`docs/providers/${channel}.mdx`);

      expect(providerDoc).toContain(`payba3.use('${channel}')`);
      expect(providerDoc).toContain('## Signup and docs');
      expect(providerDoc).toContain('## Configuration');
      expect(providerDoc).toContain('API docs');
    }
  });

  it('documents the framework-neutral and agent integration paths', () => {
    expect(readText('docs/introduction.mdx')).toContain('framework-neutral');
    expect(readText('docs/quickstart.mdx')).toContain('createPayba3');
    expect(readText('docs/agents/overview.mdx')).toContain(
      '@grtsnx/payba3/llms.txt',
    );
    expect(readText('docs/agents/mcp-tool-servers.mdx')).toContain(
      'MCP tool server',
    );
    expect(readText('docs/examples/nestjs.mdx')).toContain(
      'does not require Nest',
    );
  });

  it('keeps reference environment variables aligned with provider code', () => {
    const environmentReference = readText(
      'docs/reference/environment-variables.mdx',
    );

    expect(environmentReference).toContain('PAYSTACK_SECRET_KEY');
    expect(environmentReference).toContain('SAFEHAVEN_CLIENT_ID');
    expect(environmentReference).toContain('OPAY_MERCHANT_ID');
    expect(environmentReference).toContain('MONO_SECRET_KEY');
    expect(environmentReference).toContain('MONNIFY_CONTRACT_CODE');
    expect(environmentReference).toContain('SEERBIT_PUBLIC_KEY');
    expect(environmentReference).toContain('QOREID_CLIENT');
    expect(environmentReference).toContain('QOREID_LIVE_CLIENT');
    expect(environmentReference).not.toContain('QOREID_CLIENT_ID');
    expect(environmentReference).not.toContain('QOREID_LIVE_CLIENT_ID');
  });
});
