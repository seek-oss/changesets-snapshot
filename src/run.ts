import * as core from '@actions/core';
import { type Package, getPackages } from '@manypkg/get-packages';

import {
  initChangesetsOutput,
  readChangesetsOutput,
} from './changesets-output.js';
import { type CommandOptions, execWithOutput } from './utils.js';

type RunOptions = {
  script: string;
} & CommandOptions;

type PublishedPackage = { name: string; version: string };

type PublishResult =
  | { published: true; publishedPackages: PublishedPackage[] }
  | { published: false };

export const run = async ({
  script,
  cwd = process.cwd(),
  env,
  ignoreReturnCode,
}: RunOptions) => {
  const [runCommand, ...runArgs] = script.split(/\s+/);

  if (!runCommand) {
    throw new Error(`Error running script "${script}". No command found.`);
  }

  return execWithOutput(runCommand, runArgs, { cwd, env, ignoreReturnCode });
};

const packageNotFoundError = (pkgName: string) =>
  new Error(
    `Package "${pkgName}" not found.` +
      ' This is probably a bug in the action, please open an issue',
  );

export const runPublish = async ({
  script,
  cwd = process.cwd(),
}: RunOptions): Promise<PublishResult> => {
  const prepublishScript = core.getInput('pre-publish');

  if (prepublishScript) {
    await execWithOutput(prepublishScript);
  }

  const changesetsOutputFile = await initChangesetsOutput();

  await run({
    script,
    cwd,
    env: { ...process.env, CHANGESETS_OUTPUT: changesetsOutputFile },
  });

  const changesetsOutput = await readChangesetsOutput(changesetsOutputFile);
  const { packages, tool } = await getPackages(cwd);
  const releasedPackages: Package[] = [];

  if (tool.type !== 'root') {
    const packagesByName = new Map(
      packages.map((pkg) => [pkg.packageJson.name, pkg]),
    );

    for (const outputEvent of changesetsOutput) {
      if (outputEvent.type !== 'git-tag') {
        continue;
      }

      const pkgName = outputEvent.packageName;
      const pkg = packagesByName.get(pkgName);
      if (pkg === undefined) {
        throw packageNotFoundError(pkgName);
      }

      releasedPackages.push(pkg);
    }
  } else {
    if (packages.length === 0 || !packages[0]) {
      throw new Error(
        'No package found.' +
          ' This is probably a bug in the action, please open an issue',
      );
    }
    const pkg = packages[0];

    for (const outputEvent of changesetsOutput) {
      if (outputEvent.type === 'git-tag') {
        releasedPackages.push(pkg);
        break;
      }
    }
  }

  if (releasedPackages.length) {
    return {
      published: true,
      publishedPackages: releasedPackages.map((pkg) => ({
        name: pkg.packageJson.name,
        version: pkg.packageJson.version,
      })),
    };
  }

  return { published: false };
};
