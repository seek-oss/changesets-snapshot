import * as core from '@actions/core';
import * as github from '@actions/github';
import { resolveCommand } from 'package-manager-detector/commands';
import { detect } from 'package-manager-detector/detect';
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
  return new Error(reason);
};

export const publishSnapshot = async () => {
  core.setOutput('published', false);
  core.setOutput('publishedPackages', []);

  const cwd = process.cwd();

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    throw failure('Unable to retrieve GitHub token');
  }

  const npmToken = process.env.NPM_TOKEN;
  if (!npmToken) {
    throw failure('Unable to retrieve NPM publish token');
  }

  const detectResult = await detect({ cwd });
  if (!detectResult) {
    throw failure('Unable to detect package manager');
  }

  const { name: packageManager } = detectResult;

  const preVersionScript = core.getInput('pre-version');
  if (preVersionScript) {
    await run({ script: preVersionScript, cwd });
  }

  ensureNpmrc(npmToken);

  const branch = github.context.ref.replace('refs/heads/', '');
  const cleansedBranchName = branch.replace(/\//g, '-');
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
      const resolvedCommand = resolveCommand(packageManager, 'add', [
        `${name}@${cleansedBranchName}`,
      ]);

      if (!resolvedCommand) {
        throw new Error('Failed to resolve command');
      }

      const { command, args } = resolvedCommand;

      await writeSummary({
        title: '🦋 New snapshot published!',
        message: `Version: <code>${name}@${version}</code>`,
        codeBlock: `${command} ${args.join(' ')}`,
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
