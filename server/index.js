const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs/promises');
const { dbConfig, getPool, testConnection } = require('./db');

// Use local date parts to avoid UTC-offset off-by-one-day issues
function toLocalDateStr(val) {
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val);
}

const app = express();
// Prefer the dedicated API port for local dev so the React app can stay on 3000.
// Cloud runtimes can still inject PORT and will be used when API_PORT is absent.
const port = Number(process.env.API_PORT || process.env.PORT || 4002);
const approvalEmail = process.env.APPROVAL_EMAIL_TO || 'akocentricsg@gmail.com';
const weekdayOrder = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

const corsOptions = {
  origin: [
    'https://akocentric-497106.web.app',
    'https://akocentric-497104.web.app',
    'https://akocentric-498016.web.app',
  ],
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

function createTransporter() {
  const { SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP_USER and SMTP_PASS must be configured before sending emails.');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

function isMissingTrainerSessionEndTimeColumn(error) {
  const message = error?.message || '';
  return message.includes('end_time');
}

async function sendMail(options) {
  const transporter = createTransporter();
  return transporter.sendMail(options);
}

function normalizeTrainerRecord(row, availabilities) {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    password: row.password,
    notes: row.notes || '',
    availabilities: availabilities
      .filter((entry) => entry.trainerId === row.id)
      .map((entry) => ({ day: entry.day, fromTime: entry.fromTime, toTime: entry.toTime }))
      .sort((first, second) => (weekdayOrder[first.day] || 99) - (weekdayOrder[second.day] || 99)),
  };
}

function validateTrainerPayload(payload) {
  const trainer = payload || {};

  if (!trainer.name || !trainer.username || !trainer.email || !trainer.password) {
    return 'name, username, email, and password are required.';
  }

  if (!Array.isArray(trainer.availabilities) || trainer.availabilities.length === 0) {
    return 'At least one availability entry is required.';
  }

  const invalidAvailability = trainer.availabilities.some((entry) => !entry?.day || (!entry?.fromTime && !entry?.timeSlot));
  if (invalidAvailability) {
    return 'Each availability entry must include day and fromTime.';
  }

  return null;
}

async function fetchAllTrainers() {
  const trainerRows = await getPool().execute(
    'SELECT id, name, username, email, password, notes FROM trainers ORDER BY name ASC',
  );
  const [trainerData] = trainerRows;

  if (trainerData.length === 0) {
    return [];
  }

  const trainerIds = trainerData.map((row) => row.id);
  const placeholders = trainerIds.map(() => '?').join(', ');
  const availabilityRows = await getPool().execute(
    `SELECT trainer_id AS trainerId, day_label AS day, time_slot AS fromTime, to_time AS toTime FROM trainer_availabilities WHERE trainer_id IN (${placeholders})`,
    trainerIds,
  );
  const [availabilityData] = availabilityRows;

  return trainerData.map((row) => normalizeTrainerRecord(row, availabilityData));
}

async function saveTrainerRecord(trainer, trainerId = null) {
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    let savedTrainerId = trainerId;

    if (savedTrainerId == null) {
      const [result] = await connection.execute(
        'INSERT INTO trainers (name, username, email, password, notes) VALUES (?, ?, ?, ?, ?)',
        [trainer.name, trainer.username, trainer.email, trainer.password, trainer.notes || null],
      );
      savedTrainerId = result.insertId;
    } else {
      await connection.execute(
        'UPDATE trainers SET name = ?, username = ?, email = ?, password = ?, notes = ? WHERE id = ?',
        [trainer.name, trainer.username, trainer.email, trainer.password, trainer.notes || null, savedTrainerId],
      );
      await connection.execute('DELETE FROM trainer_availabilities WHERE trainer_id = ?', [savedTrainerId]);
    }

    for (const availability of trainer.availabilities) {
      const fromTime = availability.fromTime || availability.timeSlot || '';
      const toTime = availability.toTime || '';
      await connection.execute(
        'INSERT INTO trainer_availabilities (trainer_id, day_label, time_slot, to_time) VALUES (?, ?, ?, ?)',
        [savedTrainerId, availability.day, fromTime, toTime],
      );
    }

    await connection.commit();

    return {
      id: savedTrainerId,
      name: trainer.name,
      username: trainer.username,
      email: trainer.email,
      password: trainer.password,
      notes: trainer.notes || '',
      availabilities: trainer.availabilities
        .map((entry) => ({
          day: entry.day,
          fromTime: entry.fromTime || entry.timeSlot || '',
          toTime: entry.toTime || '',
        }))
        .sort((first, second) => (weekdayOrder[first.day] || 99) - (weekdayOrder[second.day] || 99)),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// ── Approved Accounts ─────────────────────────────────────────────────────────

app.get('/api/approved-accounts', async (req, res) => {
  try {
    const [rows] = await getPool().execute(
      'SELECT id, name, email, password, role, status FROM approved_accounts ORDER BY id ASC',
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load approved accounts.' });
  }
});

app.post('/api/approved-accounts', async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'name, email, password, and role are required.' });
  }
  try {
    const [result] = await getPool().execute(
      'INSERT INTO approved_accounts (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
      [name, email.trim().toLowerCase(), password, role, 'approved'],
    );
    return res.status(201).json({ id: result.insertId, name, email: email.trim().toLowerCase(), password, role, status: 'approved' });
  } catch (error) {
    const status = error.code === 'ER_DUP_ENTRY' ? 409 : 500;
    const message = error.code === 'ER_DUP_ENTRY'
      ? 'An approved account with that email already exists.'
      : (error.message || 'Failed to create approved account.');
    return res.status(status).json({ message });
  }
});

app.delete('/api/approved-accounts/:accountId', async (req, res) => {
  const accountId = Number(req.params.accountId);
  if (!Number.isInteger(accountId) || accountId <= 0) {
    return res.status(400).json({ message: 'A valid accountId is required.' });
  }
  try {
    await getPool().execute('DELETE FROM approved_accounts WHERE id = ?', [accountId]);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to delete approved account.' });
  }
});

// ── Pending Account Requests ──────────────────────────────────────────────────

app.get('/api/pending-requests', async (req, res) => {
  try {
    const [rows] = await getPool().execute(
      'SELECT id, name, email, password, role FROM pending_account_requests ORDER BY id ASC',
    );
    return res.json(rows.map((r) => ({ ...r, status: 'pending' })));
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load pending requests.' });
  }
});

app.post('/api/pending-requests', async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'name, email, password, and role are required.' });
  }
  try {
    const [result] = await getPool().execute(
      'INSERT INTO pending_account_requests (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email.trim().toLowerCase(), password, role],
    );
    return res.status(201).json({ id: result.insertId, name, email: email.trim().toLowerCase(), password, role, status: 'pending' });
  } catch (error) {
    const status = error.code === 'ER_DUP_ENTRY' ? 409 : 500;
    const message = error.code === 'ER_DUP_ENTRY'
      ? 'A pending request for that email already exists.'
      : (error.message || 'Failed to create pending request.');
    return res.status(status).json({ message });
  }
});

