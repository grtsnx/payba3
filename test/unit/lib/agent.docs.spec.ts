import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAYBA3_CHANNELS } from 'src/lib/payba3.types';

const rootDir = process.cwd();

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(join(rootDir, path), 'utf8')) as T;

const readText = (path: string): string =>
  readFileSync(join(rootDir, path), 'utf8');

type PackageJson = {
  version: string;
  exports: Record<string, unknown>;
  files: string[];
};

type AgentManifest = {
  version: string;
  package: string;
  providers: string[];
  docs: Record<string, unknown>;
  securityRules: string[];
};

type McpToolManifest = {
  resources: Array<{ name: string; uri: string }>;
  tools: Array<{
    name: string;
    requiresHumanApproval: boolean;
    inputSchema: Record<string, unknown>;
  }>;
};

describe('agent documentation surface', () => {
  it('exports every agent-facing document from package.json', () => {
    const packageJson = readJson<PackageJson>('package.json');

    expect(packageJson.exports).toMatchObject({
      './llms.txt': './llms.txt',
      './llms-full.txt': './llms-full.txt',
      './agents.json': './agents/payba3.agent.json',
      './agents.md': './agents/payba3.agent.md',
      './agents/ide-prompt.md': './agents/ide-prompt.md',
      './agents/mcp-tools.json': './agents/mcp-tools.json',
    });
    expect(packageJson.files).toEqual(
      expect.arrayContaining(['llms-full.txt', 'agents']),
    );
  });

  it('keeps the agent manifest aligned with package channels and version', () => {
    const packageJson = readJson<PackageJson>('package.json');
    const manifest = readJson<AgentManifest>('agents/payba3.agent.json');

    expect(manifest.package).toBe('@grtsnx/payba3');
    expect(manifest.version).toBe(packageJson.version);
    expect(manifest.providers).toEqual([...PAYBA3_CHANNELS]);
    expect(manifest.docs).toMatchObject({
      index: '@grtsnx/payba3/llms.txt',
      full: '@grtsnx/payba3/llms-full.txt',
      agentGuide: '@grtsnx/payba3/agents.md',
      mcpToolSchema: '@grtsnx/payba3/agents/mcp-tools.json',
    });
    expect(manifest.securityRules.join('\n')).toContain(
      'Never expose provider secrets',
    );
  });

  it('provides MCP-style tool contracts with explicit schemas', () => {
    const mcpTools = readJson<McpToolManifest>('agents/mcp-tools.json');

    expect(mcpTools.resources.map((resource) => resource.uri)).toEqual(
      expect.arrayContaining([
        'package:@grtsnx/payba3/llms.txt',
        'package:@grtsnx/payba3/agents.md',
        'package:@grtsnx/payba3/llms-full.txt',
      ]),
    );
    expect(mcpTools.tools.length).toBeGreaterThanOrEqual(5);

    for (const tool of mcpTools.tools) {
      expect(tool.name).toMatch(/^payba3_/);
      expect(tool.inputSchema).toMatchObject({
        type: 'object',
        additionalProperties: false,
      });
      expect(typeof tool.requiresHumanApproval).toBe('boolean');
    }
  });

  it('documents the IDE/LLM discovery order in Markdown files', () => {
    const llmsIndex = readText('llms.txt');
    const fullContext = readText('llms-full.txt');
    const agentGuide = readText('agents/payba3.agent.md');
    const idePrompt = readText('agents/ide-prompt.md');

    for (const contents of [llmsIndex, fullContext, agentGuide, idePrompt]) {
      expect(contents).toContain('@grtsnx/payba3');
      expect(contents).toContain('server-side');
    }

    expect(llmsIndex).toContain('@grtsnx/payba3/agents.md');
    expect(fullContext).toContain('@grtsnx/payba3/agents/mcp-tools.json');
    expect(agentGuide).toContain('Discovery Order');
    expect(idePrompt).toContain('Read these package docs before writing code');
  });
});
