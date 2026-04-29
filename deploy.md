# InServiceHub Deployment Guide (PostgreSQL)

This project stores users, Google OAuth identities, password hashes, bookings, providers, and reviews in PostgreSQL.

## Required Environment

Create `server/.env` locally, or set these variables in Render:

```bash
PORT=5001
NODE_ENV=production
JWT_SECRET=change_me_to_a_long_random_secret_string_at_least_32_chars
DATABASE_URL=your_render_postgres_external_url
DB_SSL=true
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

For the React app:

```bash
VITE_API_URL=/api
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

## Local Setup

1. Install backend dependencies:

```bash
cd server
npm install
```

2. Initialize the PostgreSQL schema:

```bash
node db/init_postgres.js
```

The server also runs the schema automatically on startup.

3. Optional seed data:

```bash
node seed.js
```

4. Start the server:

```bash
npm start
```

## Render Notes

Use Render's Postgres external URL as `DATABASE_URL`. Render external connections require SSL, so keep `DB_SSL=true` unless you are connecting to a local Docker Postgres instance.
