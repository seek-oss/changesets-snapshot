import { publishSnapshot } from './publish.js';

const { version: changesetsCliVersion } = (
  await import('@changesets/cli/package.json')
).default;

const supportedChangesetsCliMajorVersion = '3';
const supportedChangesetsCliInstalled = changesetsCliVersion.startsWith(
  supportedChangesetsCliMajorVersion,
);

if (!supportedChangesetsCliInstalled) {
  throw new Error(
    `Unsupported @changests/cli version '${changesetsCliVersion}' installed. This action requires @changesets/cli v${supportedChangesetsCliMajorVersion}.`,
  );
}

// eslint-disable-next-line no-void
void publishSnapshot();
