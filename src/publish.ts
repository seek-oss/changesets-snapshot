import * as core from '@actions/core';
import * as github from '@actions/github';
import { detect, getCommand } from '@antfu/ni';
import resolveFrom from 'resolve-from';

import { logger } from './logger';
import { ensureNpmrc, removeNpmrc } from './npm-utils';
import { run, runPublish } from './run';

const writeSummary = async ({
  title,
  message,
  codeBlock,
}: {
  title: string;
  message: string;
  codeBlock?: string;
}) => {
  core.summary.addHeading(title, 3);
  core.summary.addRaw(`<p>${message}</p>`, true);
  if (codeBlock) {
    core.summary.addCodeBlock(codeBlock);
  }
  await core.summary.write();
};

const failure = (reason: string) => {
  core.setFailed(reason);
  throw new Error(reason);
};

export const publishSnapshot = async () => {
  core.setOutput('published', false);
  core.setOutput('publishedPackages', []);

  const cwd = process.cwd();

  process.env.GITHUB_TOKEN = '';

  const npmToken = process.env.NPM_TOKEN;
  if (!npmToken) {
    throw failure('Unable to retrieve NPM publish token');
  }

  const packageManager = await detect({ cwd });
  if (!packageManager) {
    throw failure('Unable to detect package manager');
  }

  const preVersionScript = core.getInput('pre-version');
  if (preVersionScript) {
    await run({ script: preVersionScript, cwd });
  }

  ensureNpmrc(npmToken);

  const branch = github.context.ref.replace('refs/heads/', '');
  const cleansedBranchName = branch.replace(/\//g, '_');
  const changesetsCli = resolveFrom(cwd, '@changesets/cli/bin.js');

  // Run the snapshot version
  const versionResult = await run({
    script: `node ${changesetsCli} version --snapshot ${cleansedBranchName}`,
    cwd,
  });

  if (versionResult.stderr.includes('No unreleased changesets found')) {
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
    script: `node ${changesetsCli} publish --tag ${cleansedBranchName}`,
    cwd,
  });

  core.setOutput('published', result.published);

  if (result.published) {
    core.setOutput('publishedPackages', result.publishedPackages);

    const pkgNoun =
      result.publishedPackages.length === 1 ? 'snapshot' : 'snapshots';

    for (const { name, version } of result.publishedPackages) {
      await writeSummary({
        title: '🦋 New snapshot published!',
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

  removeNpmrc();
};
