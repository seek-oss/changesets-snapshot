import fs from 'node:fs/promises';
import path from 'node:path';

import { type Package, getPackages } from '@manypkg/get-packages';

const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

const WORKSPACE_STAR = 'workspace:*';
const ROLLING_WORKSPACE_SPECIFIER = /^workspace:[~^]$/;

type DependencyMap = Record<string, string>;

type PackageJson = {
  name?: string;
  version?: string;
} & Partial<Record<(typeof DEPENDENCY_FIELDS)[number], DependencyMap>>;

const versionsFromPackages = (packages: Package[]): Map<string, string> =>
  new Map(
    packages.flatMap((pkg) => {
      const { name, version } = pkg.packageJson;

      return name && version ? [[name, version] as const] : [];
    }),
  );

export const readWorkspacePackageVersions = async (
  cwd: string,
): Promise<Map<string, string>> => {
  const { packages } = await getPackages(cwd);

  return versionsFromPackages(packages);
};

export const findChangedPackageNames = (
  versionsBeforeSnapshot: ReadonlyMap<string, string>,
  versionsAfterSnapshot: ReadonlyMap<string, string>,
): Set<string> => {
  const changedPackageNames = new Set<string>();

  for (const [name, version] of versionsAfterSnapshot) {
    if (versionsBeforeSnapshot.get(name) !== version) {
      changedPackageNames.add(name);
    }
  }

  return changedPackageNames;
};

export const rewriteWorkspaceRanges = (
  packageJson: PackageJson,
  changedPackageNames: ReadonlySet<string>,
): boolean => {
  let changed = false;

  for (const field of DEPENDENCY_FIELDS) {
    const deps = packageJson[field];

    if (!deps) {
      continue;
    }

    for (const [name, specifier] of Object.entries(deps)) {
      if (
        ROLLING_WORKSPACE_SPECIFIER.test(specifier) &&
        changedPackageNames.has(name)
      ) {
        deps[name] = WORKSPACE_STAR;
        changed = true;
      }
    }
  }

  return changed;
};

export const pinChangedWorkspaceRanges = async (
  cwd: string,
  versionsBeforeSnapshot: ReadonlyMap<string, string>,
): Promise<void> => {
  const { packages } = await getPackages(cwd);
  const changedPackageNames = findChangedPackageNames(
    versionsBeforeSnapshot,
    versionsFromPackages(packages),
  );

  if (changedPackageNames.size === 0) {
    return;
  }

  await Promise.all(
    packages.map(async (pkg) => {
      const packageJsonPath = path.join(pkg.dir, 'package.json');
      const raw = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(raw) as PackageJson;

      if (!rewriteWorkspaceRanges(packageJson, changedPackageNames)) {
        return;
      }

      await fs.writeFile(
        packageJsonPath,
        `${JSON.stringify(packageJson, null, 2)}`,
      );
    }),
  );
};
