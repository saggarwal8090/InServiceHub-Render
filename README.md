# InServiceHub

InServiceHub is a full-stack home services marketplace for customers and local service providers. Customers can search for providers by city and service, book a specific provider, or broadcast a request to all matching providers in an area. Providers can manage availability, accept requests, update booking status, and maintain their profile.

![InServiceHub Hero](client/public/images/hero-banner.png)

## What It Can Do

- Search service providers by city, service category, and online status.
- Register and log in as either a customer or service provider.
- Sign in with email/password or Google OAuth.
- Store password users and Google OAuth users in the same PostgreSQL `users` table.
- Let Google-created accounts set a password later from the profile page.
- Create direct bookings with a chosen provider.
- Broadcast a booking request to all providers matching a city and service.
- Let providers accept broadcast requests and manage assigned bookings.
- Let providers toggle online/offline availability.
- Show customer and provider dashboards.
- Maintain profile, service details, city, phone, description, price, and experience.
- Add customer reviews and update provider rating totals.
- Serve the React SPA from the Express server in production.
- Provide optional FastAPI analytics endpoints backed by the same PostgreSQL database.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router, Axios, Lucide Icons |
| Backend API | Node.js, Express.js |
| Analytics API | FastAPI, asyncpg |
| Database | PostgreSQL |
| Auth | JWT, bcrypt password hashing, Google OAuth ID token verification |
| Security | Helmet, CORS, compression, rate limiting |
| Deployment | Docker, Docker Compose, Render-compatible environment variables |

## Project Structure

```text
InServiceHub/
+-- client/                    React frontend
|   +-- public/images/         Static service and hero images
|   +-- src/components/        Navbar, cards, modals, Google sign-in button
|   +-- src/context/           AuthContext and persisted JWT session
|   +-- src/pages/             Home, search, auth, dashboards, profile
|   +-- .env.example           Frontend env template
|   +-- package.json
+-- server/                    Express API and production SPA server
|   +-- db/postgres.js         PostgreSQL connection and query adapter
|   +-- db/schema.sql          PostgreSQL schema and migrations
|   +-- db/init_postgres.js    Manual schema initializer
|   +-- db/check_db.js         Database table check helper
|   +-- index.js               API routes, auth, middleware, static serving
|   +-- seed.js                Demo data seeder
|   +-- .env.example           Backend env template
|   +-- package.json
+-- fastapi_service/           Optional analytics/recommendation API
|   +-- main.py
|   +-- requirements.txt
|   +-- Dockerfile
+-- Dockerfile                 Production multi-stage React + Express image
+-- docker-compose.yml         Local full-stack Docker setup
+-- docker-compose.prod.yml    Production app container using external Postgres
+-- deploy.md                  Short deployment notes
+-- vercel.json
```

## Environment Variables

### Backend (`server/.env`)

Use either `DATABASE_URL` or the individual `DB_*` variables. For Render Postgres, use the external database URL as `DATABASE_URL` and keep SSL enabled.

```bash
PORT=5001
NODE_ENV=development
JWT_SECRET=change_me_to_a_long_random_secret_string

# Render/external Postgres
DATABASE_URL=postgresql://user:password@host:5432/inservicehub?sslmode=require
DB_SSL=true

# Optional alternative for local Postgres when not using DATABASE_URL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=inservicehub
DB_USER=postgres
DB_PASSWORD=password

# Google OAuth
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

### Frontend (`client/.env.local`)

```bash
VITE_API_URL=http://localhost:5001/api
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

For production same-origin serving from Express, use:

```bash
VITE_API_URL=/api
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

Google sign-in is hidden when `VITE_GOOGLE_CLIENT_ID` is not set. Password login and registration still work.

## Google OAuth Setup

1. Open Google Cloud Console.
2. Create or select a project.
3. Configure the OAuth consent screen.
4. Create an OAuth Client ID for a web application.
5. Add authorized JavaScript origins:

```text
http://localhost:5173
http://localhost:5001
https://your-production-domain.com
```

6. Put the same client ID in both backend and frontend env variables:

```bash
GOOGLE_CLIENT_ID=...
VITE_GOOGLE_CLIENT_ID=...
```

The frontend receives a Google credential token and sends it to `/api/auth/google`. The Express server verifies it with `google-auth-library`, then creates or links the matching user by email/Google ID.

## Run Locally Without Docker

### Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL 14+ or a hosted PostgreSQL URL such as Render
- Python 3.10+ only if you want to run the optional FastAPI service locally

### 1. Install Dependencies

```bash
cd server
npm install

cd ../client
npm install
```

### 2. Configure Env Files

Create `server/.env`:

```bash
PORT=5001
NODE_ENV=development
JWT_SECRET=change_me_to_a_long_random_secret_string
DATABASE_URL=your_postgres_url
DB_SSL=true
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

Create `client/.env.local`:

```bash
VITE_API_URL=http://localhost:5001/api
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

For a local PostgreSQL server without SSL, use `DB_SSL=false`.

### 3. Initialize and Seed the Database

```bash
cd server
node db/init_postgres.js
node seed.js
```

The server also applies `server/db/schema.sql` automatically on startup, so manual initialization is mainly useful for checking your connection early.

Seed data creates demo providers, customers, bookings, and reviews.

Demo login:

```text
Email: rajesh@example.com
Password: password123
```

### 4. Start Development Servers

Terminal 1:

```bash
cd server
npm start
```

Terminal 2:

```bash
cd client
npm run dev
```

Open:

```text
Frontend: http://localhost:5173
Backend health: http://localhost:5001/api/health
```

### 5. Optional FastAPI Analytics Service

```bash
cd fastapi_service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Open:

