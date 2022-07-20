import * as core from '@actions/core';
import * as github from '@actions/github';
import { detect, getCommand } from '@antfu/ni';

import { logger } from './logger';
import { ensureNpmrc } from './npm-utils';
import { run, runPublish } from './run';
import { execWithOutput } from './utils';

function annotate({
  title,
  message,
  codeBlock,
}: {
  title: string;
  message: string;
  codeBlock?: string;
}) {
  core.summary.addHeading(title, 3);
  core.summary.addRaw(message);
  if (codeBlock) {
    core.summary.addCodeBlock(codeBlock);
  }
}

export const publishSnapshot = async () => {
  const githubToken = process.env.GITHUB_TOKEN;

  if (!githubToken) {
    core.setFailed('Unable to retrieve GitHub token');
    return;
  }

  const npmToken = process.env.NPM_TOKEN;

  if (!npmToken) {
    core.setFailed('Unable to retrieve NPM publish token');
    throw new Error();
  }

  ensureNpmrc(npmToken);

  const branch = github.context.ref.replace('refs/heads/', '');
  const cleansedBranchName = branch.replace(/\//g, '_');

  const preVersionScript = core.getInput('pre-version');

  if (preVersionScript) {
    await execWithOutput(preVersionScript);
  }

  const packageManager = await detect({ cwd: process.cwd() });

  if (!packageManager) {
    core.setFailed('Unable to detect package manager');
    throw new Error();
  }

  // Run the snapshot version
  const versionResult = await run({
    script: getCommand(packageManager, 'agent', [`changeset version --snapshot ${cleansedBranchName}`])
  });

  if (versionResult.stderr.indexOf('No unreleased changesets found') > 0) {
    logger.log(
      '\nNo changesets found. In order to publish a snapshot version, you must have at least one changeset committed.\n',
    );

    annotate({
      title: '⚠️ No snapshot published',
      message:
        'No changesets found, skipping publish. If you want to publish a snapshot version, you may need to add a changeset for the relevant package.',
    });

    return;
  }

  const result = await runPublish({
    script: getCommand(packageManager, 'execute', [
      `changeset publish --tag ${cleansedBranchName}`,
    ]),
  });

  if (result.published) {
    const pkgNoun =
      result.publishedPackages.length === 1 ? 'snapshot' : 'snapshots';

    for (const { name, version } of result.publishedPackages) {
      annotate({
        title: `🦋 New ${pkgNoun} published!`,
        message: `Version: \`${name}@${version}\``,
        codeBlock: getCommand(packageManager, 'add', [
          `${name}@${cleansedBranchName}`,
        ]),
      });
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

  // TODO: clean up .npmrc
};
