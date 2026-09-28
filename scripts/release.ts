// Based off https://github.com/changesets/action/blob/0138f456ec3d73906fcd11169ce59502d8d241c1/scripts/release.ts
// Rationale: https://github.com/changesets/action/pull/118

import path from 'node:path';

import { exec } from '@actions/exec';

import pkgJson from '../package.json' with { type: 'json' };

const tag = `v${pkgJson.version}`;
const releaseLine = `v${pkgJson.version.split('.')[0]}`;

process.chdir(path.join(import.meta.dirname, '..'));

await exec('git', ['checkout', '--detach']);
await exec('git', ['add', '--force', 'dist']);
await exec('git', ['commit', '-m', tag]);

await exec('changeset', ['git-tag']);

await exec('git', [
  'push',
  '--force',
  '--follow-tags',
  'origin',
  `HEAD:refs/heads/${releaseLine}`,
]);
