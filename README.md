# Team Task Manager (Full-Stack)

A full-stack web app to manage projects and tasks with **role-based access** (**Admin/Member**) and **JWT authentication**.

## Tech (matches provided skills)
- Frontend: React (Vite)
- Backend: Node.js + Express
- DB: MongoDB (Mongoose)
- Auth: JWT + bcrypt

## Features
- Signup/Login (JWT)
- Email verification with OTP (verify before login)
- Projects (Admin creates projects)
- Team membership management (Owner Admin adds/removes members)
- Tasks: create/assign/status tracking
- Member task submission: upload work file → auto-mark task complete
- Dashboard: task counts + overdue for the logged-in user

## Project structure
- `server/` Node/Express API
- `client/` React UI

## Environment variables
### Server (`server/.env`)
Copy `server/.env.example` → `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/team_task_manager
JWT_SECRET=change_me
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

If SMTP is not configured, the backend will print the OTP in the server console for local development.

### Client (`client/.env`)
Copy `client/.env.example` → `client/.env`:
```env
VITE_API_URL=http://localhost:5000
```

## Run locally
```bash
# from repo root
npm install
npm run dev
```
- Client: http://localhost:5173
- API: http://localhost:5000/api/health

## RBAC rules (summary)
- **Admin**
  - Can create projects
  - If Admin is the **project owner**: can add/remove members and create/assign tasks in that project
- **Member**
  - Can view projects they are a member of
  - Can update **status only** for tasks assigned to them

## API overview
Base: `/api`

### Auth
- `POST /auth/register` `{ name, email, password, role }` → sends OTP (no JWT yet)
- `POST /auth/verify-email` `{ email, otp }` → verifies and returns JWT
- `POST /auth/resend-otp` `{ email }`
- `POST /auth/login` `{ email, password }` (requires verified email)
- `GET /auth/me` (Bearer token)

### Projects
- `GET /projects` (member of)
- `POST /projects` (admin)
- `GET /projects/:id` (member)
- `POST /projects/:id/members` (owner admin) `{ email }` or `{ userId }`
- `DELETE /projects/:id/members/:userId` (owner admin)

### Tasks
- `GET /tasks/project/:projectId` (project member)
- `POST /tasks/project/:projectId` (owner admin)
  - `{ title, description?, assigneeEmail?, assigneeId?, dueDate? }`
- `PATCH /tasks/:id`
  - Owner admin: can update fields
  - Assignee member: can update `{ status }` only
- `POST /tasks/:id/submit` (assignee member)
  - `multipart/form-data`: `file` (required), `note` (optional)
  - Auto-sets `status=done` and stores `submission` metadata
- `GET /tasks/:id/submission` (assignee member or owner admin)
  - Downloads the submitted file (Admins can review/download after member submits)

### Dashboard
- `GET /dashboard` (current user)

## Deployment (Railway)
This repo is set up so the **Express server serves the React build** in production.

Typical Railway settings:
- Build command: `npm run build`
- Start command: `npm start`
- Add env vars: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN` (optional), `CLIENT_URL` (optional)

> Note: Root `postinstall` installs `server/` and `client/` dependencies automatically.
