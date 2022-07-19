import * as core from '@actions/core';
import { exec } from '@actions/exec';
import * as github from '@actions/github';

import { logger } from './logger';
import { runPublish } from './run';
import { execWithOutput } from './utils';

export const publishSnapshot = async () => {
  const githubToken = process.env.GITHUB_TOKEN;

  if (!githubToken) {
    core.setFailed('Unable to retrieve GitHub token');
    return;
  }

  const branch = github.context.ref.replace('refs/heads/', '');
  const cleansedBranchName = branch.replace(/\//g, '_');

  const preVersionScript = core.getInput('pre-version');

  if (preVersionScript) {
    await execWithOutput(preVersionScript);
  }

  // Run the snapshot version
  const versionResult = await execWithOutput('yarn', [
    'changeset',
    'version',
    '--snapshot',
    cleansedBranchName,
  ]);

  if (versionResult.stderr.indexOf('No unreleased changesets found') > 0) {
    logger.log(
      '\nNo changesets found. In order to publish a snapshot version, you must have at least one changeset committed.\n',
    );

    await exec('buildkite-agent', [
      'annotate',
      '--style',
      'warning',
      'No changesets found, skipping publish. If you want to publish a snapshot version, you may need to add a changeset for the relevant package.',
    ]);

    return;
  }

  const result = await runPublish({
    script: `yarn changeset publish --tag ${cleansedBranchName}`,
  });

  if (result.published) {
    const pkgNoun =
      result.publishedPackages.length === 1 ? 'snapshot' : 'snapshots';

    for (const { name, version } of result.publishedPackages) {
      const codeblock = [
        '```',
        `yarn add ${name}@${cleansedBranchName}`,
        '```',
      ].join('\n');

      await exec('buildkite-agent', [
        'annotate',
        '--style',
        'info',
        `Snapshot published: \`${name}@${version}\`\n${codeblock}`,
      ]);
    }

    const newVersionsList = result.publishedPackages
      .map(({ name, version }) => `- ${name}@${version}`)
      .join('\n');

    logger.log(
      `
  ${result.publishedPackages.length} ${pkgNoun} published.
  ${newVersionsList}
`.trim(),
    );
  }
};