app.delete('/api/pending-requests/:requestId', async (req, res) => {
  const requestId = Number(req.params.requestId);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return res.status(400).json({ message: 'A valid requestId is required.' });
  }
  try {
    await getPool().execute('DELETE FROM pending_account_requests WHERE id = ?', [requestId]);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to delete pending request.' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, approvalEmail });
});

app.get('/api/db/health', async (req, res) => {
  try {
    const status = await testConnection();
    return res.json({
      ok: true,
      database: status.databaseName || dbConfig.database,
      host: dbConfig.host,
      port: dbConfig.port,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message || 'MySQL connection failed.',
      database: dbConfig.database,
      host: dbConfig.host,
      port: dbConfig.port,
    });
  }
});

app.post('/api/db/init', async (req, res) => {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    const statements = schema
      .split(/;\s*\n/)
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await getPool().query(statement);
    }

    return res.json({ ok: true, appliedStatements: statements.length });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to initialize MySQL schema.' });
  }
});

app.get('/api/trainers', async (req, res) => {
  try {
    // Auto-populate trainers from approved_accounts where role='trainer'
    const [approvedTrainers] = await getPool().execute(
      "SELECT name, email, password FROM approved_accounts WHERE role = 'trainer'",
    );
    for (const account of approvedTrainers) {
      const [existing] = await getPool().execute(
        'SELECT id FROM trainers WHERE email = ? LIMIT 1',
        [account.email],
      );
      if (existing.length === 0) {
        await getPool().execute(
          'INSERT INTO trainers (name, username, email, password, notes) VALUES (?, ?, ?, ?, ?)',
          [account.name, account.email, account.email, account.password, ''],
        );
      }
    }

    const trainers = await fetchAllTrainers();
    return res.json(trainers);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load trainers.' });
  }
});

