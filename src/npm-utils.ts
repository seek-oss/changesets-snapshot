/* eslint-disable no-sync */
import fs from 'fs';

import { logger } from './logger';

export const ensureNpmrc = (npmToken: string) => {
  const userNpmrcPath = './.npmrc';

  if (fs.existsSync(userNpmrcPath)) {
    logger.log('Found existing user .npmrc file. Overwriting.');
  } else {
    logger.log('No user .npmrc file found, creating one');
  }

  fs.writeFileSync(
    userNpmrcPath,
    `//registry.npmjs.org/:_authToken=${npmToken}\n`,
  );

  logger.log(`.npmrc file written to ${userNpmrcPath}\n`);
};
