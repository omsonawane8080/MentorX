"""AI Career Mentor — FastAPI backend.

Features:
- Emergent-managed Google Auth (cookie + Bearer token)
- Onboarding: target role, background, timeline → generates roadmap
- Daily tasks (auto-generated, persistent for the day, mark complete)
- Quiz generation + scoring
- Text-based mock interview (multi-turn) + AI evaluation
- Periodic Mentor Review (readiness score, strengths/weaknesses)
- Progress dashboard data
"""
import os
import uuid
import logging
import httpx
from pathlib import Path
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import agents  # noqa: E402

# ---------------------------------------------------------------------------
# DB setup
# ---------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_AUTH_BASE = "https://demobackend.emergentagent.com/auth/v1/env"

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(title="AI Career Mentor")
api = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    onboarded: bool = False
    created_at: datetime = Field(default_factory=now_utc)


class OnboardingInput(BaseModel):
    target_role: str
    background: str
    timeline_months: int = 3


class TaskCompleteInput(BaseModel):
    task_id: str


class QuizGenerateInput(BaseModel):
    topic: str
    difficulty: str = "medium"


class QuizSubmitInput(BaseModel):
    quiz_id: str
    answers: List[int]


class InterviewStartInput(BaseModel):
    focus: str = "General fundamentals"


class InterviewReplyInput(BaseModel):
    interview_id: str
    message: str


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
async def _get_token_from_request(request: Request) -> Optional[str]:
    token = request.cookies.get("session_token")
    if token:
        return token
    auth = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return None


async def get_current_user(request: Request) -> User:
    token = await _get_token_from_request(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < now_utc():
        raise HTTPException(status_code=401, detail="Session expired")

    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")

    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    return User(**user_doc)


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api.post("/auth/session")
async def auth_session(request: Request, response: Response):
    """Exchange session_id (from Emergent auth fragment) for a session_token."""
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    async with httpx.AsyncClient(timeout=15) as hx:
        r = await hx.get(
            f"{EMERGENT_AUTH_BASE}/oauth/session-data",
            headers={"X-Session-ID": session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Could not verify session")
    data = r.json()
    email = data["email"]
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture")
    session_token = data["session_token"]

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "onboarded": False,
            "created_at": now_utc().isoformat(),
        })

    expires_at = now_utc() + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": now_utc(),
    })

    response.set_cookie(
        "session_token", session_token,
        httponly=True, secure=True, samesite="none", path="/",
        max_age=7 * 24 * 3600,
    )
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user_doc, "session_token": session_token}


@api.get("/auth/me")
async def auth_me(user: User = Depends(get_current_user)):
    return user.model_dump()


@api.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = await _get_token_from_request(request)
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Onboarding & Roadmap
# ---------------------------------------------------------------------------
@api.post("/onboarding")
async def onboarding(payload: OnboardingInput, user: User = Depends(get_current_user)):
    if payload.timeline_months < 1 or payload.timeline_months > 12:
        raise HTTPException(status_code=400, detail="timeline_months must be 1-12")

    # Generate roadmap with the Planner agent
    try:
        roadmap = await agents.generate_roadmap(
            payload.target_role, payload.background, payload.timeline_months
        )
    except Exception as e:
        logger.exception("Roadmap generation failed")
        raise HTTPException(status_code=502, detail=f"Roadmap generation failed: {e}")

    profile = {
        "user_id": user.user_id,
        "target_role": payload.target_role,
        "background": payload.background,
        "timeline_months": payload.timeline_months,
        "updated_at": now_utc().isoformat(),
    }
    await db.profiles.update_one(
        {"user_id": user.user_id}, {"$set": profile}, upsert=True
    )

    roadmap_doc = {
        "roadmap_id": f"rm_{uuid.uuid4().hex[:10]}",
        "user_id": user.user_id,
        "data": roadmap,
        "created_at": now_utc().isoformat(),
    }
    await db.roadmaps.delete_many({"user_id": user.user_id})
    await db.roadmaps.insert_one(roadmap_doc)

    await db.users.update_one({"user_id": user.user_id}, {"$set": {"onboarded": True}})
    return {"profile": profile, "roadmap": roadmap}