app.post('/api/trainers', async (req, res) => {
  const validationMessage = validateTrainerPayload(req.body);

  if (validationMessage) {
    return res.status(400).json({ message: validationMessage });
  }

  try {
    const trainer = await saveTrainerRecord(req.body);
    return res.status(201).json(trainer);
  } catch (error) {
    const status = error.code === 'ER_DUP_ENTRY' ? 409 : 500;
    const message = error.code === 'ER_DUP_ENTRY'
      ? 'A trainer with that email already exists.'
      : (error.message || 'Failed to create trainer.');
    return res.status(status).json({ message });
  }
});

app.put('/api/trainers/:trainerId', async (req, res) => {
  const trainerId = Number(req.params.trainerId);
  const validationMessage = validateTrainerPayload(req.body);

  if (!Number.isInteger(trainerId) || trainerId <= 0) {
    return res.status(400).json({ message: 'A valid trainerId is required.' });
  }

  if (validationMessage) {
    return res.status(400).json({ message: validationMessage });
  }

  try {
    const [result] = await getPool().execute('SELECT id FROM trainers WHERE id = ? LIMIT 1', [trainerId]);
    if (result.length === 0) {
      return res.status(404).json({ message: 'Trainer not found.' });
    }

    const trainer = await saveTrainerRecord(req.body, trainerId);
    return res.json(trainer);
  } catch (error) {
    const status = error.code === 'ER_DUP_ENTRY' ? 409 : 500;
    const message = error.code === 'ER_DUP_ENTRY'
      ? 'A trainer with that email already exists.'
      : (error.message || 'Failed to update trainer.');
    return res.status(status).json({ message });
  }
});

app.delete('/api/trainers/:trainerId', async (req, res) => {
  const trainerId = Number(req.params.trainerId);

  if (!Number.isInteger(trainerId) || trainerId <= 0) {
    return res.status(400).json({ message: 'A valid trainerId is required.' });
  }

  try {
    await getPool().execute('DELETE FROM trainer_sessions WHERE trainer_id = ?', [trainerId]);
    const [result] = await getPool().execute('DELETE FROM trainers WHERE id = ?', [trainerId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Trainer not found.' });
    }

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to delete trainer.' });
  }
});

// ── Edu Partners ──────────────────────────────────────────────────────────────

app.get('/api/edu-partners', async (req, res) => {
  try {
    const [rows] = await getPool().execute(
      'SELECT id, name, username, email, password, organisation, notes FROM edu_partners ORDER BY name ASC',
    );
    return res.json(rows.map((row) => ({ ...row, organisation: row.organisation || '', notes: row.notes || '' })));
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load edu partners.' });
  }
});

app.post('/api/edu-partners', async (req, res) => {
  const { name, username, email, password, organisation, notes } = req.body || {};
  if (!name || !username || !email || !password) {
    return res.status(400).json({ message: 'name, username, email, and password are required.' });
  }
  try {
    const [result] = await getPool().execute(
      'INSERT INTO edu_partners (name, username, email, password, organisation, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [name, username, email, password, organisation || null, notes || null],
    );
    return res.status(201).json({ id: result.insertId, name, username, email, password, organisation: organisation || '', notes: notes || '' });
  } catch (error) {
    const status = error.code === 'ER_DUP_ENTRY' ? 409 : 500;
    const message = error.code === 'ER_DUP_ENTRY'
      ? 'An edu partner with that email already exists.'
      : (error.message || 'Failed to create edu partner.');
    return res.status(status).json({ message });
  }
});

app.delete('/api/edu-partners/by-email/:email', async (req, res) => {
  const email = req.params.email;
  if (!email) {
    return res.status(400).json({ message: 'email is required.' });
  }
  try {
    await getPool().execute('DELETE FROM edu_partners WHERE email = ?', [email]);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to delete edu partner.' });
  }
});

app.delete('/api/edu-partners/:partnerId', async (req, res) => {
  const partnerId = Number(req.params.partnerId);
  if (!Number.isInteger(partnerId) || partnerId <= 0) {
    return res.status(400).json({ message: 'A valid partnerId is required.' });
  }
  try {
    const [result] = await getPool().execute('DELETE FROM edu_partners WHERE id = ?', [partnerId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Edu partner not found.' });
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to delete edu partner.' });
  }
});

app.post('/api/email/account-request', async (req, res) => {
  const { name, email, role } = req.body || {};

  if (!name || !email || !role) {
    return res.status(400).json({ message: 'name, email, and role are required.' });
  }

  try {
    await sendMail({
      from: process.env.SMTP_USER,
      to: approvalEmail,
      subject: `Account approval request: ${name}`,
      text: [
        'A new account approval request was submitted.',
        '',
        `Name: ${name}`,
        `Email: ${email}`,
        `Role: ${role}`,
        '',
        'Open the admin Approvals tab in Classroom Booking to approve this request.',
      ].join('\n'),
    });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to send approval request email.' });
  }
});

app.post('/api/email/account-approved', async (req, res) => {
  const { name, email, role } = req.body || {};

  if (!name || !email || !role) {
    return res.status(400).json({ message: 'name, email, and role are required.' });
  }

  try {
    await sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Your Classroom Booking account was approved',
      text: [
        `Hello ${name},`,
        '',
        `Your ${role} account for Classroom Booking has been approved.`,
        'You can now return to the app and log in with your approved credentials.',
        '',
        'If you did not expect this email, please contact the admin team.',
      ].join('\n'),
    });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to send approval email.' });
  }
});

// ── Forgot Password ──────────────────────────────────────────────────────────

app.post('/api/email/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: 'email is required.' });

  try {
    // Look up password in approved_accounts first, then trainers
    const [[accountRows]] = await getPool().execute(
      'SELECT name, password FROM approved_accounts WHERE email = ? LIMIT 1',
      [email.trim().toLowerCase()],
    );
    const [[trainerRows]] = await getPool().execute(
      'SELECT name, password FROM trainers WHERE email = ? LIMIT 1',
      [email.trim().toLowerCase()],
    );

    const record = accountRows || trainerRows;
    if (!record) {
      return res.status(404).json({ message: 'No account found with that email address.' });
    }

    await sendMail({
      from: process.env.SMTP_USER,
      to: email.trim().toLowerCase(),
      subject: 'Your AkoCentric login password',
      text: [
        `Hello ${record.name},`,
        '',
        'You requested your login details for AkoCentric.',
        '',
        `Your password is: ${record.password}`,
        '',
        'If you did not request this, please contact the admin team.',
      ].join('\n'),
    });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to send password email.' });
  }
});

