import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// From https://github.com/changesets/changesets/blob/@changesets/cli@3.0.0/packages/cli/src/utils/output.ts
export type OutputEvent = {
  type: 'git-tag';
  tag: string;
  packageName: string;
};

export const initChangesetsOutput = async (): Promise<string> => {
  const changesetsOutputFile = join(
    await mkdtemp(join(tmpdir(), 'changesets-snapshot-')),
    'changesets-output.ndjson',
  );

  return changesetsOutputFile;
};

export const readChangesetsOutput = async (
  changesetsOutputFile: string,
): Promise<OutputEvent[]> => {
  let rawOutput: string;
  try {
    rawOutput = await readFile(changesetsOutputFile, 'utf-8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(
        `Failed to read changesets output at ${changesetsOutputFile}. This action requires @changesets/cli v3.`,
        { cause: error },
      );
    }

    throw error;
  }

  return rawOutput
    .trim()
    .split('\n')
    .filter((json) => json.length !== 0)
    .map((json) => JSON.parse(json) as OutputEvent);
};
