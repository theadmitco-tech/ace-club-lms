import { readFileSync, statSync } from 'node:fs';

export const PROJECT = 'eyphkkginlgoaxflauog';
export const ORIGIN = `https://${PROJECT}.supabase.co`;
export const PREVIEW = 'https://ace-club-97csnfzm5-theadmitco-techs-projects.vercel.app';
export const COMMIT = '155b3fbffc46db94be0fbee70b7b6fd9465a74b4';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const literal = value => `'${String(value).replaceAll("'", "''")}'`;
export function check(condition, message) { if (!condition) throw new Error(message); }
export function validateConfig(config, { database = true } = {}) {
  check(config.SUPABASE_URL === ORIGIN, 'Only the designated staging Supabase origin is accepted.');
  for (const [name, role, prefix] of [
    ['SUPABASE_ANON_KEY', 'anon', 'sb_publishable_'],
    ['SUPABASE_SERVICE_ROLE_KEY', 'service_role', 'sb_secret_'],
  ]) {
    const key = config[name];
    check(typeof key === 'string' && key.length > 24, `Missing ${name}.`);
    if (key.startsWith(prefix)) continue;
    let claims;
    try { claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')); }
    catch { throw new Error(`Invalid ${name} format.`); }
    check(claims.role === role && claims.ref === PROJECT, `${name} must have the staging project and expected role.`);
  }
  if (!database) return config;
  let db;
  try { db = new URL(config.DATABASE_URL); } catch { throw new Error('Missing or invalid staging DATABASE_URL.'); }
  const username = decodeURIComponent(db.username);
  const direct = db.hostname === `db.${PROJECT}.supabase.co` && username === 'postgres';
  const pooler = /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(db.hostname) && username === `postgres.${PROJECT}`;
  check(['postgres:', 'postgresql:'].includes(db.protocol) && (direct || pooler)
    && db.pathname === '/postgres' && db.password && !db.hash, 'Database connection must explicitly identify the staging project.');
  for (const key of db.searchParams.keys()) check(key === 'sslmode', 'Unsupported database URL option.');
  check(!db.searchParams.has('sslmode') || ['require','verify-full'].includes(db.searchParams.get('sslmode')), 'TLS is required.');
  return { ...config, db };
}
export function readConfig(path, options) {
  const stat = statSync(path);
  check(stat.isFile() && (stat.mode & 0o077) === 0 && stat.uid === process.getuid(), 'Credential file must be owned by the current user and chmod 600.');
  const config = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const match = /^([A-Z_]+)=(.*)$/.exec(line);
    check(match && ['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','DATABASE_URL'].includes(match[1]), 'Unexpected credential-file entry.');
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    check(!Object.hasOwn(config, match[1]), 'Duplicate credential-file entry.');
    config[match[1]] = value;
  }
  return validateConfig(config, options);
}

/** Destructive cleanup is restricted to one recorded run and its generated users. */
export function purchaseCleanupSql(runId, users) {
  check(UUID.test(runId) && users.length > 0 && users.every(id => UUID.test(id)), 'Invalid fixture cleanup scope.');
  const ids = users.map(literal).join(',');
  const own = `student_id in (${ids}) and payment_reference like ${literal(`phase1-qa:${runId}:%`)}`;
  return `begin; set local statement_timeout='10s';
delete from public.v2_product_grants where purchase_id in (select id from public.v2_purchases where ${own});
delete from public.v2_purchases where ${own}; commit;`;
}