// ── Classroom Bookings ───────────────────────────────────────────────────────

app.get('/api/bookings', async (req, res) => {
  try {
    const { month } = req.query; // optional YYYY-MM filter
    let sql = 'SELECT id, booker_name AS bookerName, room, date_value AS date, start_time AS start, end_time AS end, owner, course, purpose, color, weeks, student_ids AS studentIdsJson FROM classroom_bookings';
    const params = [];
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      sql += ' WHERE DATE_FORMAT(date_value, \'%Y-%m\') = ?';
      params.push(month);
    }
    sql += ' ORDER BY date_value ASC, start_time ASC';
    let rows;
    try {
      [rows] = await getPool().execute(sql, params);
    } catch (colError) {
      // Fallback: student_ids column may not exist yet — query without it
      const fallbackSql = sql.replace(', student_ids AS studentIdsJson', '');
      [rows] = await getPool().execute(fallbackSql, params);
      rows = rows.map((r) => ({ ...r, studentIdsJson: '[]' }));
    }
    const bookings = rows.map((row) => {
      let studentIds = [];
      try { studentIds = JSON.parse(row.studentIdsJson || '[]'); } catch (_) { studentIds = []; }
      const { studentIdsJson, ...rest } = row;
      return { ...rest, date: toLocalDateStr(row.date), studentIds };
    });
    return res.json(bookings);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load bookings.' });
  }
});

app.post('/api/bookings', async (req, res) => {
  const { bookerName, room, date, start, end, owner, course, purpose, color, weeks, studentIds } = req.body || {};

  if (!room || !date || !start || !end || !owner) {
    return res.status(400).json({ message: 'room, date, start, end, and owner are required.' });
  }

  const studentIdsJson = JSON.stringify(Array.isArray(studentIds) ? studentIds : []);
  try {
    let result;
    try {
      [{ insertId: result }] = await getPool().execute(
        'INSERT INTO classroom_bookings (booker_name, room, date_value, start_time, end_time, owner, course, purpose, color, weeks, student_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [bookerName || '', room, date, start, end, owner, course || null, purpose || null, color || 'primary', Number(weeks) || 1, studentIdsJson],
      );
    } catch (colError) {
      // student_ids column may not exist yet — insert without it
      [{ insertId: result }] = await getPool().execute(
        'INSERT INTO classroom_bookings (booker_name, room, date_value, start_time, end_time, owner, course, purpose, color, weeks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [bookerName || '', room, date, start, end, owner, course || null, purpose || null, color || 'primary', Number(weeks) || 1],
      );
    }
    return res.status(201).json({ id: result, bookerName: bookerName || '', room, date, start, end, owner, course, purpose, color: color || 'primary', weeks: Number(weeks) || 1, studentIds: Array.isArray(studentIds) ? studentIds : [] });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to create booking.' });
  }
});

