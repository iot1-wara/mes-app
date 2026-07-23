const { Client } = require('pg');
const crypto = require('crypto');

async function main() {
  const c = new Client({ host: 'localhost', port: 5432, user: 'mes_admin', password: '9841725630_p@ss2092', database: 'mes_production' });
  await c.connect();
  
  // Insert admin
  let r = await c.query(
    "INSERT INTO users (id, username, password, role, \"isActive\") VALUES ($1, $2, $3, 'admin', true) ON CONFLICT (username) DO NOTHING",
    [crypto.randomUUID(), 'admin', '$2b$10$ghcxyOUmePIsT8ETGFUEaebCIn.QcvHztmCOrHFeH6ww65YYrLaQW']
  );
  
  r = await c.query(
    "INSERT INTO users (id, username, password, role, \"isActive\") VALUES ($1, $2, $3, 'operator', true) ON CONFLICT (username) DO NOTHING",
    [crypto.randomUUID(), 'operator', '$2b$10$D/7w3AkAS16vo6zn6BwFjO/fizdFXo06T48KIjOyhp.92r063HsVK']
  );
  
  const users = await c.query('SELECT username, role FROM users');
  console.log('Users in DB:', users.rows.map(u => `${u.username} (${u.role})`).join('\n'));
  if (!users.rows.length) { console.log('[ERROR] No users found!'); process.exit(1); }
  await c.end();
  console.log('\nYou can now login at http://localhost:3000 with admin/admin123 or operator/operator123');
}

main().catch(e => { console.error(e); process.exit(1); });
