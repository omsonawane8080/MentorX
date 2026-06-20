"""End-to-end backend tests for AI Career Mentor.

Covers: health, auth, onboarding/roadmap, daily tasks, quizzes,
interview multi-turn + evaluation, mentor review, dashboard.

The user + session are pre-seeded via mongosh (see /app/auth_testing.md).
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://pdf-builder-185.preview.emergentagent.com").rstrip("/")
SESSION_TOKEN = os.environ.get("TEST_SESSION_TOKEN", "test_session_pytest_token")
USER_ID = "test-user-pytest"
AI_TIMEOUT = 90  # AI calls are slow


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {SESSION_TOKEN}",
    })
    return s


@pytest.fixture(scope="session")
def anon_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Health ----------
def test_health(anon_client):
    r = anon_client.get(f"{BASE_URL}/api/health", timeout=10)
    assert r.status_code == 200
    assert r.json() == {"ok": True}


# ---------- Auth ----------
def test_auth_me_unauthenticated(anon_client):
    r = anon_client.get(f"{BASE_URL}/api/auth/me", timeout=10)
    assert r.status_code == 401


def test_auth_me_authenticated(client):
    r = client.get(f"{BASE_URL}/api/auth/me", timeout=10)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user_id"] == USER_ID
    assert data["email"] == "test.user.pytest@example.com"
    assert data["name"]
    # onboarded must be false initially
    assert data["onboarded"] is False


# ---------- Onboarding + Roadmap ----------
@pytest.fixture(scope="session")
def onboarded_roadmap(client):
    payload = {
        "target_role": "AI/ML Engineer",
        "background": "Final-year CSE student, comfortable with Python and basic ML",
        "timeline_months": 3,
    }
    r = client.post(f"{BASE_URL}/api/onboarding", json=payload, timeout=AI_TIMEOUT)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "profile" in body and "roadmap" in body
    return body


def test_onboarding_creates_profile_and_roadmap(onboarded_roadmap):
    roadmap = onboarded_roadmap["roadmap"]
    assert "phases" in roadmap and isinstance(roadmap["phases"], list)
    assert len(roadmap["phases"]) >= 1
    assert "core_skills" in roadmap and isinstance(roadmap["core_skills"], list)
    # profile sanity
    assert onboarded_roadmap["profile"]["target_role"] == "AI/ML Engineer"
    assert onboarded_roadmap["profile"]["timeline_months"] == 3


def test_auth_me_after_onboarding(client, onboarded_roadmap):
    r = client.get(f"{BASE_URL}/api/auth/me", timeout=10)
    assert r.status_code == 200
    assert r.json()["onboarded"] is True


def test_get_roadmap(client, onboarded_roadmap):
    r = client.get(f"{BASE_URL}/api/roadmap", timeout=10)
    assert r.status_code == 200, r.text
    doc = r.json()
    assert "roadmap_id" in doc and doc["user_id"] == USER_ID
    assert "data" in doc and "phases" in doc["data"]


# ---------- Daily tasks ----------
@pytest.fixture(scope="session")
def today_tasks(client, onboarded_roadmap):
    r = client.get(f"{BASE_URL}/api/tasks/today", timeout=AI_TIMEOUT)
    assert r.status_code == 200, r.text
    return r.json()


def test_today_tasks_four_items(today_tasks):
    tasks = today_tasks["tasks"]
    assert len(tasks) == 4
    for t in tasks:
        assert "task_id" in t
        assert "title" in t and t["title"]
        assert "description" in t
        assert "kind" in t
        assert "estimated_minutes" in t
        assert t["done"] is False


def test_task_complete_idempotent(client, today_tasks):
    task_id = today_tasks["tasks"][0]["task_id"]
    r1 = client.post(f"{BASE_URL}/api/tasks/complete", json={"task_id": task_id}, timeout=15)
    assert r1.status_code == 200, r1.text
    d1 = r1.json()
    assert any(t["task_id"] == task_id and t["done"] for t in d1["tasks"])
    # idempotent
    r2 = client.post(f"{BASE_URL}/api/tasks/complete", json={"task_id": task_id}, timeout=15)
    assert r2.status_code == 200
    d2 = r2.json()
    assert any(t["task_id"] == task_id and t["done"] for t in d2["tasks"])


# ---------- Quiz ----------
@pytest.fixture(scope="session")
def quiz(client):
    r = client.post(
        f"{BASE_URL}/api/quiz/generate",
        json={"topic": "Python basics", "difficulty": "easy"},
        timeout=AI_TIMEOUT,
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_quiz_generate_no_correct_index(quiz):
    assert "quiz_id" in quiz
    qs = quiz["questions"]
    assert len(qs) == 5
    for q in qs:
        assert "question" in q
        assert "options" in q and len(q["options"]) >= 2
        assert "correct_index" not in q  # must NOT be exposed


def test_quiz_submit(client, quiz):
    answers = [0] * len(quiz["questions"])
    r = client.post(
        f"{BASE_URL}/api/quiz/submit",
        json={"quiz_id": quiz["quiz_id"], "answers": answers},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "score" in body and isinstance(body["score"], int)
    assert "correct" in body and "total" in body
    assert body["total"] == 5
    assert "results" in body and len(body["results"]) == 5
    for res in body["results"]:
        assert "correct_index" in res
        assert "is_correct" in res


# ---------- Interview ----------
@pytest.fixture(scope="session")
def interview(client):
    r = client.post(
        f"{BASE_URL}/api/interview/start",
        json={"focus": "Python fundamentals"},
        timeout=AI_TIMEOUT,
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_interview_start(interview):
    assert "interview_id" in interview
    assert interview["status"] == "ongoing"
    assert len(interview["messages"]) == 1
    assert interview["messages"][0]["role"] == "interviewer"
    assert interview["messages"][0]["content"]


def test_interview_completes_after_four_replies(client, interview):
    iv_id = interview["interview_id"]
    answers = [
        "I have worked with Python for 3 years, mostly in data analysis projects using pandas and NumPy.",
        "I would use a list comprehension or filter() to remove odd numbers from a list.",
        "Decorators wrap functions to add behavior — like @staticmethod or custom logging decorators.",
        "I'd use pytest for unit tests and mock external services with unittest.mock.",
    ]
    last_status = "ongoing"
    for i, ans in enumerate(answers):
        r = client.post(
            f"{BASE_URL}/api/interview/reply",
            json={"interview_id": iv_id, "message": ans},
            timeout=AI_TIMEOUT,
        )
        assert r.status_code == 200, r.text
        last_status = r.json()["status"]
        if i < 3:
            assert last_status == "ongoing"
    assert last_status == "completed"
    # final closing message exists
    msgs = r.json()["messages"]
    assert msgs[-1]["role"] == "interviewer"
    assert msgs[-1]["content"]


def test_interview_evaluate(client, interview):
    iv_id = interview["interview_id"]
    r = client.post(f"{BASE_URL}/api/interview/evaluate/{iv_id}", timeout=AI_TIMEOUT)
    assert r.status_code == 200, r.text
    ev = r.json()
    assert "overall_score" in ev
    assert "summary" in ev
    assert "strengths" in ev and isinstance(ev["strengths"], list)
    assert "weaknesses" in ev and isinstance(ev["weaknesses"], list)
    assert "per_answer" in ev
    assert "next_steps" in ev


# ---------- Mentor review ----------
def test_mentor_review(client, onboarded_roadmap):
    r = client.post(f"{BASE_URL}/api/mentor/review", timeout=AI_TIMEOUT)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "readiness_score" in body
    assert "summary" in body
    assert "strong_areas" in body
    assert "weak_areas" in body
    assert "recommended_focus" in body


# ---------- Dashboard ----------
def test_dashboard(client, onboarded_roadmap):
    r = client.get(f"{BASE_URL}/api/dashboard", timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "profile" in body
    assert "streak" in body and "count" in body["streak"] and "best" in body["streak"]
    stats = body["stats"]
    for k in ["readiness_score", "tasks_done", "tasks_total", "completion_pct", "quiz_avg", "quiz_count", "interview_count"]:
        assert k in stats
    assert "recent_quizzes" in body and isinstance(body["recent_quizzes"], list)
