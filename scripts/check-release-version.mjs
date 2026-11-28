import { readFileSync } from 'node:fs';

function read(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

const { version } = JSON.parse(read('../package.json'));
if (!/^[1-9]\d*\.\d\.\d$/.test(version)) {
  throw new Error('Release version must use single-digit minor and patch components: ' + version);
}

const lock = JSON.parse(read('../package-lock.json'));
const manual = JSON.parse(read('../docs/manuals/manual_content.json'));
if (lock.version !== version || lock.packages[''].version !== version || manual.version !== version) {
  throw new Error('The package lock and manual source must match package.json version ' + version);
}

const versionedFiles = [
  ['../index.html', '<title>物語バズメーカー v' + version + '</title>'],
  ['../src/main.js', "const APP_VERSION = '" + version + "';"],
  ['../README.md', 'docs/releases/v' + version + '.md'],
  ['../README.md', 'badge/version-' + version + '-'],
  ['../public/downloads/viral-radar-mcp-guide.html', '<h1>物語バズメーカー v' + version + 'のMCP導入</h1>'],
  ['../docs/releases/v' + version + '.md', '物語バズメーカー v' + version],
];

for (const [path, expected] of versionedFiles) {
  if (!read(path).includes(expected)) {
    throw new Error(path + ' does not match the release version ' + version);
  }
}

console.log('Release version verified: ' + version);
