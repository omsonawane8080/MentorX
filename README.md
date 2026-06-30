# Personal AI Interview Mentor

A private desktop mentor app for AI/ML, GenAI, and DSA interview preparation.

## What It Does

- Tracks daily learning tasks and study time.
- Stores your roadmap, logs, quizzes, mentor reviews, and project milestones in Supabase.
- Generates Hinglish mentor feedback, MCQs, weak-topic analysis, and next-day plans with OpenAI.
- Keeps the OpenAI API key encrypted on the local desktop with Electron safe storage.

## Setup

1. Create a Supabase project on the free plan.
2. Open Supabase SQL Editor and run `supabase/migrations/001_initial_schema.sql`.
3. Create `.env` from `.env.example` and fill:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - Optional `VITE_OPENAI_MODEL`
4. Install dependencies:

```bash
npm install
```

5. Start the desktop app:

```bash
npm run dev
```

## Notes

- Supabase can stay free for personal usage within its free-tier limits.
- OpenAI API usage may cost money depending on your key and model.
- The app works best after you add an OpenAI API key in Settings, but it includes a small fallback quiz mode.
