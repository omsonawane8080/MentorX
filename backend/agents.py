"""AI Agents for the Career Mentor app.

- Planner: roadmap generation (Gemini 3 Flash)
- Tutor: quiz generation, daily task generation (Gemini 3 Flash)
- Interviewer: text-based mock interview (GPT-5.2)
- Evaluator: answer evaluation + mentor review (GPT-5.2)

All agents use the Emergent Universal LLM key.
"""
import json
import os
import re
import uuid
from typing import List, Dict, Any
from emergentintegrations.llm.chat import LlmChat, UserMessage

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

GEMINI_FAST = ("gemini", "gemini-3-flash-preview")
GPT_REASONING = ("openai", "gpt-5.2")


def _extract_json(text: str) -> Any:
    """Extract a JSON object/array from a model response, tolerating code fences."""
    if not text:
        raise ValueError("Empty LLM response")
    # strip code fences
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.MULTILINE)
    # try direct parse
    try:
        return json.loads(cleaned)
    except Exception:
        pass
    # find first { ... } or [ ... ] block
    match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    raise ValueError(f"Could not parse JSON from LLM response: {text[:200]}")


async def _ask_json(provider: str, model: str, session_id: str, system: str, prompt: str) -> Any:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system,
    ).with_model(provider, model)
    reply = await chat.send_message(UserMessage(text=prompt))
    return _extract_json(reply)


async def _ask_text(provider: str, model: str, session_id: str, system: str, prompt: str) -> str:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system,
    ).with_model(provider, model)
    return await chat.send_message(UserMessage(text=prompt))


# ---------------------------------------------------------------------------
# Planner Agent — Roadmap
# ---------------------------------------------------------------------------
PLANNER_SYSTEM = """You are the Planner Agent of an AI Career Mentor.
Generate concise, realistic, month-by-month roadmaps for the user's target tech role.
ALWAYS respond with valid JSON only, no markdown, no commentary.
The roadmap MUST be achievable within the user's timeline."""

async def generate_roadmap(target_role: str, background: str, timeline_months: int) -> Dict[str, Any]:
    prompt = f"""Create a roadmap for a learner.

TARGET ROLE: {target_role}
BACKGROUND: {background}
TIMELINE: {timeline_months} months

Return JSON with this exact shape:
{{
  "summary": "1-2 sentence motivating overview",
  "phases": [
    {{
      "month": 1,
      "title": "Phase title",
      "focus": "Short focus sentence",
      "topics": ["topic 1", "topic 2", "topic 3", "topic 4"],
      "milestone": "Concrete project/deliverable for this month",
      "resources": ["Resource 1", "Resource 2"]
    }}
  ],
  "core_skills": ["skill1", "skill2", "skill3", "skill4", "skill5", "skill6"]
}}

Generate exactly {timeline_months} phases (one per month). Topics should be specific (e.g. 'NumPy & Pandas' not 'Data libraries'). Use real resource names (books, courses, docs)."""
    return await _ask_json(*GEMINI_FAST, f"planner-{uuid.uuid4()}", PLANNER_SYSTEM, prompt)


# ---------------------------------------------------------------------------
# Tutor Agent — Daily tasks + Quizzes
# ---------------------------------------------------------------------------
TUTOR_SYSTEM = """You are the Tutor Agent of an AI Career Mentor.
You design daily tasks and high-quality MCQ quizzes. Respond with valid JSON only."""

async def generate_daily_tasks(target_role: str, current_phase: Dict[str, Any], previously_done: List[str]) -> List[Dict[str, Any]]:
    done_str = "\n".join(f"- {t}" for t in previously_done[-10:]) or "None yet"
    prompt = f"""Generate today's tasks for a learner.

TARGET ROLE: {target_role}
CURRENT PHASE: {current_phase.get('title')} — {current_phase.get('focus')}
PHASE TOPICS: {', '.join(current_phase.get('topics', []))}
RECENTLY COMPLETED TASKS:
{done_str}

Return JSON array of exactly 4 tasks. Mix concept study, hands-on coding, and a short review.
[
  {{"title":"...","description":"actionable 1-sentence description","topic":"topic name","estimated_minutes":30,"kind":"read|code|practice|review"}}
]
Tasks must be small (15-60 mins each) and concrete (e.g. "Build a NumPy matrix multiplication script and test on 100x100 random arrays")."""
    data = await _ask_json(*GEMINI_FAST, f"tutor-tasks-{uuid.uuid4()}", TUTOR_SYSTEM, prompt)
    return data if isinstance(data, list) else data.get("tasks", [])


