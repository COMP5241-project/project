# Frontend

This folder contains the web app for the project. It is built with React, TypeScript, and Vite.

## Requirements

- Install Node.js and npm on your computer. npm is included with Node.js.

## Run the app

Open a terminal in the `frontend` folder and run:

```bash
npm install
npm run dev
```

Open the local address printed in the terminal (usually `http://localhost:5173`;
in Codespaces, open the forwarded port 5173 URL). Keep the terminal running
while you use the app. Press `Ctrl+C` to stop it.

## Backend connection

Start FastAPI using `../backend/README.md`. Supabase authentication, token refresh,
logout, and profile queries run in the backend. The frontend requires no Supabase
environment variables or SDK. Never put Supabase keys or tokens in frontend code.

The Vite development and preview servers proxy `/api` to `http://127.0.0.1:8000`.
Open the app through Vite, not by opening `index.html` directly. If the backend uses
another address, update both proxies in `vite.config.ts`. If Vite uses another port
(including preview's default 4173), add its exact origin to `FRONTEND_ORIGINS` in
`backend/.env` and restart the backend.

Sessions use an opaque HttpOnly cookie; Supabase tokens stay on the server. Existing
browser Supabase sessions do not transfer, so sign in again after this migration.
Page refresh keeps you signed in, but restarting the backend clears demo sessions.
A production host must route `/api` to FastAPI and use HTTPS and shared session storage.

## Useful commands

Run these from the `frontend` folder:

```bash
npm run dev      # Start the app for local development
npm run build    # Check the code and create a production build
npm run lint     # Check the code for common issues
npm run preview  # Preview the production build locally
```

## Where to find things

- `src/routes/` contains the pages shown in the app.
- `src/lib/` contains the typed API adapter, role cache, and profile hook.
- `src/styles.css` contains global styles.
- `public/` contains static files such as images and icons.