@api.get("/profile")
async def get_profile(user: User = Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    return profile or {}


@api.get("/roadmap")
async def get_roadmap(user: User = Depends(get_current_user)):
    doc = await db.roadmaps.find_one({"user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No roadmap yet — complete onboarding first")
    return doc


# ---------------------------------------------------------------------------
# Learn — in-app explanations for topics and resources (cached globally by name+role)
# ---------------------------------------------------------------------------
class LearnInput(BaseModel):
    name: str
    kind: str = "topic"  # "topic" | "resource"


def _learn_cache_key(name: str, kind: str, role: str) -> str:
    return f"{kind}::{role.lower()}::{name.lower().strip()}"


@api.post("/learn/explain")
async def learn_explain(payload: LearnInput, user: User = Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=400, detail="Complete onboarding first")

    role = profile["target_role"]
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    if payload.kind not in ("topic", "resource"):
        raise HTTPException(status_code=400, detail="kind must be 'topic' or 'resource'")

    cache_key = _learn_cache_key(name, payload.kind, role)
    cached = await db.learn_cache.find_one({"cache_key": cache_key}, {"_id": 0})
    if cached:
        return cached["data"]

    try:
        if payload.kind == "topic":
            data = await agents.explain_topic(name, role, profile.get("background", ""))
        else:
            data = await agents.explain_resource(name, role)
    except Exception as e:
        logger.exception("Learn explanation failed")
        raise HTTPException(status_code=502, detail=f"Explanation failed: {e}")

    await db.learn_cache.insert_one({
        "cache_key": cache_key,
        "name": name,
        "kind": payload.kind,
        "role": role,
        "data": data,
        "created_at": now_utc().isoformat(),
    })
    return data



# ---------------------------------------------------------------------------
# Daily Tasks
# ---------------------------------------------------------------------------
def _today_key() -> str:
    return date.today().isoformat()


def _current_phase(roadmap: Dict[str, Any], days_since_start: int) -> Dict[str, Any]:
    phases = roadmap.get("phases", [])
    if not phases:
        return {"title": "Getting Started", "focus": "Foundations", "topics": []}
    idx = min(days_since_start // 30, len(phases) - 1)
    return phases[idx]


@api.get("/tasks/today")
async def get_today_tasks(user: User = Depends(get_current_user)):
    today = _today_key()
    existing = await db.tasks.find_one(
        {"user_id": user.user_id, "date": today}, {"_id": 0}
    )
    if existing:
        return existing

    profile = await db.profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    roadmap_doc = await db.roadmaps.find_one({"user_id": user.user_id}, {"_id": 0})
    if not profile or not roadmap_doc:
        raise HTTPException(status_code=400, detail="Complete onboarding first")

    created_at_iso = roadmap_doc.get("created_at")
    try:
        created_at = datetime.fromisoformat(created_at_iso) if isinstance(created_at_iso, str) else now_utc()
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        days_since = (now_utc() - created_at).days
    except Exception:
        days_since = 0

    phase = _current_phase(roadmap_doc["data"], days_since)
    prior = await db.tasks.find(
        {"user_id": user.user_id, "all_done": True}, {"_id": 0}
    ).sort("date", -1).to_list(5)
    done_titles = [t["title"] for d in prior for t in d.get("tasks", []) if t.get("done")]

    try:
        tasks = await agents.generate_daily_tasks(profile["target_role"], phase, done_titles)
    except Exception as e:
        logger.exception("Task generation failed")
        raise HTTPException(status_code=502, detail=f"Task generation failed: {e}")

    tasks = [{**t, "task_id": f"tk_{uuid.uuid4().hex[:8]}", "done": False} for t in tasks]
    doc = {
        "user_id": user.user_id,
        "date": today,
        "phase_title": phase.get("title"),
        "tasks": tasks,
        "all_done": False,
        "created_at": now_utc().isoformat(),
    }
    await db.tasks.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.post("/tasks/complete")
async def complete_task(payload: TaskCompleteInput, user: User = Depends(get_current_user)):
    today = _today_key()
    doc = await db.tasks.find_one({"user_id": user.user_id, "date": today}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No tasks for today")
    updated = False
    for t in doc["tasks"]:
        if t["task_id"] == payload.task_id and not t["done"]:
            t["done"] = True
            updated = True
    all_done = all(t["done"] for t in doc["tasks"])
    doc["all_done"] = all_done
    await db.tasks.update_one(
        {"user_id": user.user_id, "date": today},
        {"$set": {"tasks": doc["tasks"], "all_done": all_done}},
    )
    # update streak if all done
    if all_done and updated:
        await _bump_streak(user.user_id)
    return doc


async def _bump_streak(user_id: str):
    streak = await db.streaks.find_one({"user_id": user_id}, {"_id": 0})
    today = date.today()
    if not streak:
        await db.streaks.insert_one({
            "user_id": user_id, "count": 1,
            "last_date": today.isoformat(), "best": 1,
        })
        return
    last = date.fromisoformat(streak["last_date"])
    if last == today:
        return
    new_count = streak["count"] + 1 if (today - last).days == 1 else 1
    best = max(new_count, streak.get("best", 1))
    await db.streaks.update_one(
        {"user_id": user_id},
        {"$set": {"count": new_count, "last_date": today.isoformat(), "best": best}},
    )


# ---------------------------------------------------------------------------
# Quizzes
# ---------------------------------------------------------------------------
@api.post("/quiz/generate")
async def quiz_generate(payload: QuizGenerateInput, user: User = Depends(get_current_user)):
    try:
        questions = await agents.generate_quiz(payload.topic, payload.difficulty)
    except Exception as e:
        logger.exception("Quiz generation failed")
        raise HTTPException(status_code=502, detail=f"Quiz generation failed: {e}")

    quiz_id = f"qz_{uuid.uuid4().hex[:10]}"
    # store full quiz but only return question + options to client (no answers)
    doc = {
        "quiz_id": quiz_id,
        "user_id": user.user_id,
        "topic": payload.topic,
        "difficulty": payload.difficulty,
        "questions": questions,
        "created_at": now_utc().isoformat(),
    }
    await db.quizzes.insert_one(doc)
    safe = [{"question": q["question"], "options": q["options"]} for q in questions]
    return {"quiz_id": quiz_id, "topic": payload.topic, "questions": safe}


@api.post("/quiz/submit")
async def quiz_submit(payload: QuizSubmitInput, user: User = Depends(get_current_user)):
    quiz = await db.quizzes.find_one(
        {"quiz_id": payload.quiz_id, "user_id": user.user_id}, {"_id": 0}
    )
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    results = []
    correct = 0
    for i, q in enumerate(quiz["questions"]):
        chosen = payload.answers[i] if i < len(payload.answers) else -1
        is_correct = chosen == q["correct_index"]
        if is_correct:
            correct += 1
        results.append({
            "question": q["question"],
            "your_index": chosen,
            "correct_index": q["correct_index"],
            "options": q["options"],
            "is_correct": is_correct,
            "explanation": q.get("explanation", ""),
        })
    score = round(100 * correct / max(len(quiz["questions"]), 1))
    await db.quiz_results.insert_one({
        "user_id": user.user_id,
        "quiz_id": payload.quiz_id,
        "topic": quiz["topic"],
        "score": score,
        "correct": correct,
        "total": len(quiz["questions"]),
        "created_at": now_utc().isoformat(),
    })
    return {"score": score, "correct": correct, "total": len(quiz["questions"]), "results": results}


# ---------------------------------------------------------------------------
# Mock Interview
# ---------------------------------------------------------------------------
@api.post("/interview/start")
async def interview_start(payload: InterviewStartInput, user: User = Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=400, detail="Complete onboarding first")
    interview_id = f"iv_{uuid.uuid4().hex[:10]}"
    try:
        opener = await agents.interview_next(profile["target_role"], payload.focus, [])
    except Exception as e:
        logger.exception("Interview start failed")
        raise HTTPException(status_code=502, detail=f"Interview start failed: {e}")
    doc = {
        "interview_id": interview_id,
        "user_id": user.user_id,
        "target_role": profile["target_role"],
        "focus": payload.focus,
        "messages": [{"role": "interviewer", "content": opener, "ts": now_utc().isoformat()}],
        "status": "ongoing",
        "created_at": now_utc().isoformat(),
    }
    await db.interviews.insert_one(doc)
    return {"interview_id": interview_id, "messages": doc["messages"], "status": "ongoing"}


@api.post("/interview/reply")
async def interview_reply(payload: InterviewReplyInput, user: User = Depends(get_current_user)):
    iv = await db.interviews.find_one(
        {"interview_id": payload.interview_id, "user_id": user.user_id}, {"_id": 0}
    )
    if not iv:
        raise HTTPException(status_code=404, detail="Interview not found")
    if iv["status"] != "ongoing":
        raise HTTPException(status_code=400, detail="Interview already finished")

    iv["messages"].append({"role": "candidate", "content": payload.message, "ts": now_utc().isoformat()})
    candidate_turns = sum(1 for m in iv["messages"] if m["role"] == "candidate")

    if candidate_turns >= 4:
        closing = "Great session! That wraps it up. I'll prepare your evaluation now."
        iv["messages"].append({"role": "interviewer", "content": closing, "ts": now_utc().isoformat()})
        iv["status"] = "completed"
    else:
        try:
            reply = await agents.interview_next(iv["target_role"], iv["focus"], iv["messages"])
        except Exception as e:
            logger.exception("Interview reply failed")
            raise HTTPException(status_code=502, detail=f"Interview reply failed: {e}")
        iv["messages"].append({"role": "interviewer", "content": reply, "ts": now_utc().isoformat()})

    await db.interviews.update_one(
        {"interview_id": payload.interview_id},
        {"$set": {"messages": iv["messages"], "status": iv["status"]}},
    )
    return {"interview_id": payload.interview_id, "messages": iv["messages"], "status": iv["status"]}


@api.post("/interview/evaluate/{interview_id}")
async def interview_evaluate(interview_id: str, user: User = Depends(get_current_user)):
    iv = await db.interviews.find_one(
        {"interview_id": interview_id, "user_id": user.user_id}, {"_id": 0}
    )
    if not iv:
        raise HTTPException(status_code=404, detail="Interview not found")
    if iv.get("evaluation"):
        return iv["evaluation"]
    try:
        evaluation = await agents.evaluate_interview(iv["target_role"], iv["messages"])
    except Exception as e:
        logger.exception("Evaluation failed")
        raise HTTPException(status_code=502, detail=f"Evaluation failed: {e}")
    await db.interviews.update_one(
        {"interview_id": interview_id},
        {"$set": {"evaluation": evaluation, "status": "completed"}},
    )
    return evaluation


@api.get("/interviews")
async def list_interviews(user: User = Depends(get_current_user)):
    docs = await db.interviews.find(
        {"user_id": user.user_id}, {"_id": 0, "messages": 0}
    ).sort("created_at", -1).to_list(20)
    return docs


# ---------------------------------------------------------------------------
# Dashboard / Mentor Review
# ---------------------------------------------------------------------------
@api.get("/dashboard")
async def dashboard(user: User = Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    streak = await db.streaks.find_one({"user_id": user.user_id}, {"_id": 0}) or {"count": 0, "best": 0}

    task_docs = await db.tasks.find({"user_id": user.user_id}, {"_id": 0}).to_list(60)
    total_tasks = sum(len(d["tasks"]) for d in task_docs)
    done_tasks = sum(sum(1 for t in d["tasks"] if t["done"]) for d in task_docs)

    quiz_docs = await db.quiz_results.find({"user_id": user.user_id}, {"_id": 0}).to_list(50)
    avg_quiz = round(sum(q["score"] for q in quiz_docs) / max(len(quiz_docs), 1)) if quiz_docs else 0

    interview_count = await db.interviews.count_documents({"user_id": user.user_id})

    # readiness: blend of completion + quiz + interviews
    completion_pct = round(100 * done_tasks / max(total_tasks, 1)) if total_tasks else 0
    readiness = round(0.4 * completion_pct + 0.4 * avg_quiz + 0.2 * min(interview_count * 20, 100))

    return {
        "profile": profile,
        "streak": {"count": streak.get("count", 0), "best": streak.get("best", 0)},
        "stats": {
            "tasks_done": done_tasks,
            "tasks_total": total_tasks,
            "completion_pct": completion_pct,
            "quiz_avg": avg_quiz,
            "quiz_count": len(quiz_docs),
            "interview_count": interview_count,
            "readiness_score": readiness,
        },
        "recent_quizzes": sorted(quiz_docs, key=lambda x: x["created_at"], reverse=True)[:5],
    }


@api.post("/mentor/review")
async def mentor_review_endpoint(user: User = Depends(get_current_user)):
    dash = await dashboard(user)
    profile = dash["profile"]
    if not profile:
        raise HTTPException(status_code=400, detail="Complete onboarding first")
    try:
        review = await agents.mentor_review(profile["target_role"], {
            "streak": dash["streak"],
            "stats": dash["stats"],
            "recent_quiz_topics": [q["topic"] for q in dash["recent_quizzes"]],
        })
    except Exception as e:
        logger.exception("Mentor review failed")
        raise HTTPException(status_code=502, detail=f"Mentor review failed: {e}")
    review_doc = {
        "review_id": f"mr_{uuid.uuid4().hex[:8]}",
        "user_id": user.user_id,
        "data": review,
        "created_at": now_utc().isoformat(),
    }
    await db.mentor_reviews.insert_one(review_doc)
    return review


@api.get("/health")
async def health():
    return {"ok": True}


# ---------------------------------------------------------------------------
# Mount
# ---------------------------------------------------------------------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
