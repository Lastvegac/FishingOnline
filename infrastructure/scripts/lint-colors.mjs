import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const tokenFile = resolve(root, 'packages/ui/src/tokens.css');
const tokens = readFileSync(tokenFile, 'utf8');
const declared = new Set(
  [...tokens.matchAll(/(--color-[\w-]+)\s*:/g)].map((match) => match[1]),
);
const paletteTokens = new Set(
  [
    'brand-primary',
    'brand-primary-dark-1',
    'brand-primary-dark-2',
    'brand-primary-dark-3',
    'brand-primary-light-1',
    'brand-primary-light-2',
    'brand-primary-light-3',
    'text-primary',
    'drawer-scrim',
    ...['blue', 'cyan', 'green', 'orange', 'yellow'].flatMap((scale) =>
      [1, 2, 3, 4].map((step) => `${scale}-chart-${step}`),
    ),
    'cyan-chart-4-soft',
    'grey-1',
    ...Array.from({ length: 10 }, (_, index) => `neutral-${index}`),
    'neutral-white',
    'neutral-616568',
    'surface-light',
    'bg-default',
    'linear-end',
    'linear-color-end',
    'system-alert',
    'system-alert-border',
    'system-alert-soft',
    'system-error',
    'system-error-border',
    'system-error-hover',
    'system-error-soft',
    'color-error',
    'bg-error-light',
    'red',
    'system-info',
    'system-info-border',
    'system-info-bg',
    'text-info',
    'system-success',
    'system-success-border',
    'system-success-soft',
    'bg-success-light',
    'icon-success',
    'system-warning',
    'system-warning-border',
    'system-soft',
    'tag-warning-text',
    'tag-warning-bg',
    'tag-warning-border',
    'yellow',
    'outrageous-orange',
    'system-purple',
    'system-purple-soft',
    'system-cyan',
    'system-maintenance',
    'system-maintenance-soft',
    'system-liquidated',
    'system-liquidated-soft',
    'system-liquidated-border',
  ].map((name) => `--color-${name}`),
);

function files(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const absolute = resolve(path, entry.name);
    return entry.isDirectory()
      ? files(absolute)
      : /\.(?:css|tsx?|jsx?|svg|html)$/.test(entry.name)
        ? [absolute]
        : [];
  });
}
const targets = [
  'apps/web/src',
  'apps/admin/src',
  'packages/ui/src',
  'apps/web/public',
  'apps/admin/public',
].flatMap((path) => files(resolve(root, path)));
for (const path of ['apps/web/index.html', 'apps/admin/index.html'])
  if (existsSync(resolve(root, path))) targets.push(resolve(root, path));
const violations = [];
const rawColor =
  /#[\da-f]{3}(?:[\da-f]{1}|[\da-f]{3}(?:[\da-f]{2})?)?\b|\b0x[\da-f]{6,8}\b|\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\s*\(/gi;
const namedColor =
  /\b(?:color|background[\w-]*|border[\w-]*|outline[\w-]*|fill|stroke|stopColor|stop-color|box-shadow|text-shadow)["']?\s*[:=]\s*[^;\n{}]*\b(?:white|black|red|green|blue|yellow|orange|purple|pink|gray|grey|teal|gold|silver|brown|navy|lime|aqua|fuchsia|maroon|olive|rebeccapurple)\b/gi;
const lineAt = (source, index) => source.slice(0, index).split('\n').length;
function report(file, source, index, message) {
  violations.push(
    `${relative(root, file)}:${lineAt(source, index)} ${message}`,
  );
}
function uncomment(source) {
  return source.replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, (comment) =>
    comment.replace(/[^\n]/g, ' '),
  );
}
function isStaticPaletteCopy(file, source, value, index) {
  if (!/\.(?:html|svg)$/.test(file) || !value.startsWith('#')) return false;
  const start = source.lastIndexOf('\n', index) + 1;
  const end = source.indexOf('\n', index);
  const line = source.slice(start, end === -1 ? undefined : end);
  if (
    file.endsWith('.html') &&
    !/<meta\b[^>]*name=["']theme-color["']/.test(line)
  )
    return false;
  const nearby = source.slice(
    Math.max(0, source.lastIndexOf('\n', start - 2)),
    end === -1 ? undefined : end,
  );
  const tokenName = nearby.match(/<!--\s*(color-[\w-]+)\s*-->/)?.[1];
  if (!tokenName) return false;
  const tokenValue = tokens.match(
    new RegExp(`--${tokenName}\\s*:\\s*(#[\\da-f]+)\\s*;`, 'i'),
  )?.[1];
  return tokenValue?.toLowerCase() === value.toLowerCase();
}

for (const file of targets) {
  const source = readFileSync(file, 'utf8');
  const clean = uncomment(source);
  if (file !== tokenFile) {
    for (const match of clean.matchAll(rawColor))
      if (!isStaticPaletteCopy(file, source, match[0], match.index))
        report(
          file,
          source,
          match.index,
          `Raw color ${match[0]}: use a semantic var(--color-…) token.`,
        );
    const withoutVariables = clean.replace(/var\([^)]*\)/g, (variable) =>
      variable.replace(/[^\n]/g, ' '),
    );
    for (const match of withoutVariables.matchAll(namedColor))
      report(
        file,
        source,
        match.index,
        'Named color: use a semantic var(--color-…) token.',
      );
    for (const match of clean.matchAll(
      /\b(?:fillStyle|setFillStyle|setBackgroundColor)\(\s*\d+|\blineStyle\(\s*[^,]+,\s*\d+/g,
    ))
      report(
        file,
        source,
        match.index,
        'Canvas color must come from the shared CSS palette helper.',
      );
  } else {
    for (const match of clean.matchAll(
      /(--color-[\w-]+)\s*:\s*(#[\da-f]+)\s*;/gi,
    ))
      if (!paletteTokens.has(match[1]))
        report(
          file,
          source,
          match.index,
          'New semantic colors must alias the supplied palette, without new raw values.',
        );
  }
  for (const match of clean.matchAll(/var\((--color-[\w-]+)/g))
    if (!declared.has(match[1]))
      report(
        file,
        source,
        match.index,
        `Undefined design color token ${match[1]}.`,
      );
}
if (violations.length) {
  console.error(
    `Color token check failed (${violations.length}):\n${violations.join('\n')}`,
  );
  process.exitCode = 1;
} else
  console.log(
    `Color token check passed: ${targets.length} UI files; raw colors confined to the shared POSORA palette.`,
  );