app.delete('/api/bookings/:bookingId', async (req, res) => {
  const bookingId = Number(req.params.bookingId);

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return res.status(400).json({ message: 'A valid bookingId is required.' });
  }

  try {
    const [result] = await getPool().execute('DELETE FROM classroom_bookings WHERE id = ?', [bookingId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to delete booking.' });
  }
});

app.put('/api/bookings/:bookingId', async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return res.status(400).json({ message: 'A valid bookingId is required.' });
  }
  const { bookerName, room, date, start, end, owner, course, purpose, color, studentIds } = req.body || {};
  if (!room || !date || !start || !end) {
    return res.status(400).json({ message: 'room, date, start, and end are required.' });
  }
  const resolvedOwner = owner || bookerName || '';
  const resolvedBookerName = bookerName || owner || '';
  const studentIdsJson = JSON.stringify(Array.isArray(studentIds) ? studentIds : []);
  try {
    let affectedRows;
    try {
      [{ affectedRows }] = await getPool().execute(
        'UPDATE classroom_bookings SET booker_name=?, room=?, date_value=?, start_time=?, end_time=?, owner=?, course=?, purpose=?, color=?, student_ids=? WHERE id=?',
        [resolvedBookerName, room, date, start, end, resolvedOwner, course || null, purpose || null, color || 'primary', studentIdsJson, bookingId],
      );
    } catch (colError) {
      // student_ids column may not exist yet — update without it
      [{ affectedRows }] = await getPool().execute(
        'UPDATE classroom_bookings SET booker_name=?, room=?, date_value=?, start_time=?, end_time=?, owner=?, course=?, purpose=?, color=? WHERE id=?',
        [resolvedBookerName, room, date, start, end, resolvedOwner, course || null, purpose || null, color || 'primary', bookingId],
      );
    }
    if (affectedRows === 0) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    return res.json({ id: bookingId, bookerName: resolvedBookerName, room, date, start, end, owner: resolvedOwner, course, purpose, color: color || 'primary', studentIds: Array.isArray(studentIds) ? studentIds : [] });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update booking.' });
  }
});

// ── Student Enrollments ─────────────────────────────────────────────────────

async function fetchAllEnrollments() {
  const [enrollmentRows] = await getPool().execute(
    'SELECT id, student_name AS studentName, username, password, course, start_date AS startDate, start_time AS startTime, end_time AS endTime, weeks FROM student_enrollments ORDER BY id DESC',
  );

  if (enrollmentRows.length === 0) {
    return [];
  }

  const ids = enrollmentRows.map((row) => row.id);
  const placeholders = ids.map(() => '?').join(', ');

  const [dayRows] = await getPool().execute(
    `SELECT enrollment_id AS enrollmentId, day_label AS day FROM student_enrollment_days WHERE enrollment_id IN (${placeholders})`,
    ids,
  );

  const [scheduleRows] = await getPool().execute(
    `SELECT enrollment_id AS enrollmentId, entry_key AS id, day_label AS day, date_value AS date, display_date AS displayDate, start_time AS startTime, end_time AS endTime, is_no_class AS isNoClass, holiday_title AS holidayTitle, status_label AS statusLabel, notes FROM enrollment_schedule WHERE enrollment_id IN (${placeholders}) ORDER BY date_value ASC`,
    ids,
  );

  return enrollmentRows.map((row) => ({
    id: row.id,
    studentName: row.studentName,
    username: row.username,
    password: row.password,
    course: row.course,
    startDate: toLocalDateStr(row.startDate),
    startTime: row.startTime,
    endTime: row.endTime,
    weeks: row.weeks,
    days: dayRows.filter((d) => d.enrollmentId === row.id).map((d) => d.day),
    schedule: scheduleRows
      .filter((s) => s.enrollmentId === row.id)
      .map((s) => ({
        id: s.id,
        day: s.day,
        date: toLocalDateStr(s.date),
        displayDate: s.displayDate,
        startTime: s.startTime,
        endTime: s.endTime,
        ...(s.isNoClass ? { isNoClass: true, holidayTitle: s.holidayTitle, statusLabel: s.statusLabel, notes: s.notes } : {}),
      })),
  }));
}

