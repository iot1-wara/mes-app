const { Client } = require('pg');
async function main() {
  const c = new Client({ host: 'localhost', port: 5432, user: 'mes_admin', password: '9841725630_p@ss2092', database: 'mes_production' });
  await c.connect();
  
  const r = await c.query('SELECT username, password FROM users WHERE username = $1', ['admin']);
  console.log('Found:', JSON.stringify(r.rows, null, 2));
  
  // Also check all passwords length
  const all = await c.query('SELECT username, password, role FROM users');
  console.log('\nAll users:', all.rows.map(u => `${u.username}: pw_len=${u.password?.length}, role=${u.role}`));
  
  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });
