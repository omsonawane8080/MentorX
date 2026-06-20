# AI Career Mentor — PRD

## Original Problem Statement
> User asked: web app vs desktop app for an AI Career Mentor (from uploaded PDF brief), and what competitors exist + how to differentiate. After analysis, user chose: **Web App (React + FastAPI + MongoDB)**, **Gemini 3 Flash + GPT-5.2** via Emergent LLM Key, **text-only mock interviews** in MVP, **Emergent-managed Google login**, **MongoDB**.

## Vision
A web-based AI career coach that **remembers the user** and guides them from their current background to a target tech role through a personalized monthly roadmap, daily tasks, adaptive quizzes, and AI mock interviews with structured feedback.

## User Personas
1. **Final-year CSE students** targeting entry-level AI/ML / SWE / Data roles.
2. **Career switchers** (Java/PM/etc.) pivoting into tech/ML.
3. **Upskilling professionals** on short focused timelines (1–6 months).

## Architecture
- **Frontend**: React 19 + react-router 7, Tailwind, Phosphor Icons, Outfit + Work Sans fonts. Organic/Earthy theme.
- **Backend**: FastAPI, Motor (MongoDB), Emergent integrations library for LLM, httpx for Emergent auth.
- **AI Agents** (in `agents.py`):
  - **Planner** (Gemini 3 Flash) → roadmap generation
  - **Tutor** (Gemini 3 Flash) → daily tasks + MCQ quizzes
  - **Interviewer** (GPT-5.2) → multi-turn text mock interview
  - **Evaluator** (GPT-5.2) → interview evaluation + mentor review
- **Auth**: Emergent-managed Google OAuth (cookie + Bearer fallback, 7-day sessions).
- **DB collections**: users, user_sessions, profiles, roadmaps, tasks, quizzes, quiz_results, interviews, mentor_reviews, streaks.

## Implemented (June 2026)
- ✅ Landing page with hero, features grid, organic earthy design
- ✅ Emergent Google Auth: login button → auth callback → session exchange → cookie
- ✅ Onboarding wizard (target role select, background textarea, timeline chips)
- ✅ Planner agent generates month-by-month roadmap with phases, topics, milestones, resources, core skills
- ✅ Daily tasks (4/day, auto-generated, persisted per date, mark complete with streak bump)
- ✅ Quiz generator + grader (5 MCQ per topic, correct_index hidden until submit, explanations on result)
- ✅ Text-based 4-turn mock interview with adaptive follow-ups (GPT-5.2)
- ✅ Interview evaluation: overall score, strengths, weaknesses, per-answer feedback, next steps
- ✅ Periodic Mentor Review with readiness score
- ✅ Dashboard: readiness, streak (flame), task progress, recent quizzes
- ✅ Roadmap timeline view with phase cards
- ✅ Protected routing with onboarding gating
- ✅ data-testid coverage across all interactive elements

## Backlog
### P1 (next)
- Voice mode for mock interviews (Whisper STT + OpenAI TTS)
- Resume upload + automatic skill extraction during onboarding
- Skill-tree visualization (gamified progress map)
- Email/push reminder for daily tasks ("don't break the streak")
- Re-generate roadmap / adapt when learner falls behind

### P2
- Peer-cohort matching (lightweight social)
- Calendar integration (Google Calendar block for daily focus time)
- Project portfolio builder (Markdown / GitHub README generator)
- Mentor review schedule (weekly auto-trigger)
- Coding-question practice with code execution sandbox

### P3
- Electron wrapper for desktop edition
- Mobile PWA optimizations
- LinkedIn parser for background auto-fill
- Multi-language UI (Hindi, Spanish)
- Telegram/WhatsApp bot for daily task delivery

## Testing
- iteration_1: 100% backend (15/15), 100% frontend flows. See `/app/test_reports/iteration_1.json`.
- Auth seed pattern: `/app/auth_testing.md`.
- Test credentials/seed instructions: `/app/memory/test_credentials.md`.

## Differentiation vs Market
| Competitor | Their slice | Our edge |
|---|---|---|
| Interview Warmup | Mock Qs only | + roadmap + memory + plan |
| Pramp / Interviewing.io | Peer mocks | + AI mentor that knows you |
| Coursera / Udemy | Static courses | + adaptive daily plan |
| Roadmap.sh | Static roadmaps | + personalized to background |
| ChatGPT | Generic Q&A | + multi-agent memory + structured progress |