app.get('/api/enrollments', async (req, res) => {
  try {
    const enrollments = await fetchAllEnrollments();
    return res.json(enrollments);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load enrollments.' });
  }
});

app.post('/api/enrollments', async (req, res) => {
  const body = req.body || {};
  const { studentName, username, password, course, startDate, startTime, endTime, weeks, days, schedule } = body;

  if (!studentName || !username || !password || !course || !startDate || !startTime || !endTime || !weeks || !Array.isArray(days) || days.length === 0) {
    return res.status(400).json({ message: 'studentName, username, password, course, startDate, startTime, endTime, weeks, and days are required.' });
  }

  if (!Array.isArray(schedule) || schedule.length === 0) {
    return res.status(400).json({ message: 'schedule must be a non-empty array.' });
  }

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      'INSERT INTO student_enrollments (student_name, username, password, course, start_date, start_time, end_time, weeks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [studentName, username, password, course, startDate, startTime, endTime, Number(weeks)],
    );
    const enrollmentId = result.insertId;

    for (const day of days) {
      await connection.execute(
        'INSERT INTO student_enrollment_days (enrollment_id, day_label) VALUES (?, ?)',
        [enrollmentId, day],
      );
    }

    for (const entry of schedule) {
      await connection.execute(
        'INSERT INTO enrollment_schedule (enrollment_id, entry_key, day_label, date_value, display_date, start_time, end_time, is_no_class, holiday_title, status_label, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [enrollmentId, entry.id || `${entry.day}-${entry.date}`, entry.day, entry.date, entry.displayDate || entry.date, entry.startTime, entry.endTime, entry.isNoClass ? 1 : 0, entry.holidayTitle || null, entry.statusLabel || null, entry.notes || null],
      );
    }

    await connection.commit();

    return res.status(201).json({ id: enrollmentId, studentName, username, password, course, startDate, startTime, endTime, weeks: Number(weeks), days, schedule });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ message: error.message || 'Failed to create enrollment.' });
  } finally {
    connection.release();
  }
});

app.put('/api/enrollments/:enrollmentId', async (req, res) => {
  const enrollmentId = Number(req.params.enrollmentId);
  const body = req.body || {};
  const { studentName, username, password, course, startDate, startTime, endTime, weeks, days, schedule } = body;

  if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) {
    return res.status(400).json({ message: 'A valid enrollmentId is required.' });
  }

  if (!studentName || !username || !password || !course || !startDate || !startTime || !endTime || !weeks || !Array.isArray(days) || days.length === 0) {
    return res.status(400).json({ message: 'studentName, username, password, course, startDate, startTime, endTime, weeks, and days are required.' });
  }

  if (!Array.isArray(schedule) || schedule.length === 0) {
    return res.status(400).json({ message: 'schedule must be a non-empty array.' });
  }

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      'UPDATE student_enrollments SET student_name=?, username=?, password=?, course=?, start_date=?, start_time=?, end_time=?, weeks=? WHERE id=?',
      [studentName, username, password, course, startDate, startTime, endTime, Number(weeks), enrollmentId],
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Enrollment not found.' });
    }

    await connection.execute('DELETE FROM student_enrollment_days WHERE enrollment_id = ?', [enrollmentId]);
    for (const day of days) {
      await connection.execute(
        'INSERT INTO student_enrollment_days (enrollment_id, day_label) VALUES (?, ?)',
        [enrollmentId, day],
      );
    }

    await connection.execute('DELETE FROM enrollment_schedule WHERE enrollment_id = ?', [enrollmentId]);
    for (const entry of schedule) {
      await connection.execute(
        'INSERT INTO enrollment_schedule (enrollment_id, entry_key, day_label, date_value, display_date, start_time, end_time, is_no_class, holiday_title, status_label, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [enrollmentId, entry.id || `${entry.day}-${entry.date}`, entry.day, entry.date, entry.displayDate || entry.date, entry.startTime, entry.endTime, entry.isNoClass ? 1 : 0, entry.holidayTitle || null, entry.statusLabel || null, entry.notes || null],
      );
    }

    await connection.commit();

    return res.json({ id: enrollmentId, studentName, username, password, course, startDate, startTime, endTime, weeks: Number(weeks), days, schedule });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ message: error.message || 'Failed to update enrollment.' });
  } finally {
    connection.release();
  }
});

