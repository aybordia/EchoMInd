# EchoMind2 Current Handoff

Frontend production build currently passes from `frontend/`.

## Local Run

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

```bash
cd frontend
npm install
npm run dev -- --port 3001
```

The frontend calls same-origin `/api` and `/static` by default. `frontend/next.config.ts` proxies those requests to `BACKEND_ORIGIN`, which defaults locally to `http://127.0.0.1:8001`.

## Deploy

See `DEPLOYMENT.md`.

Minimum production shape:

- Vercel hosts the Next frontend.
- A Python host runs the FastAPI backend.
- Vercel env `BACKEND_ORIGIN` points to the backend URL.
- Vercel env `AUTH_SECRET` and `AUTH_URL` are set.
- Backend host env contains OpenAI, ElevenLabs, and Backboard keys as needed.

## Current Product Surface

- `/` dashboard
- `/ask` simulation tutor with follow-up questions
- `/progress` learner stats
- `/onboarding`
- `/settings`
- `/auth`

The video upload/digital-twin feature is intentionally removed from the product surface for now.
