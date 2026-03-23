import { defineConfig } from 'tsdown';

export default defineConfig({
  failOnWarn: true,
  entry: ['src/index.ts'],
  format: 'esm',
  target: 'node24',
  outDir: 'lib',
  dts: false,
  checks: {
    legacyCjs: false,
  },
  exports: { devExports: '@seek/changesets-snapshot/source' },
});
