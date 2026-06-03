const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({ host: '127.0.0.1', port: 3306, user: 'root', password: 'Dinesh0507', database: 'ekocentric' });
  try {
    await c.query('ALTER TABLE classroom_bookings ADD COLUMN booker_name VARCHAR(120) NOT NULL DEFAULT \'\'');
    console.log('COLUMN_ADDED');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('ALREADY_EXISTS');
    } else {
      throw e;
    }
  }
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
