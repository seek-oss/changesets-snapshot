import * as core from '@actions/core';
import * as github from '@actions/github';
import { detect } from '@antfu/ni';

import { logger } from './logger';
import { run, runPublish } from './run';

import { publishSnapshot } from '.';

jest.mock('@actions/github');
jest.mock('@actions/core');
jest.mock('@antfu/ni', () => ({
  ...jest.requireActual('@antfu/ni'),
  detect: jest.fn().mockName('@antfu/ni.detect'),
}));
jest.mock('./npm-utils');
jest.mock('./run');
jest.mock('./logger');

const runMock = jest.mocked(run);
const runPublishMock = jest.mocked(runPublish);
const coreMock = jest.mocked(core, true);

const getScriptCalls = <T extends jest.MockableFunction>(
  mockedFn: jest.MockedFn<T>,
) => mockedFn.mock.calls.map((args) => args[0].script);

afterEach(() => {
  jest.clearAllMocks();
});

test.each(['yarn', 'npm', 'pnpm'])(
  'command output for %s',
  async (packageManager) => {
    process.env.GITHUB_TOKEN = '@github-token';
    process.env.NPM_TOKEN = '@npm-token';
    github.context.ref = 'feature/123-branch';
    runMock.mockResolvedValueOnce({
      code: 0,
      stdout: '',
      stderr: '',
    });
    runPublishMock.mockResolvedValueOnce({
      published: true,
      publishedPackages: [
        { name: '@multiple/package1', version: '1.2.3-SNAPSHOT' },
        { name: '@multiple/package-two', version: '1.2.3-SNAPSHOT' },
      ],
    });
    jest
      .mocked(detect)
      .mockResolvedValueOnce(
        packageManager as unknown as ReturnType<typeof detect>,
      );

    await publishSnapshot();

    expect(getScriptCalls(runMock)).toMatchSnapshot('run');
    expect(getScriptCalls(runPublishMock)).toMatchSnapshot('runPublish');
    expect(jest.mocked(logger).log.mock.calls[0]).toMatchSnapshot('logger.log');
    expect(coreMock.summary.addHeading.mock.calls[0][0]).toMatchSnapshot(
      'summary',
    );
    expect(coreMock.summary.addRaw.mock.calls[0][0]).toMatchSnapshot('summary');
    expect(coreMock.summary.addCodeBlock.mock.calls[0][0]).toMatchSnapshot(
      'summary',
    );
  },
);
