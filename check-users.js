const { Client } = require('pg');

async function main() {
  const c = new Client({ host: 'localhost', port: 5432, user: 'mes_admin', password: '9841725630_p@ss2092', database: 'mes_production' });
  await c.connect();
  
  // Get table columns
  const cols = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position");
  console.log('Users table columns:');
  cols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
  
  // Get existing users
  const users = await c.query('SELECT * FROM users');
  console.log('\nExisting users:');
  users.rows.forEach(u => console.log(JSON.stringify(u)));
  
  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