app.delete('/api/enrollments/:enrollmentId', async (req, res) => {
  const enrollmentId = Number(req.params.enrollmentId);

  if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) {
    return res.status(400).json({ message: 'A valid enrollmentId is required.' });
  }

  try {
    const [result] = await getPool().execute('DELETE FROM student_enrollments WHERE id = ?', [enrollmentId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Enrollment not found.' });
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to delete enrollment.' });
  }
});

// Patch enrollment schedule (for push-class-back extensions)
app.patch('/api/enrollments/:enrollmentId/schedule', async (req, res) => {
  const enrollmentId = Number(req.params.enrollmentId);
  const { entries } = req.body || {};

  if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) {
    return res.status(400).json({ message: 'A valid enrollmentId is required.' });
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ message: 'entries must be a non-empty array.' });
  }

  try {
    for (const entry of entries) {
      await getPool().execute(
        'INSERT INTO enrollment_schedule (enrollment_id, entry_key, day_label, date_value, display_date, start_time, end_time, is_no_class) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
        [enrollmentId, entry.id || `${entry.day}-${entry.date}`, entry.day, entry.date, entry.displayDate || entry.date, entry.startTime, entry.endTime],
      );
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to extend enrollment schedule.' });
  }
});

// ── Trainer Sessions ─────────────────────────────────────────────────────────

app.get('/api/trainer-sessions', async (req, res) => {
  try {
    const { month } = req.query; // optional YYYY-MM filter
    let sql = 'SELECT id, trainer_id AS trainerId, trainer_name AS trainerName, course, date_value AS date, room, time_slot AS timeSlot, end_time AS endTime, session_type AS sessionType, notes FROM trainer_sessions';
    const params = [];
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      sql += ' WHERE DATE_FORMAT(date_value, \'%Y-%m\') = ?';
      params.push(month);
    }
    sql += ' ORDER BY date_value ASC, time_slot ASC';
    let rows;
    try {
      [rows] = await getPool().execute(sql, params);
    } catch (columnError) {
      if (!isMissingTrainerSessionEndTimeColumn(columnError)) {
        throw columnError;
      }
      const fallbackSql = sql.replace(', end_time AS endTime', ", '' AS endTime");
      [rows] = await getPool().execute(fallbackSql, params);
    }

    // Load student associations and attendance for all returned sessions
    const sessionIds = rows.map((r) => r.id);
    let studentRows = [];
    if (sessionIds.length > 0) {
      const placeholders = sessionIds.map(() => '?').join(',');
      [studentRows] = await getPool().execute(
        `SELECT trainer_session_id AS sessionId, student_enrollment_id AS studentId, attendance_status AS attendanceStatus FROM trainer_session_students WHERE trainer_session_id IN (${placeholders})`,
        sessionIds,
      );
    }

    const studentsBySession = {};
    for (const sr of studentRows) {
      if (!studentsBySession[sr.sessionId]) studentsBySession[sr.sessionId] = [];
      studentsBySession[sr.sessionId].push(sr);
    }

    const sessions = rows.map((row) => {
      const assocs = studentsBySession[row.id] || [];
      const studentIds = assocs.map((a) => a.studentId);
      const attendanceByStudentId = {};
      for (const a of assocs) {
        attendanceByStudentId[a.studentId] = a.attendanceStatus;
      }
      return {
        ...row,
        date: toLocalDateStr(row.date),
        endTime: row.endTime || '',
        studentIds,
        attendanceByStudentId,
      };
    });
    return res.json(sessions);
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load trainer sessions.' });
  }
});

