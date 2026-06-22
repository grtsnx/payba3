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
      groups?: NavigationGroup[];
    };

type NavigationGroup = {
  group: string;
  pages: NavigationPage[];
};

type NavigationTab = {
  tab: string;
  groups: NavigationGroup[];
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
    groups?: NavigationGroup[];
    tabs?: NavigationTab[];
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

const collectNavigationGroups = (
  navigation: MintlifyDocsJson['navigation'],
): NavigationGroup[] => [
  ...(navigation.groups ?? []),
  ...(navigation.tabs ?? []).flatMap((tab) => tab.groups),
];

const collectDocsPages = (
  navigation: MintlifyDocsJson['navigation'],
): string[] =>
  collectNavigationPages(
    collectNavigationGroups(navigation).flatMap((group) => group.pages),
  );

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

const expectLocalAsset = (path?: string, baseDir = rootDir): void => {
  expect(path).toBeDefined();
  expect(existsSync(join(baseDir, path?.replace(/^\//, '') ?? ''))).toBe(true);
};

describe('Mintlify documentation', () => {
  it('defines the required Mintlify configuration surface', () => {
    const docsJson = readJson<MintlifyDocsJson>('docs.json');

    expect(docsJson.theme).toBe('mint');
    expect(docsJson.name).toBe('payba3');
    expect(typeof docsJson.colors.primary).toBe('string');
    expect(Array.isArray(docsJson.navigation.tabs)).toBe(true);
    expect(docsJson.description).toContain('payment');
    expect(docsJson.navigation.tabs?.map((tab) => tab.tab)).toEqual([
      'Documentation',
      'API Reference',
    ]);
    expectLocalAsset(docsJson.logo?.light);
    expectLocalAsset(docsJson.logo?.dark);
    expectLocalAsset(docsJson.favicon);
  });

  it('supports both repo-root and docs-directory Mintlify project roots', () => {
    const rootDocsJson = readJson<MintlifyDocsJson>('docs.json');
    const docsDirectoryJson = readJson<MintlifyDocsJson>('docs/docs.json');
    const rootNavPages = collectDocsPages(rootDocsJson.navigation).sort();
    const docsDirectoryPages = collectDocsPages(
      docsDirectoryJson.navigation,
    ).sort();

    expect(rootDocsJson.name).toBe(docsDirectoryJson.name);
    expect(rootDocsJson.theme).toBe(docsDirectoryJson.theme);
    expect(rootDocsJson.navigation.tabs?.map((tab) => tab.tab)).toEqual(
      docsDirectoryJson.navigation.tabs?.map((tab) => tab.tab),
    );
    expect(rootNavPages.map((page) => page.replace(/^docs\//, ''))).toEqual(
      docsDirectoryPages,
    );

    for (const page of docsDirectoryPages) {
      expect(existsSync(join(rootDir, 'docs', `${page}.mdx`))).toBe(true);
    }

    expectLocalAsset(docsDirectoryJson.logo?.light, join(rootDir, 'docs'));
    expectLocalAsset(docsDirectoryJson.logo?.dark, join(rootDir, 'docs'));
    expectLocalAsset(docsDirectoryJson.favicon, join(rootDir, 'docs'));
  });

  it('keeps every Mintlify navigation page backed by an MDX file', () => {
    const docsJson = readJson<MintlifyDocsJson>('docs.json');
    const navPages = collectDocsPages(docsJson.navigation);
    const uniqueNavPages = [...new Set(navPages)];

    expect(uniqueNavPages).toHaveLength(navPages.length);

    for (const page of uniqueNavPages) {
      expect(page).toMatch(/^docs\//);
      expect(existsSync(join(rootDir, `${page}.mdx`))).toBe(true);
    }
  });

  it('keeps every docs MDX page reachable from Mintlify navigation', () => {
    const docsJson = readJson<MintlifyDocsJson>('docs.json');
    const navPages = collectDocsPages(docsJson.navigation).sort();
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
      const apiReferenceDoc = readText(
        `docs/api-reference/providers/${channel}.mdx`,
      );

      expect(providerDoc).toContain(`payba3.use('${channel}')`);
      expect(providerDoc).toContain('## Signup and docs');
      expect(providerDoc).toContain('## Configuration');
      expect(providerDoc).toContain('API docs');
      expect(apiReferenceDoc).toContain(`payba3.use('${channel}')`);
      expect(apiReferenceDoc).toContain('## Methods');
    }
  });

  it('keeps public navigation focused on documentation and API reference', () => {
    const docsJson = readJson<MintlifyDocsJson>('docs.json');
    const groupNames = collectNavigationGroups(docsJson.navigation).map(
      (group) => group.group,
    );
    const pages = collectDocsPages(docsJson.navigation);

    expect(docsJson.navigation.tabs?.map((tab) => tab.tab)).toEqual([
      'Documentation',
      'API Reference',
    ]);
    expect(groupNames).toEqual(expect.arrayContaining(['Provider APIs']));
    expect(groupNames).not.toContain('Operations');
    expect(pages).toEqual(
      expect.arrayContaining([
        'docs/api-reference/introduction',
        'docs/api-reference/client',
        'docs/api-reference/configuration',
        'docs/api-reference/errors',
      ]),
    );
    expect(pages.some((page) => page.includes('/operations/'))).toBe(false);
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
    expect(readText('docs/api-reference/introduction.mdx')).toContain(
      'server-side TypeScript and JavaScript SDK',
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
