import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_TARGET_DIR = 'C:\\viral-radar-main';

const APP_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const EXCLUDED_TOP_LEVEL_DIRS = new Set([
  '.claude',
  '.git',
  'dist',
  'node_modules',
  'output',
  'scratch',
]);
const EXCLUDED_FILE_NAMES = new Set(['HANDOFF.md']);

function toPosixPath(filePath) {
  return String(filePath || '').replaceAll('\\', '/');
}

export function shouldCopyTrackedPath(relativePath) {
  const normalized = toPosixPath(relativePath).replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) return false;

  const parts = normalized.split('/').filter(Boolean);
  if (!parts.length) return false;
  if (EXCLUDED_TOP_LEVEL_DIRS.has(parts[0])) return false;

  const fileName = parts.at(-1);
  if (EXCLUDED_FILE_NAMES.has(fileName)) return false;
  if (fileName === '.env' || fileName?.startsWith('.env.')) return false;

  return true;
}

export function isSafeTargetDir(targetDir) {
  const resolved = resolve(targetDir).replace(/[\\/]+$/, '').toLowerCase();
  return resolved === 'c:\\viral-radar-main';
}

export function buildCopyPlan({ rootDir = APP_ROOT, targetDir = DEFAULT_TARGET_DIR, trackedFiles = [] } = {}) {
  const sourceRoot = resolve(rootDir);
  const destinationRoot = resolve(targetDir);

  return trackedFiles
    .filter(shouldCopyTrackedPath)
    .map((relativePath) => {
      const normalized = toPosixPath(relativePath);
      return {
        relativePath: normalized,
        source: resolve(sourceRoot, ...normalized.split('/')),
        destination: resolve(destinationRoot, ...normalized.split('/')),
      };
    });
}

function listTrackedFiles(rootDir) {
  const output = execFileSync('git', ['-C', rootDir, 'ls-files', '-z'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return output.split('\0').filter(Boolean);
}

function currentGitHead(rootDir) {
  try {
    return execFileSync('git', ['-C', rootDir, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

export function copyReleaseToCDrive({
  rootDir = APP_ROOT,
  targetDir = DEFAULT_TARGET_DIR,
  trackedFiles = listTrackedFiles(rootDir),
} = {}) {
  if (!isSafeTargetDir(targetDir)) {
    throw new Error(`Unsafe C drive copy target: ${targetDir}`);
  }

  const targetRoot = resolve(targetDir);
  const plan = buildCopyPlan({ rootDir, targetDir: targetRoot, trackedFiles });

  if (existsSync(targetRoot)) {
    rmSync(targetRoot, { recursive: true, force: true });
  }
  mkdirSync(targetRoot, { recursive: true });

  for (const entry of plan) {
    if (!existsSync(entry.source)) continue;
    mkdirSync(dirname(entry.destination), { recursive: true });
    cpSync(entry.source, entry.destination, { preserveTimestamps: true });
  }

  const packageJson = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'));
  const manifest = {
    app: packageJson.name,
    version: packageJson.version,
    copiedAt: new Date().toISOString(),
    sourceRoot: resolve(rootDir),
    gitHead: currentGitHead(rootDir),
    targetRoot,
    copiedFileCount: plan.length,
    excluded: {
      topLevelDirs: Array.from(EXCLUDED_TOP_LEVEL_DIRS).sort(),
      fileNames: Array.from(EXCLUDED_FILE_NAMES).sort(),
      envFiles: '.env and .env.*',
    },
  };

  writeFileSync(
    resolve(targetRoot, 'COPY_MANIFEST.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = copyReleaseToCDrive();
  console.log(`[C Drive Copy] ${manifest.app} ${manifest.version}`);
  console.log(`[C Drive Copy] Target: ${manifest.targetRoot}`);
  console.log(`[C Drive Copy] Files: ${manifest.copiedFileCount}`);
}
