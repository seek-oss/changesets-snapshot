import * as core from '@actions/core';
import * as github from '@actions/github';
import { detect, getCommand } from '@antfu/ni';

import { logger } from './logger';
import { ensureNpmrc } from './npm-utils';
import { run, runPublish } from './run';
import { execWithOutput } from './utils';

async function writeSummary({
  title,
  message,
  codeBlock,
}: {
  title: string;
  message: string;
  codeBlock?: string;
}) {
  core.summary.addHeading(title, 3).addRaw(message);
  if (codeBlock) {
    core.summary.addCodeBlock(codeBlock);
  }
  await core.summary.write();
}

export const publishSnapshot = async () => {
  core.setOutput('published', false);
  core.setOutput('publishedPackages', []);

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
    script: `pnpm exec changeset version --snapshot ${cleansedBranchName}`,
  });

  if (versionResult.stderr.indexOf('No unreleased changesets found') > 0) {
    logger.log(
      '\nNo changesets found. In order to publish a snapshot version, you must have at least one changeset committed.\n',
    );

    await writeSummary({
      title: '⚠️ No snapshot published',
      message:
        'No changesets found, skipping publish. If you want to publish a snapshot version, you may need to add a changeset for the relevant package.',
    });

    return;
  }

  const result = await runPublish({
    script: `pnpm exec changeset publish --tag ${cleansedBranchName}`,
  });

  core.setOutput('published', result.published);

  if (result.published) {
    core.setOutput('publishedPackages', result.publishedPackages);

    const pkgNoun =
      result.publishedPackages.length === 1 ? 'snapshot' : 'snapshots';

    for (const { name, version } of result.publishedPackages) {
      await writeSummary({
        title: `🦋 New ${pkgNoun} published!`,
        message: `Version: <code>${name}@${version}</code>`,
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

// eslint-disable-next-line no-void
void publishSnapshot();