```text
FastAPI health: http://localhost:8000/health
FastAPI docs: http://localhost:8000/docs
```

## Run With Docker Compose

The local Docker setup starts PostgreSQL, the Express server, the FastAPI service, and a Vite dev server.

### 1. Optional `.env` for Compose

Create a root `.env` if you want Google sign-in enabled:

```bash
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

### 2. Start the Full Stack

```bash
docker compose up --build
```

Open:

```text
React dev app: http://localhost:5173
Express API and production SPA server: http://localhost:5001
FastAPI service: http://localhost:8000
PostgreSQL: localhost:5432
```

### 3. Seed Docker Database

After the containers are running:

```bash
docker compose exec server node server/seed.js
```

### 4. Stop Containers

```bash
docker compose down
```

Reset the local Docker database:

```bash
docker compose down -v
```

## Production Docker

`docker-compose.prod.yml` builds a single production app container that serves:

- Express API under `/api`
- Built React app from `client/dist`

It expects an external PostgreSQL database such as Render Postgres.

### Required Production Env

Set these in your shell, CI, or host environment before starting:

```bash
PORT=5001
JWT_SECRET=change_me_to_a_long_random_secret_string
DATABASE_URL=your_render_postgres_external_url
DB_SSL=true
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
VITE_API_URL=/api
```

### Start Production Compose

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Check logs:

```bash
docker compose -f docker-compose.prod.yml logs -f app
```

Stop:

```bash
docker compose -f docker-compose.prod.yml down
```

## Render Deployment Notes

For a Render Web Service:

- Build command can use the Dockerfile, or install/build manually.
- Set `DATABASE_URL` to the Render Postgres external URL.
- Set `DB_SSL=true`.
- Set a strong `JWT_SECRET`.
- Set `GOOGLE_CLIENT_ID`.
- Ensure the Google OAuth client has your Render app URL in authorized JavaScript origins.

For production builds, `VITE_GOOGLE_CLIENT_ID` must be available at build time. The Dockerfile accepts it through the `VITE_GOOGLE_CLIENT_ID` build arg, and `docker-compose.prod.yml` maps it from `GOOGLE_CLIENT_ID`.

## Useful Commands

Backend:

```bash
cd server
npm install
npm start
node db/init_postgres.js
node db/check_db.js
node seed.js
```

Frontend:

```bash
cd client
npm install
npm run dev
npm run build
npm run lint
npm run preview
```

FastAPI:

```bash
cd fastapi_service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Docker:

```bash
docker compose up --build
docker compose exec server node server/seed.js
docker compose down
docker compose down -v
docker compose -f docker-compose.prod.yml up -d --build
```

## API Endpoints

Express API base path: `/api`

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | No | Health check |
| POST | `/api/register` | No | Register with email/password |
| POST | `/api/login` | No | Log in with email/password |
| POST | `/api/auth/google` | No | Log in or register with Google |
| GET | `/api/providers` | No | Search providers by city/service/online status |
| GET | `/api/providers/:id` | No | Get provider details, services, and reviews |
| GET | `/api/profile` | Yes | Get current user profile |
| PUT | `/api/profile` | Yes | Update current user profile |
| PUT | `/api/change-password` | Yes | Change or set password |
| POST | `/api/bookings` | Yes | Create direct or broadcast booking |
| GET | `/api/booking-requests` | Yes, provider | View matching broadcast requests |
| PUT | `/api/bookings/:id/accept` | Yes, provider | Accept broadcast booking |
| GET | `/api/my-bookings` | Yes | Get current user's bookings |
| PUT | `/api/bookings/:id/status` | Yes | Update booking status |
| POST | `/api/reviews` | Yes | Add customer review |
| PUT | `/api/toggle-online` | Yes, provider | Toggle provider online status |

FastAPI service:

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/health` | Service and database health |
| GET | `/api/categories` | Provider counts and average ratings by category |
| GET | `/api/providers/top` | Top-rated providers, optionally filtered |
| GET | `/api/providers/{provider_id}` | Provider details from analytics service |
| GET | `/api/stats/dashboard` | Platform-wide counts and average rating |

## Database Notes

The schema lives in `server/db/schema.sql`. It creates and migrates:

- `users`
- `provider_details`
- `services`
- `bookings`
- `reviews`

Important auth fields:

- `password` is nullable so Google-only accounts can exist.
- `auth_provider` is one of `password`, `google`, or `both`.
- `google_id` is unique when present.
- Existing password accounts are linked to Google when the verified Google email matches.

## Security Notes

- Passwords are hashed with bcrypt before storage.
- JWTs are signed with `JWT_SECRET` and expire after 24 hours.
- Google OAuth ID tokens are verified server-side.
- Auth routes are rate limited.
- API routes are rate limited separately.
- Helmet sets common HTTP security headers.
- Render/external PostgreSQL should use SSL via `DB_SSL=true`.

Do not commit real `.env` files or database URLs.

## Troubleshooting

### Google button does not appear

Check that `VITE_GOOGLE_CLIENT_ID` is set before starting or building the frontend.

### Google sign-in says OAuth is not configured

Check that `GOOGLE_CLIENT_ID` is set on the Express server.

### Database connection fails on Render

Use the Render Postgres external URL as `DATABASE_URL` and set `DB_SSL=true`.

### Local Docker database is not changing after schema edits

Docker initializes mounted SQL files only when the database volume is first created. Reset it with:

```bash
docker compose down -v
docker compose up --build
```

### Profile or protected requests return 401/403

Log out and log back in so the frontend refreshes the stored JWT and Authorization header.

## License

MIT
