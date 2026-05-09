# ⏳_SHIFT_CREW Frontend

Vite + React + TailwindCSS checklist app for shift-based task submission.

## Setup

```bash
npm install
npm run dev
```

Dev server runs on `http://localhost:5173`

## Build

```bash
npm run build
```

Outputs to `dist/` for deployment.

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

## Environment

Backend API is proxied via Vite (see vite.config.js). In production, update the API URL in components to your Railway backend domain.

## Components

- **LoginScreen** - Email/password auth
- **ChecklistScreen** - Main task interface (shifts, rooms, task submission)
- **TaskCard** - Individual task with yes/no/carry-over buttons

## Architecture

- App.jsx manages auth state and localStorage tokens
- ChecklistScreen fetches tasks and submits entries
- TaskCard handles individual task state and UI
