import type { MentorTaskSuggestion, QuizQuestion } from './types';

export function stripJsonFences(value: string) {
  return value
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

export function parseJsonOrThrow<T>(value: string): T {
  return JSON.parse(stripJsonFences(value)) as T;
}

export function fallbackQuiz(topic: string): {
  title: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: QuizQuestion[];
} {
  return {
    title: `${topic} quick check`,
    topic,
    difficulty: 'medium',
    questions: [
      {
        question: `For interview preparation, what is the best first step while learning ${topic}?`,
        options: [
          'Memorize definitions only',
          'Build basics, practice examples, and explain in your own words',
          'Skip theory and only watch project videos',
          'Start advanced papers immediately'
        ],
        correctIndex: 1,
        explanation: 'Strong basics plus active practice creates interview-ready understanding.',
        topic
      },
      {
        question: 'Which habit improves long-term retention the most?',
        options: [
          'Revision after mistakes',
          'Only reading notes',
          'Changing topics every hour',
          'Avoiding quizzes'
        ],
        correctIndex: 0,
        explanation: 'Mistake-based revision tells you exactly where the next learning effort should go.',
        topic
      },
      {
        question: 'What should a job-ready project include?',
        options: [
          'Only code, no explanation',
          'README, problem statement, approach, metrics, and setup steps',
          'A copied notebook without changes',
          'Only screenshots'
        ],
        correctIndex: 1,
        explanation: 'Recruiters and interviewers need to understand your decisions and results quickly.',
        topic
      }
    ]
  };
}

export function fallbackMentorReview(): {
  feedback: string;
  weak_areas: string[];
  readiness_score: number;
  next_day_suggestions: MentorTaskSuggestion[];
} {
  return {
    feedback:
      'Aaj ka progress save ho gaya. Kal ka focus simple rakho: ek core topic, ek DSA block, aur ek short revision. Consistency yahan compounding ka kaam karegi.',
    weak_areas: ['Consistency', 'DSA practice'],
    readiness_score: 35,
    next_day_suggestions: [
      {
        title: 'Revise today ke weak points and write 5 bullet notes',
        topic: 'Revision',
        skill_area: 'Review',
        estimated_minutes: 35,
        priority: 'medium'
      },
      {
        title: 'Solve 4 DSA problems and note patterns',
        topic: 'DSA mixed practice',
        skill_area: 'DSA',
        estimated_minutes: 90,
        priority: 'high'
      },
      {
        title: 'Continue current AI/ML roadmap topic with one notebook exercise',
        topic: 'Roadmap continuation',
        skill_area: 'AI/ML',
        estimated_minutes: 90,
        priority: 'high'
      }
    ]
  };
}

export function fallbackMentorAnswer(question: string) {
  return `Is question ka short mentor answer: "${question}" ko ek small action me tod do. Pehle basics revise karo, phir 3-5 examples solve karo, aur end me apne words me explanation likho. Agar ye interview topic hai, to ek definition, ek real example, aur ek common mistake zaroor prepare karo.`;
}