app.post('/api/trainer-sessions/bulk', async (req, res) => {
  const { sessions } = req.body || {};
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return res.status(400).json({ message: 'sessions array is required.' });
  }
  try {
    const insertedIds = [];
    for (const s of sessions) {
      let result;
      try {
        [result] = await getPool().execute(
          'INSERT INTO trainer_sessions (trainer_id, trainer_name, course, date_value, room, time_slot, end_time, session_type, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [s.trainerId, s.trainerName, s.course, s.date, s.room, s.timeSlot, s.endTime || '', s.sessionType || 'trainer-class', s.notes || null],
        );
      } catch (columnError) {
        if (!isMissingTrainerSessionEndTimeColumn(columnError)) {
          throw columnError;
        }
        [result] = await getPool().execute(
          'INSERT INTO trainer_sessions (trainer_id, trainer_name, course, date_value, room, time_slot, session_type, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [s.trainerId, s.trainerName, s.course, s.date, s.room, s.timeSlot, s.sessionType || 'trainer-class', s.notes || null],
        );
      }
      const sessionId = result.insertId;
      insertedIds.push(sessionId);
      // Insert student associations
      const studentIds = Array.isArray(s.studentIds) ? s.studentIds : [];
      for (const studentId of studentIds) {
        await getPool().execute(
          'INSERT INTO trainer_session_students (trainer_session_id, student_enrollment_id, attendance_status) VALUES (?, ?, ?)',
          [sessionId, studentId, 'pending'],
        );
      }
    }
    return res.status(201).json({ insertedIds });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to save trainer sessions.' });
  }
});

app.put('/api/trainer-sessions/:sessionId', async (req, res) => {
  const sessionId = Number(req.params.sessionId);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ message: 'A valid sessionId is required.' });
  }
  const { trainerId, trainerName, course, date, room, timeSlot, endTime, notes, studentIds } = req.body || {};
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();

    const [existingAssociations] = await connection.execute(
      'SELECT student_enrollment_id AS studentId, attendance_status AS attendanceStatus FROM trainer_session_students WHERE trainer_session_id = ?',
      [sessionId],
    );
    const attendanceByStudentId = Object.fromEntries(
      existingAssociations.map((entry) => [Number(entry.studentId), entry.attendanceStatus]),
    );

    let result;
    try {
      [result] = await connection.execute(
        'UPDATE trainer_sessions SET trainer_id=?, trainer_name=?, course=?, date_value=?, room=?, time_slot=?, end_time=?, notes=? WHERE id=?',
        [trainerId, trainerName, course, date, room, timeSlot, endTime || '', notes || null, sessionId],
      );
    } catch (columnError) {
      if (!isMissingTrainerSessionEndTimeColumn(columnError)) {
        throw columnError;
      }
      [result] = await connection.execute(
        'UPDATE trainer_sessions SET trainer_id=?, trainer_name=?, course=?, date_value=?, room=?, time_slot=?, notes=? WHERE id=?',
        [trainerId, trainerName, course, date, room, timeSlot, notes || null, sessionId],
      );
    }
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Trainer session not found.' });
    }

    // Replace student associations
    await connection.execute('DELETE FROM trainer_session_students WHERE trainer_session_id = ?', [sessionId]);
    const ids = Array.isArray(studentIds) ? studentIds : [];
    for (const studentId of ids) {
      await connection.execute(
        'INSERT INTO trainer_session_students (trainer_session_id, student_enrollment_id, attendance_status) VALUES (?, ?, ?)',
        [sessionId, studentId, attendanceByStudentId[Number(studentId)] || 'pending'],
      );
    }

    await connection.commit();
    return res.json({ ok: true });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ message: error.message || 'Failed to update trainer session.' });
  } finally {
    connection.release();
  }
});

app.patch('/api/trainer-sessions/:sessionId/attendance', async (req, res) => {
  const sessionId = Number(req.params.sessionId);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ message: 'A valid sessionId is required.' });
  }
  const { studentId, status } = req.body || {};
  if (!studentId || !['pending', 'present', 'missed'].includes(status)) {
    return res.status(400).json({ message: 'studentId and a valid status (pending, present, missed) are required.' });
  }
  try {
    // Upsert: insert if not exists, update if exists (handles auto-matched students)
    await getPool().execute(
      'INSERT INTO trainer_session_students (trainer_session_id, student_enrollment_id, attendance_status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE attendance_status = VALUES(attendance_status)',
      [sessionId, studentId, status],
    );
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update attendance.' });
  }
});

app.delete('/api/trainer-sessions/:sessionId', async (req, res) => {
  const sessionId = Number(req.params.sessionId);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({ message: 'A valid sessionId is required.' });
  }
  try {
    const [result] = await getPool().execute('DELETE FROM trainer_sessions WHERE id = ?', [sessionId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Trainer session not found.' });
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to delete trainer session.' });
  }
});

app.listen(port, () => {
  console.log(`Approval and database API listening on port ${port}`);
});
