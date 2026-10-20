import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// No connection string is accepted. Only a private Unix socket is exposed.
export async function withDisposablePostgres(task) {
  const directory = mkdtempSync(join(tmpdir(), 'ace-v2-template-'));
  const dataDir = join(directory, 'data');
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('PG')));
  Object.assign(env, { PGHOST: directory, PGPORT: '55440', PGUSER: 'ace_template_test', PGDATABASE: 'postgres' });
  const run = (command, args) => spawnSync(command, args, { env, encoding: 'utf8', timeout: 30000 });
  const checked = (command, args) => {
    const result = run(command, args);
    assert.equal(result.status, 0, result.error?.message ?? result.stderr);
    return result.stdout.trim();
  };
  const args = (sql) => ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', sql];
  const query = (sql) => checked('psql', args(sql));
  const rejects = (sql, pattern) => {
    const result = run('psql', args(sql));
    assert.notEqual(result.status, 0, 'SQL unexpectedly succeeded');
    assert.match(result.stderr, pattern);
  };
  const concurrentQuery = (sql) => new Promise((resolve, reject) => {
    const child = spawn('psql', args(sql), { env, timeout: 30000 });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr)));
  });
  const apply = (name) => checked('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-f',
    fileURLToPath(new URL(`../../supabase/migrations/${name}`, import.meta.url))]);
  try {
    checked('initdb', ['-D', dataDir, '-U', env.PGUSER, '-A', 'trust', '--no-locale', '--encoding=UTF8', '--no-sync']);
    checked('pg_ctl', ['-D', dataDir, '-l', join(directory, 'postgres.log'), '-o', `-h '' -k '${directory}' -p 55440 -F -c unix_socket_permissions=0700`, '-w', 'start']);
    await task({ query, rejects, concurrentQuery, apply });
  } finally {
    if (existsSync(join(dataDir, 'postmaster.pid'))) checked('pg_ctl', ['-D', dataDir, '-m', 'immediate', '-w', 'stop']);
    rmSync(directory, { recursive: true, force: true });
  }
}
