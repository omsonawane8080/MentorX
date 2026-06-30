import { fallbackMentorAnswer, fallbackMentorReview, fallbackQuiz, parseJsonOrThrow } from './fallbacks';
import type { AppData, DailyLog, MentorTaskSuggestion, QuizQuestion } from './types';

export type QuizGeneration = {
  title: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: QuizQuestion[];
};

export type MentorReviewGeneration = {
  feedback: string;
  weak_areas: string[];
  readiness_score: number;
  next_day_suggestions: MentorTaskSuggestion[];
};

const model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-5.4-mini';

export async function generateQuizWithAI(topic: string, difficulty: string, context: string): Promise<QuizGeneration> {
  const system =
    'You are a Hinglish AI/ML interview mentor for an Indian CSE final-year student. Return only strict JSON. No markdown.';
  const prompt = `Create an interview prep quiz.
Topic: ${topic}
Difficulty: ${difficulty}
Context: ${context}

Return this JSON shape:
{
  "title": "short title",
  "topic": "${topic}",
  "difficulty": "easy|medium|hard",
  "questions": [
    {
      "question": "MCQ question",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "short Hinglish explanation",
      "topic": "specific weak topic"
    }
  ]
}

Rules:
- Generate exactly 5 questions.
- Each question must have exactly 4 options.
- correctIndex must be 0, 1, 2, or 3.
- Focus on interview understanding, not trivia.`;

  try {
    const result = await window.mentorAI.generate({
      system,
      prompt,
      model,
      maxOutputTokens: 1800
    });
    return normalizeQuiz(parseJsonOrThrow<QuizGeneration>(result.text), topic);
  } catch {
    return fallbackQuiz(topic);
  }
}

export async function generateMentorReviewWithAI(
  data: AppData,
  todayLog: Partial<DailyLog>,
  today: string
): Promise<MentorReviewGeneration> {

  return fallbackMentorReview();

}
export async function askMentorWithAI(
  question: string,
  data: AppData
): Promise<string> {

  return fallbackMentorAnswer(question);

}

function normalizeQuiz(input: QuizGeneration, topic: string): QuizGeneration {
  const questions = (input.questions ?? [])
    .filter((question) => Array.isArray(question.options) && question.options.length >= 4)
    .slice(0, 5)
    .map((question) => ({
      ...question,
      options: question.options.slice(0, 4),
      correctIndex:
        Number.isInteger(question.correctIndex) && question.correctIndex >= 0 && question.correctIndex <= 3
          ? question.correctIndex
          : 0,
      topic: question.topic || topic
    }));

  if (questions.length === 0) {
    return fallbackQuiz(topic);
  }

  return {
    title: input.title || `${topic} quiz`,
    topic: input.topic || topic,
    difficulty: input.difficulty || 'medium',
    questions
  };
}

function normalizeMentorReview(input: MentorReviewGeneration): MentorReviewGeneration {
  const suggestions = (input.next_day_suggestions ?? []).slice(0, 4).map((suggestion) => ({
    title: suggestion.title,
    topic: suggestion.topic,
    skill_area: suggestion.skill_area,
    estimated_minutes: Number(suggestion.estimated_minutes) || 60,
    priority: suggestion.priority || 'medium'
  }));

  if (!input.feedback || suggestions.length === 0) {
    return fallbackMentorReview();
  }

  return {
    feedback: input.feedback,
    weak_areas: input.weak_areas ?? [],
    readiness_score: Math.max(0, Math.min(100, Number(input.readiness_score) || 0)),
    next_day_suggestions: suggestions
  };
}
