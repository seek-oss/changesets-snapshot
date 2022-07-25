// Taken from https://github.com/changesets/action/blob/main/scripts/release.js
// Rationale: https://github.com/changesets/action/pull/118

/* eslint-disable no-console */
import path from 'path';
import { fileURLToPath } from 'url';

import { exec, getExecOutput } from '@actions/exec';

import pkg from '../package.json' assert { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const releaseLine = `v${pkg.version.split('.')[0]}`;
const tag = `v${pkg.version}`;

process.chdir(path.join(__dirname, '..'));

const { exitCode, stderr } = await getExecOutput(
  'git',
  ['ls-remote', '--exit-code', 'origin', '--tags', `refs/tags/${tag}`],
  {
    ignoreReturnCode: true,
  },
);
if (exitCode === 0) {
  console.log(
    `Action is not being published because version ${tag} is already published`,
  );
  process.exit(exitCode); // eslint-disable-line no-process-exit
}
if (exitCode !== 2) {
  throw new Error(`git ls-remote exited with ${exitCode}:\n${stderr}`);
}

await exec('git', ['checkout', '--detach']);
await exec('git', ['add', '--force', 'dist']);
await exec('git', ['commit', '-m', tag]);

await exec('changeset', ['tag']);

await exec('git', [
  'push',
  '--force',
  '--follow-tags',
  'origin',
  `HEAD:refs/heads/${releaseLine}`,
]);
