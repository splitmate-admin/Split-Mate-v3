import { build } from 'esbuild';
import { mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const directory = new URL('../work/tests/', import.meta.url);
await mkdir(directory, { recursive: true });
const tests = ['src/utils/money.test.ts', 'src/i18n/core.test.ts', 'api/fx.test.ts', 'src/utils/dateUtils.test.ts'];
const files = [];
try {
  for (let index = 0; index < tests.length; index++) {
    const outfile = new URL(`${index}.cjs`, directory);
    files.push(outfile);
    await build({ entryPoints: [tests[index]], outfile: fileURLToPath(outfile), bundle: true, platform: 'node', format: 'cjs', logLevel: 'warning' });
  }
  const result = spawnSync(process.execPath, ['--test', ...files.map(fileURLToPath)], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally {
  await Promise.all(files.map(file => rm(file, { force: true })));
}
