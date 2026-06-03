# AkoCentric Classroom Booking

## Local MySQL setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and set your local MySQL values:

```env
PORT=3000
API_PORT=4002
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-local-mysql-password
DB_NAME=ekocentric
DB_CONNECTION_LIMIT=10
SMTP_USER=your-gmail-address@gmail.com
SMTP_PASS=your-gmail-app-password
APPROVAL_EMAIL_TO=kumar.devadharshini@gmail.com
REACT_APP_API_BASE_URL=https://classbook-api-926559568753.asia-southeast1.run.app
```

The frontend now targets the deployed Google Cloud API by default. Only point `REACT_APP_API_BASE_URL` to `http://localhost:4002` if you intentionally want to run the API locally.

3. Create the local MySQL database:

```sql
CREATE DATABASE classbook;
```

4. Start the API server:

```bash
npm run api
```

5. Check the DB connection:

```text
GET http://localhost:4002/api/db/health
```

6. Initialize the schema:

```text
POST http://localhost:4000/api/db/init
```

The schema file is in `server/schema.sql`.

## Running the app

Use both frontend and backend together during local development:

```bash
npm run dev
```

Frontend: `http://localhost:3000`

API: `http://localhost:4002`

## Current backend scope

The MySQL layer is currently deployed behind Google Cloud and includes:

- shared DB connection pool in `server/db.js`
- schema bootstrap in `server/schema.sql`
- DB health endpoint at `/api/db/health`
- schema init endpoint at `/api/db/init`

The React app is configured to call the deployed API by default. If you want to move the data layer fully onto Firebase services instead of the current Cloud Run + MySQL backend, that migration will require separate Firebase project credentials and service setup.
