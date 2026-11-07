import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const manifest = JSON.parse(
  await readFile(new URL('./package.json', import.meta.url), 'utf8'),
);
const external = Object.keys(manifest.dependencies)
  .filter((name) => !name.startsWith('@fwo/'))
  .flatMap((name) => [name, `${name}/*`]);
await build({
  entryPoints: ['src/server.ts'],
  outfile: 'dist/server.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  external,
  sourcemap: true,
});
