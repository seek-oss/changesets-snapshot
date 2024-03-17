// Taken from https://github.com/changesets/action/blob/main/scripts/release.js
// Rationale: https://github.com/changesets/action/pull/118

/* eslint-disable no-console */
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { exec, getExecOutput } from '@actions/exec';

// Would ideally import `package.json` with an import attribute, but ESLint only supports it
// experimentally and I can't even find how to enable support for it
const packageJson = JSON.parse(await readFile('../package.json', 'utf-8'));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const releaseLine = `v${packageJson.version.split('.')[0]}`;
const tag = `v${packageJson.version}`;

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
