import { writeFile } from 'node:fs/promises';

import * as core from '@actions/core';
import { getPackages } from '@manypkg/get-packages';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { OutputEvent } from './changesets-output.js';
import { run, runPublish } from './run.js';
import { execWithOutput } from './utils.js';

vi.mock('@actions/core');
vi.mock('@manypkg/get-packages');
vi.mock('./utils.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./utils.js')>();
  return {
    ...actual,
    execWithOutput: vi.fn(),
  };
});

const execWithOutputMock = vi.mocked(execWithOutput);
const getPackagesMock = vi.mocked(getPackages);
const coreMock = vi.mocked(core);

const makePkg = (name: string, version: string) =>
  ({
    dir: `/repo/packages/${name}`,
    relativeDir: `packages/${name}`,
    packageJson: { name, version },
  }) as Awaited<ReturnType<typeof getPackages>>['packages'][number];

const pkgA = makePkg('@scope/pkg-a', '1.2.3-snapshot');
const pkgB = makePkg('@scope/pkg-b', '4.5.6-snapshot');

const mockWorkspace = (
  packages: Array<typeof pkgA>,
  toolType: string = 'pnpm',
) => {
  getPackagesMock.mockResolvedValue({
    packages,
    tool: { type: toolType },
    rootDir: '/repo',
  } as Awaited<ReturnType<typeof getPackages>>);
};

const mockPublishOutput = (events: OutputEvent[] = []) => {
  execWithOutputMock.mockImplementation(async (_command, _args, options) => {
    const outputFile = options?.env?.CHANGESETS_OUTPUT;
    if (outputFile) {
      await writeFile(
        outputFile,
        events.map((event) => JSON.stringify(event)).join('\n'),
      );
    }

    return { code: 0, stdout: '', stderr: '' };
  });
};

beforeEach(() => {
  coreMock.getInput.mockReturnValue('');
  mockPublishOutput();
  mockWorkspace([pkgA, pkgB]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('run', () => {
  test('splits the script and forwards exec options', async () => {
    await run({
      script: 'node /cli/bin.js version --snapshot branch',
      cwd: '/repo',
      ignoreReturnCode: true,
      env: { FOO: 'bar' },
    });

    expect(execWithOutputMock).toHaveBeenCalledWith(
      'node',
      ['/cli/bin.js', 'version', '--snapshot', 'branch'],
      {
        cwd: '/repo',
        ignoreReturnCode: true,
        env: { FOO: 'bar' },
      },
    );
  });

  test('throws when the script is empty', async () => {
    await expect(run({ script: '   ' })).rejects.toThrow(
      'Error running script "   ". No command found.',
    );
  });
});

describe('runPublish', () => {
  const publishScript = 'node /cli/bin.js publish --tag feature-branch';

  test('reads published packages from CHANGESETS_OUTPUT', async () => {
    mockPublishOutput([
      {
        type: 'git-tag',
        tag: '@scope/pkg-a@1.2.3-snapshot',
        packageName: '@scope/pkg-a',
      },
      {
        type: 'git-tag',
        tag: '@scope/pkg-b@4.5.6-snapshot',
        packageName: '@scope/pkg-b',
      },
    ]);

    await expect(
      runPublish({ script: publishScript, cwd: '/repo' }),
    ).resolves.toEqual({
      published: true,
      publishedPackages: [
        { name: '@scope/pkg-a', version: '1.2.3-snapshot' },
        { name: '@scope/pkg-b', version: '4.5.6-snapshot' },
      ],
    });

    expect(execWithOutputMock).toHaveBeenCalledWith(
      'node',
      ['/cli/bin.js', 'publish', '--tag', 'feature-branch'],
      expect.objectContaining({
        cwd: '/repo',
        env: expect.objectContaining({
          CHANGESETS_OUTPUT: expect.stringMatching(
            /changesets-output\.ndjson$/,
          ),
        }),
      }),
    );
  });

  test('reads a git-tag event for a root package', async () => {
    mockWorkspace([pkgA], 'root');
    mockPublishOutput([
      {
        type: 'git-tag',
        tag: 'v1.2.3-snapshot',
        packageName: '@scope/pkg-a',
      },
    ]);

    await expect(
      runPublish({ script: publishScript, cwd: '/repo' }),
    ).resolves.toEqual({
      published: true,
      publishedPackages: [{ name: '@scope/pkg-a', version: '1.2.3-snapshot' }],
    });
  });

  test('returns unpublished when nothing was tagged', async () => {
    await expect(
      runPublish({ script: publishScript, cwd: '/repo' }),
    ).resolves.toEqual({ published: false });
  });

  test('runs the pre-publish script before publishing', async () => {
    coreMock.getInput.mockReturnValue('pnpm build');

    await runPublish({ script: publishScript, cwd: '/repo' });

    expect(execWithOutputMock.mock.calls[0]).toEqual(['pnpm build']);
    expect(execWithOutputMock.mock.calls[1]?.[0]).toBe('node');
  });

  test('throws when an output event refers to an unknown package', async () => {
    mockPublishOutput([
      {
        type: 'git-tag',
        tag: 'missing@1.0.0',
        packageName: 'missing',
      },
    ]);

    await expect(
      runPublish({ script: publishScript, cwd: '/repo' }),
    ).rejects.toThrow('Package "missing" not found.');
  });
});
