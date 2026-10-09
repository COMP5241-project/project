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

Open the local address printed in the terminal (usually `http://localhost:5173`). Keep the terminal running while you use the app. Press `Ctrl+C` to stop it.

## Supabase setup

Supabase settings are optional for starting the app. Without them, sign-in and other Supabase features will not work.

To enable those features, create a `.env.local` file in this folder with the project's Supabase URL and public anon key:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Ask a teammate for the project's values. Never put a Supabase service role key in frontend code or in this file.

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
- `src/lib/` contains shared helpers and Supabase setup.
- `src/styles.css` contains global styles.
- `public/` contains static files such as images and icons.