async def generate_quiz(topic: str, difficulty: str = "medium") -> List[Dict[str, Any]]:
    prompt = f"""Create 5 MCQ questions on the topic.

TOPIC: {topic}
DIFFICULTY: {difficulty}

Return JSON array:
[
  {{
    "question": "...",
    "options": ["A ...","B ...","C ...","D ..."],
    "correct_index": 0,
    "explanation": "Brief explanation why the correct answer is right."
  }}
]
Make questions practical, not trivia. Mix conceptual and application questions."""
    data = await _ask_json(*GEMINI_FAST, f"tutor-quiz-{uuid.uuid4()}", TUTOR_SYSTEM, prompt)
    return data if isinstance(data, list) else data.get("questions", [])


# ---------------------------------------------------------------------------
# Interviewer Agent — Mock Interviews (multi-turn)
# ---------------------------------------------------------------------------
INTERVIEWER_SYSTEM = """You are the Interviewer Agent of an AI Career Mentor.
You conduct a calm, encouraging text-based mock interview for a candidate.
Ask ONE question at a time. Keep questions short, clear, and role-appropriate.
After 4 questions, conclude with: "Great session! That wraps it up."
Never give the candidate the answer during the interview."""

async def interview_next(target_role: str, focus: str, history: List[Dict[str, str]]) -> str:
    """history: list of {role: 'interviewer'|'candidate', content: str}"""
    history_text = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in history) or "(no messages yet)"
    prompt = f"""TARGET ROLE: {target_role}
INTERVIEW FOCUS: {focus}

CONVERSATION SO FAR:
{history_text}

Continue the interview. If there are no messages yet, greet the candidate warmly with 1 line and ask the first question. If 4 candidate answers have been given, conclude with: "Great session! That wraps it up." Otherwise ask the next question, adapting it to their previous answer.
Respond with just your next message (1-3 sentences). No JSON, no labels."""
    text = await _ask_text(*GPT_REASONING, f"interviewer-{uuid.uuid4()}", INTERVIEWER_SYSTEM, prompt)
    return text.strip()


# ---------------------------------------------------------------------------
# Evaluator Agent — Per-session feedback + Mentor review
# ---------------------------------------------------------------------------
EVALUATOR_SYSTEM = """You are the Evaluator Agent of an AI Career Mentor.
You assess interview transcripts and overall learner progress.
Be encouraging but precise. Respond with valid JSON only."""

async def evaluate_interview(target_role: str, transcript: List[Dict[str, str]]) -> Dict[str, Any]:
    text = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in transcript)
    prompt = f"""TARGET ROLE: {target_role}

INTERVIEW TRANSCRIPT:
{text}

Return JSON:
{{
  "overall_score": 0-100,
  "summary": "2-3 sentence overall summary",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "per_answer": [
    {{"question":"...","candidate_answer":"...","score":0-10,"feedback":"1-sentence feedback"}}
  ],
  "next_steps": ["short actionable suggestion 1","2","3"]
}}"""
    return await _ask_json(*GPT_REASONING, f"evaluator-{uuid.uuid4()}", EVALUATOR_SYSTEM, prompt)


async def mentor_review(target_role: str, stats: Dict[str, Any]) -> Dict[str, Any]:
    prompt = f"""TARGET ROLE: {target_role}

LEARNER PROGRESS STATS:
{json.dumps(stats, indent=2)}

Produce a periodic 'Mentor Review' in JSON:
{{
  "readiness_score": 0-100,
  "summary": "2-3 sentence honest review",
  "strong_areas": ["..."],
  "weak_areas": ["..."],
  "recommended_focus": ["1","2","3"]
}}"""
    return await _ask_json(*GPT_REASONING, f"mentor-{uuid.uuid4()}", EVALUATOR_SYSTEM, prompt)
