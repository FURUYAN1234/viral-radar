import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const quote = value => `'${value.replaceAll("'", "''")}'`;
function run(script, cwd = root) {
  return spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `. ${quote(resolve(root, 'scripts/start-local.ps1'))}; ${script}`], { cwd, encoding: 'utf8', timeout: 15000 });
}
const windows = { skip: process.platform !== 'win32' };

test('bootstrap checks archive integrity before installation and rejects an invalid hash', windows, () => {
  const dir = mkdtempSync(join(tmpdir(), 'buzz-bootstrap-'));
  try {
    const archive = join(dir, 'fixture.zip');
    writeFileSync(archive, 'download fixture');
    const sha = createHash('sha256').update('download fixture').digest('hex');
    const valid = run(`Assert-ArchiveHash ${quote(archive)} ${quote(sha)}`);
    assert.equal(valid.status, 0, valid.stderr);
    const invalid = run(`Assert-ArchiveHash ${quote(archive)} ${quote('0'.repeat(64))}`);
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /download verification failed/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('bootstrap rejects incomplete extraction and cleanup outside its runtime directory', windows, () => {
  const dir = mkdtempSync(join(tmpdir(), 'buzz-bootstrap-'));
  try {
    const incomplete = run(`Start-Monogatari ${quote(dir)} $false`);
    assert.notEqual(incomplete.status, 0);
    assert.match(incomplete.stderr, /Extract the entire ZIP/);
    const outside = run(`Assert-RuntimeChild ${quote(join(dir, '..', 'outside'))} ${quote(dir)}`);
    assert.notEqual(outside.status, 0);
    assert.match(outside.stderr, /Unsafe runtime cleanup path/);
    assert.equal(run(`Assert-RuntimeChild ${quote(join(dir, 'child'))} ${quote(dir)}`).status, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a leftover setup marker does not hide broken dependencies or a changed lockfile', windows, () => {
  const dir = mkdtempSync(join(tmpdir(), 'buzz-bootstrap-'));
  try {
    mkdirSync(join(dir, 'node_modules'));
    writeFileSync(join(dir, 'node_modules/.monogatari-install'), 'fixture');
    const check = run(`if (Test-Dependencies ${quote(dir)} ${quote(process.execPath)} 'fixture') { throw 'Broken dependency accepted' }; if (Test-Dependencies ${quote(dir)} ${quote(process.execPath)} 'changed') { throw 'Changed lockfile accepted' }`, dir);
    assert.equal(check.status, 0, check.stderr);
    const fingerprint = run(`Get-DependencyFingerprint ${quote(root)} ${quote(process.execPath)}`);
    assert.equal(fingerprint.status, 0, fingerprint.stderr);
    assert.match(fingerprint.stdout, /[A-F0-9]{64}\/v\d+\.\d+\.\d+\/(x64|arm64)/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
