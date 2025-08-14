import * as core from '@actions/core';
import * as github from '@actions/github';
import { detect } from 'package-manager-detector/detect';
import resolveFrom from 'resolve-from';

import { logger } from './logger.js';
import { publishSnapshot } from './publish.js';
import { run, runPublish } from './run.js';

jest.mock('@actions/github');
jest.mock('@actions/core');
jest.mock('package-manager-detector/detect');
jest.mock('resolve-from');
jest.mock('./npm-utils');
jest.mock('./run');
jest.mock('./logger');

const runMock = jest.mocked(run);
const runPublishMock = jest.mocked(runPublish);
const coreMock = jest.mocked(core);
const detectMock = jest.mocked(detect);

const getScriptCalls = <T extends jest.MockableFunction>(
  mockedFn: jest.MockedFn<T>,
) => mockedFn.mock.calls.map((args) => args[0].script);
const expectSummary = () => {
  expect(coreMock.summary.addHeading.mock.calls).toMatchSnapshot('summary');
  expect(coreMock.summary.addRaw.mock.calls).toMatchSnapshot('summary');
  expect(coreMock.summary.addCodeBlock.mock.calls).toMatchSnapshot('summary');
  expect(coreMock.summary.write).toHaveBeenCalled();
};

beforeEach(() => {
  process.env.GITHUB_TOKEN = '';
  process.env.NPM_TOKEN = '';
});

afterEach(() => {
  jest.clearAllMocks();
});

const testCases = ['yarn', 'npm', 'pnpm'] as const;

test.each(testCases)('command output for %s', async (packageManager) => {
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
  detectMock.mockResolvedValueOnce({
    name: packageManager,
    agent: packageManager,
  });
  jest
    .mocked(resolveFrom)
    .mockImplementationOnce(
      (_fromDirectory, moduleId) => `/__mocked_node_modules__/${moduleId}`,
    );

  await publishSnapshot();

  expect(getScriptCalls(runMock)).toMatchSnapshot('run');
  expect(getScriptCalls(runPublishMock)).toMatchSnapshot('runPublish');
  expect(jest.mocked(logger).log.mock.calls[0]).toMatchSnapshot('logger.log');
  expectSummary();
});

describe('error handling', () => {
  test('missing NPM token', async () => {
    process.env.GITHUB_TOKEN = '@github-token';

    await expect(() => publishSnapshot()).rejects.toMatchInlineSnapshot(
      `[Error: Unable to retrieve NPM publish token]`,
    );

    expect(coreMock.setFailed.mock.calls[0]).toMatchInlineSnapshot(`
      [
        "Unable to retrieve NPM publish token",
      ]
    `);
  });

  test('missing GitHub token', async () => {
    process.env.NPM_TOKEN = '@npm-token';

    await expect(() => publishSnapshot()).rejects.toMatchInlineSnapshot(
      `[Error: Unable to retrieve GitHub token]`,
    );

    expect(coreMock.setFailed.mock.calls[0]).toMatchInlineSnapshot(`
      [
        "Unable to retrieve GitHub token",
      ]
    `);
  });

  test('no changesets found', async () => {
    process.env.GITHUB_TOKEN = '@github-token';
    process.env.NPM_TOKEN = '@npm-token';
    runMock.mockResolvedValueOnce({
      code: 0,
      stdout: '',
      stderr: '\nNo unreleased changesets found\n',
    });
    detectMock.mockResolvedValueOnce({ name: 'pnpm', agent: 'pnpm' });

    await publishSnapshot();

    expectSummary();
  });
});
