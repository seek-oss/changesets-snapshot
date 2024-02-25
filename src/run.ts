import * as core from '@actions/core';
import { type Package, getPackages } from '@manypkg/get-packages';

import { execWithOutput } from './utils';

type RunOptions = {
  script: string;
  cwd?: string;
};

type PublishedPackage = { name: string; version: string };

type PublishResult =
  | { published: true; publishedPackages: PublishedPackage[] }
  | { published: false };

export const run = async ({ script, cwd = process.cwd() }: RunOptions) => {
  const [runCommand, ...runArgs] = script.split(/\s+/);

  if (!runCommand) {
    throw new Error(`Error running script "${script}". No command found.`);
  }

  return execWithOutput(runCommand, runArgs, { cwd });
};

export const runPublish = async ({
  script,
  cwd = process.cwd(),
}: RunOptions): Promise<PublishResult> => {
  const prepublishScript = core.getInput('pre-publish');

  if (prepublishScript) {
    await execWithOutput(prepublishScript);
  }

  const changesetPublishOutput = await run({ script, cwd });

  const { packages, tool } = await getPackages(cwd);
  const releasedPackages: Package[] = [];

  if (tool !== 'root') {
    const newTagRegex = /New tag:\s+(@[^/]+\/[^@]+|[^/]+)@([^\s]+)/;
    const packagesByName = new Map(
      packages.map((x) => [x.packageJson.name, x]),
    );

    for (const line of changesetPublishOutput.stdout.split('\n')) {
      const match = line.match(newTagRegex);
      if (!match?.[1]) {
        continue;
      }

      const pkgName = match[1];

      const pkg = packagesByName.get(pkgName);
      if (pkg === undefined) {
        throw new Error(
          `Package "${pkgName}" not found.` +
            ' This is probably a bug in the action, please open an issue',
        );
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
    const newTagRegex = /New tag:/;

    for (const line of changesetPublishOutput.stdout.split('\n')) {
      const match = line.match(newTagRegex);

      if (match) {
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
