import { writeFile } from 'node:fs/promises';

import { describe, expect, test } from 'vitest';

import {
  initChangesetsOutput,
  readChangesetsOutput,
} from './changesets-output.js';

describe('initChangesetsOutput', () => {
  test('returns a unique ndjson path in a temp directory', async () => {
    const [first, second] = await Promise.all([
      initChangesetsOutput(),
      initChangesetsOutput(),
    ]);

    expect(first).toMatch(/changesets-snapshot-.*\/changesets-output\.ndjson$/);
    expect(second).toMatch(
      /changesets-snapshot-.*\/changesets-output\.ndjson$/,
    );
    expect(first).not.toBe(second);
  });
});

describe('readChangesetsOutput', () => {
  test('parses git-tag events from NDJSON', async () => {
    const file = await initChangesetsOutput();
    await writeFile(
      file,
      `
{"type":"git-tag","tag":"@scope/pkg-a@1.2.3","packageName":"@scope/pkg-a"}
{"type":"git-tag","tag":"@scope/pkg-b@4.5.6","packageName":"@scope/pkg-b"}
`,
    );

    await expect(readChangesetsOutput(file)).resolves.toEqual([
      {
        type: 'git-tag',
        tag: '@scope/pkg-a@1.2.3',
        packageName: '@scope/pkg-a',
      },
      {
        type: 'git-tag',
        tag: '@scope/pkg-b@4.5.6',
        packageName: '@scope/pkg-b',
      },
    ]);
  });

  test('throws when the file does not exist', async () => {
    await expect(
      readChangesetsOutput('/tmp/does-not-exist-changesets-output.ndjson'),
    ).rejects.toThrow('This action requires @changesets/cli v3.');
  });

  test('returns an empty list for an empty file', async () => {
    const file = await initChangesetsOutput();
    await writeFile(file, '');

    await expect(readChangesetsOutput(file)).resolves.toEqual([]);
  });

  test('throws when a line is not JSON', async () => {
    const file = await initChangesetsOutput();
    await writeFile(file, 'not-json\n');

    await expect(readChangesetsOutput(file)).rejects.toThrow(SyntaxError);
  });
});
