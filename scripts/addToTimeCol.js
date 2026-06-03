const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Dinesh0507',
    database: 'ekocentric',
  });

  try {
    await conn.execute(
      "ALTER TABLE trainer_availabilities ADD COLUMN to_time VARCHAR(20) NOT NULL DEFAULT '' AFTER time_slot",
    );
    console.log('Column to_time added.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column to_time already exists.');
    } else {
      throw err;
    }
  }

  await conn.end();
}

run().catch((err) => { console.error(err.message); process.exit(1); });
