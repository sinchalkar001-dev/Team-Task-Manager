# Team Task Manager

A full-stack **project & task management** web application designed for small teams. It supports **role-based access control (Admin/Member)**, **JWT authentication**, and an **email OTP verification** flow.

**Highlights**
- Secure auth: JWT + bcrypt password hashing + email verification (OTP)
- Team workflows: project ownership, membership management, task assignment
- Task lifecycle: status updates + due dates + “overdue” dashboard insights
- Submission flow: members can upload a work file; submission auto-marks task as complete

---

## Tech Stack
- **Frontend:** React (Vite)
- **Backend:** Node.js + Express
- **Database:** MongoDB (Mongoose)
- **Security/ops:** Helmet, rate limiting (auth routes), Morgan logging

---

## Architecture (High Level)
- `client/` (React) calls the REST API via `VITE_API_URL`
- `server/` (Express) exposes `/api/*` routes and connects to MongoDB
- In production (`NODE_ENV=production`), the Express server also serves the React build (`client/dist`)

---

## Roles & Permissions (RBAC)

| Capability | Admin | Member |
|---|---:|---:|
| Register / Login (after OTP verification) | ✅ | ✅ |
| Create projects | ✅ | ❌ |
| View projects they belong to | ✅ | ✅ |
| Manage members (add/remove) for owned projects | ✅ (owner only) | ❌ |
| Create / assign tasks for owned projects | ✅ (owner only) | ❌ |
| Update task fields (title/assignee/due date, etc.) | ✅ (owner only) | ❌ |
| Update task status | ✅ (owner/assignee rules apply) | ✅ (assigned tasks only) |
| Submit work file for a task | ❌ | ✅ (assigned tasks only) |

---

## API Overview
Base URL: `/api`

### Auth
- `POST /auth/register` `{ name, email, password, role }` → sends OTP (no JWT yet)
- `POST /auth/verify-email` `{ email, otp }` → verifies email and returns JWT
- `POST /auth/resend-otp` `{ email }`
- `POST /auth/login` `{ email, password }` *(requires verified email)*
- `GET /auth/me` *(Bearer token)*

### Projects
- `GET /projects` *(projects current user is a member of)*
- `POST /projects` *(admin only)*
- `GET /projects/:id` *(project member)*
- `POST /projects/:id/members` *(owner admin)* `{ email }` or `{ userId }`
- `DELETE /projects/:id/members/:userId` *(owner admin)*

### Tasks
- `GET /tasks/project/:projectId` *(project member)*
- `POST /tasks/project/:projectId` *(owner admin)*
  - `{ title, description?, assigneeEmail?, assigneeId?, dueDate? }`
- `PATCH /tasks/:id`
  - Owner admin: can update task fields
  - Assignee member: can update `{ status }` only
- `POST /tasks/:id/submit` *(assignee member)*
  - `multipart/form-data`: `file` (required), `note` (optional)
  - Auto-sets `status=done` and stores submission metadata
- `GET /tasks/:id/submission` *(assignee member or owner admin)* → downloads submitted file

### Dashboard
- `GET /dashboard` *(current user)*

Health check:
- `GET /health` → `200 OK`

---

## Getting Started (Local Development)

### Prerequisites
- Node.js (LTS recommended)
- MongoDB (local or Atlas)

### 1) Install dependencies
From the repo root:
```bash
npm install
```

### 2) Configure environment variables

#### Server
Copy `server/.env.example` to `server/.env`:
```bash
# Windows PowerShell
Copy-Item server\.env.example server\.env
```

`server/.env` (example):
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/team_task_manager
JWT_SECRET=change_me_to_a_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

# SMTP (for real email OTP delivery)
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

If SMTP is not configured, the backend prints the OTP to the server console for local development.

#### Client
Copy `client/.env.example` to `client/.env`:
```bash
# Windows PowerShell
Copy-Item client\.env.example client\.env
```

`client/.env`:
```env
VITE_API_URL=http://localhost:5000
```

### 3) Run the app
```bash
npm run dev
```
- Client: http://localhost:5173
- API: http://localhost:5000/api/health

---

## Useful Scripts
From repo root:
- `npm run dev` → starts **server** + **client** concurrently
- `npm run build` → builds the React app (`client/dist`)
- `npm start` → starts the production server

---

## Project Structure
```
Team-Task-Manager/
  client/           # React UI (Vite)
  server/           # Express API
  package.json      # Root scripts (dev/build/start)
```

---

## Deployment Notes (Railway / Render / VPS)
- Production mode is supported: Express serves `client/dist` when `NODE_ENV=production`.
- Typical commands:
  - Build: `npm run build`
  - Start: `npm start`
- Set environment variables securely in your hosting provider:
  - `MONGO_URI`, `JWT_SECRET` *(required)*
  - `JWT_EXPIRES_IN`, `CLIENT_URL`, SMTP vars *(optional depending on needs)*

---

## Security Notes
- Do **not** commit `.env` files. This repo ignores them via `.gitignore`.
- Use a long random `JWT_SECRET` in production.
- Auth routes are rate-limited and the server uses Helmet for baseline security headers.

---

## License
ISC (see `package.json`).
