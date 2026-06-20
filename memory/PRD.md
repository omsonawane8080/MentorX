# AI Career Mentor — PRD

## Vision
Web-based AI career coach that remembers the user. Onboard once per domain → personalized roadmap → daily tasks → adaptive quizzes → AI mock interviews → mentor reviews.

## Stack
- **Frontend**: React 19, react-router 7, Tailwind, Phosphor Icons, Outfit + Work Sans
- **Backend**: FastAPI + Motor + Emergent integrations
- **AI**: Gemini 3 Flash (Planner/Tutor/Learn) + GPT-5.2 (Interviewer/Evaluator) via Emergent Universal LLM Key
- **Auth**: Emergent-managed Google OAuth
- **DB collections**: users, user_sessions, profiles, roadmaps, tasks, quizzes, quiz_results, interviews, mentor_reviews, streaks, learn_cache

## Implemented Features
### Auth & Onboarding
- Google login with 7-day cookie sessions
- Onboarding wizard (role + background + timeline) with sticky bottom CTA
- New users land on full Dashboard (with "Start onboarding" CTA), not forced

### Roadmap & Multi-Track (NEW – June 2026)
- **Multiple roadmaps per user** — create one for AI/ML, another for SAP ABAP, another for SWE
- **Roadmap switcher** in sidebar — pick active roadmap or create new
- **Delete** unused roadmaps
- Active roadmap drives daily tasks/dashboard

### Learn (NEW – June 2026)
- **Click any topic** in roadmap → opens detailed AI-explained drawer (rendered via React Portal so it always covers viewport)
- **Click any resource** → in-app summary so user doesn't need to search externally
- Drawer includes: hero with emoji, summary, why-it-matters, key concepts, learning steps, example, code snippet (syntax-highlighted), common pitfalls, "Take a quiz on this" CTA
- Cached in DB by name+role for instant re-opens
- "Tap any skill" interactive chips for core skills

### Daily Tasks
- 4 auto-generated tasks per day per active roadmap
- Mark complete → streak bumps when all done
- Skill-tree style numbered timeline

### Quiz (UPDATED – June 2026)
- **Number-of-questions picker**: 5 / 10 / 15 / 20
- **Countdown timer** (1 min/question) with low-time red warning
- **Auto-submit on timeout** — preserves partial answers
- Difficulty: easy / medium / hard
- URL ?topic= preselect (from Learn modal)
- Per-answer explanations with right/wrong color coding

### Interview (UPDATED – June 2026)
- **8-minute total timer** with countdown + low-time warning
- 4 adaptive questions (GPT-5.2)
- Auto-completes when time runs out
- Question counter (Q 1 of 4)
- Evaluation: overall score, per-answer feedback, strengths, weaknesses, next steps

### Mentor Review
- Click → AI generates readiness score + strong/weak areas + recommended focus
- Stored historically

### Dashboard
- Readiness, streak, tasks done stats
- Locked sections shown dimmed until onboarding complete
- Recent quizzes list

## Bug fixes (recent)
- CSS variable collision (`--primary` hex vs shadcn HSL) → renamed to `--brand`. Buttons were invisible.
- LearnModal "small in top-right" → migrated to `createPortal(document.body)` so `position:fixed` escapes parent transform animation containing block.
- Submit button below viewport → switched to `position: fixed` for the sticky action bar.

## Pending
- Voice mock interviews (Whisper STT + OpenAI TTS)
- Resume upload + auto skill extraction
- Skill-tree visualization
- Telegram daily-streak nudges
- Stripe-powered Premium tier
- "Mark topic complete" for roadmap progress tracking

## Testing
- iteration_1: 100% backend (15/15) + 100% frontend flows
- Multi-roadmap + Learn + timer features manually verified via screenshots and curl
- Test credentials in `/app/memory/test_credentials.md`

## Note on Emergent badge
The "Made with Emergent" badge in the bottom-right is platform-injected in the preview and on-platform deployments. To get a fully white-label app, deploy to Vercel/Netlify after pushing the code to GitHub (instructions provided in chat).
