# IoT Frontend (Firebase Hosting)

This is a production-ready static frontend that integrates with a Python backend API.

## Features
- Send sensor data: `POST /api/v1/readings`
- Fetch latest reading: `GET /api/v1/readings/latest?device_id=...`
- Fetch historical readings: `GET /api/v1/readings?device_id=...&limit=...`
- Robust error handling with timeouts and readable error messages
- Dynamic rendering (latest JSON panel + history table)
- Works as a static site on Firebase Hosting (no build step)

## Backend URL configuration
- Default backend settings live in `public/config.js`.
- You can set the backend URL at runtime from the UI (API Settings). The value is saved in the browser (localStorage).
- For zero-click startup for everyone, set `backendBaseUrl` in `public/config.js` to your deployed backend base URL (the same base URL where `/health` responds).

## CORS requirement (backend)
Your backend must allow browser requests from your Firebase Hosting domain.
If your backend supports an environment variable (for example `CORS_ORIGINS`), set it to your Firebase Hosting origin(s).
Then redeploy/restart the backend service.

## Deploy to Firebase Hosting (exact steps)

### 1) Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2) Login
```bash
firebase login
```

### 3) Initialize Hosting (first time only)
Run this in the folder that contains `firebase.json`:
```bash
firebase init hosting
```

Choose:
- Use an existing project (select your Firebase project)
- Public directory: `public`
- Configure as a single-page app: No
- Set up automatic builds and deploys: No
- Overwrite existing files: No

### 4) Deploy
```bash
firebase deploy
```

### 5) Configure the backend URL in the UI
Open the deployed site → click **API Settings** → paste your backend base URL (the one where `/health` works) → Save.

## Optional: ingestion API key
If your backend expects an `X-API-Key` header for ingestion, enter it in **API Settings**.
