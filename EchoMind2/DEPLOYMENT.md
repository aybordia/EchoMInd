# EchoMind2 Deployment

## Vercel Frontend

Deploy the `EchoMind2` folder to Vercel. The root `vercel.json` builds the app in `frontend/`.

Required Vercel environment variables:

```env
BACKEND_ORIGIN=https://your-fastapi-backend.example.com
AUTH_SECRET=replace-with-a-long-random-secret
AUTH_URL=https://your-vercel-app.vercel.app
```

Optional:

```env
NEXT_PUBLIC_BACKEND_URL=
USER_STORE_DIR=
```

Leave `NEXT_PUBLIC_BACKEND_URL` blank unless you intentionally want browser-side cross-origin API calls. By default the frontend calls same-origin `/api` and `/static`, and Next proxies those requests to `BACKEND_ORIGIN`.

## FastAPI Backend

Deploy `backend/` separately on a Python host such as Render, Railway, or Fly.

Backend environment variables:

```env
OPENAI_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
BACKBOARD_API_KEY=
BACKBOARD_BASE_URL=
```

Start command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

## Storage Note

Local JSON storage is still used for demo accounts, memory, jobs, and generated audio. It works for local demos and single-instance backend demos, but production persistence should be moved to a hosted database/object store before real users rely on it.
