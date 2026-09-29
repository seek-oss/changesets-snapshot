import { describe, expect, test } from 'vitest';

import {
  findChangedPackageNames,
  rewriteWorkspaceRanges,
} from './workspace-protocol.js';

describe('findChangedPackageNames', () => {
  test('returns packages whose version changed', () => {
    const changed = findChangedPackageNames(
      new Map([
        ['@scope/changed', '1.0.0'],
        ['@scope/unchanged', '2.0.0'],
      ]),
      new Map([
        ['@scope/changed', '1.0.1-branch-20240101'],
        ['@scope/unchanged', '2.0.0'],
      ]),
    );

    expect([...changed]).toEqual(['@scope/changed']);
  });

  test('treats packages that appear after versioning as changed', () => {
    const changed = findChangedPackageNames(
      new Map([['@scope/existing', '1.0.0']]),
      new Map([
        ['@scope/existing', '1.0.0'],
        ['@scope/new', '0.0.0-branch-20240101'],
      ]),
    );

    expect([...changed]).toEqual(['@scope/new']);
  });
});

describe('rewriteWorkspaceRanges', () => {
  test('rewrites rolling workspace ranges only for changed packages', () => {
    const packageJson = {
      dependencies: {
        '@scope/changed': 'workspace:^',
        '@scope/changed-tilde': 'workspace:~',
        '@scope/unchanged': 'workspace:^',
        '@scope/unchanged-tilde': 'workspace:~',
        external: '^1.0.0',
      },
      devDependencies: {
        '@scope/changed': 'workspace:~',
      },
      peerDependencies: {
        '@scope/unchanged': 'workspace:~',
      },
    };

    const changed = rewriteWorkspaceRanges(
      packageJson,
      new Set(['@scope/changed', '@scope/changed-tilde']),
    );

    expect(changed).toBe(true);
    expect(packageJson).toEqual({
      dependencies: {
        '@scope/changed': 'workspace:*',
        '@scope/changed-tilde': 'workspace:*',
        '@scope/unchanged': 'workspace:^',
        '@scope/unchanged-tilde': 'workspace:~',
        external: '^1.0.0',
      },
      devDependencies: {
        '@scope/changed': 'workspace:*',
      },
      peerDependencies: {
        '@scope/unchanged': 'workspace:~',
      },
    });
  });

  test('leaves workspace:* and versioned workspace specs alone', () => {
    const packageJson = {
      dependencies: {
        '@scope/changed': 'workspace:*',
        '@scope/caret-range': 'workspace:^1.2.3',
        '@scope/tilde-range': 'workspace:~1.2.3',
      },
    };

    const changed = rewriteWorkspaceRanges(
      packageJson,
      new Set(['@scope/changed', '@scope/caret-range', '@scope/tilde-range']),
    );

    expect(changed).toBe(false);
    expect(packageJson.dependencies).toEqual({
      '@scope/changed': 'workspace:*',
      '@scope/caret-range': 'workspace:^1.2.3',
      '@scope/tilde-range': 'workspace:~1.2.3',
    });
  });

  test('returns false when nothing matches', () => {
    const packageJson = {
      dependencies: {
        '@scope/unchanged': 'workspace:~',
      },
    };

    expect(
      rewriteWorkspaceRanges(packageJson, new Set(['@scope/changed'])),
    ).toBe(false);
    expect(packageJson.dependencies?.['@scope/unchanged']).toBe('workspace:~');
  });
});
