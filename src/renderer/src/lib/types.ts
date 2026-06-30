export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'planned' | 'done' | 'skipped';
export type RoadmapStatus = 'not_started' | 'in_progress' | 'done' | 'skipped';
export type ProjectStatus = 'not_started' | 'in_progress' | 'done';
export type Difficulty = 'easy' | 'medium' | 'hard';

export type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  target_role: string;
  daily_hours: number;
  timeline_months: number;
  mentor_language: string;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
};

export type RoadmapItem = {
  id: string;
  user_id: string;
  month_number: number;
  week_number: number;
  title: string;
  skill_area: string;
  description: string;
  priority: Priority;
  status: RoadmapStatus;
  created_at?: string;
  updated_at?: string;
};

export type DailyTask = {
  id: string;
  user_id: string;
  task_date: string;
  title: string;
  topic: string;
  skill_area: string;
  estimated_minutes: number;
  priority: Priority;
  status: TaskStatus;
  source: 'system' | 'mentor' | 'manual';
  created_at?: string;
  updated_at?: string;
};

export type DailyLog = {
  id: string;
  user_id: string;
  log_date: string;
  study_minutes: number;
  notes: string | null;
  blockers: string | null;
  completion_summary: string | null;
  created_at?: string;
  updated_at?: string;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic?: string;
};

export type Quiz = {
  id: string;
  user_id: string;
  title: string;
  topic: string;
  difficulty: Difficulty;
  questions: QuizQuestion[];
  created_at: string;
  updated_at?: string;
};

export type QuizAttempt = {
  id: string;
  user_id: string;
  quiz_id: string;
  selected_answers: Record<string, number>;
  wrong_topics: string[];
  score: number;
  total: number;
  explanations: string[];
  created_at: string;
};

export type MentorTaskSuggestion = {
  title: string;
  topic: string;
  skill_area: string;
  estimated_minutes: number;
  priority: Priority;
};

export type MentorReview = {
  id: string;
  user_id: string;
  review_date: string;
  feedback: string;
  weak_areas: string[];
  next_day_suggestions: MentorTaskSuggestion[];
  readiness_score: number;
  created_at?: string;
  updated_at?: string;
};

export type MentorQuestion = {
  id: string;
  user_id: string;
  question: string;
  answer: string;
  context_snapshot: Record<string, unknown>;
  created_at: string;
};

export type ProjectMilestone = {
  title: string;
  done: boolean;
};

export type PrepProject = {
  id: string;
  user_id: string;
  name: string;
  project_type: string;
  description: string;
  milestones: ProjectMilestone[];
  status: ProjectStatus;
  github_url: string | null;
  deploy_url: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AppData = {
  roadmap: RoadmapItem[];
  tasks: DailyTask[];
  logs: DailyLog[];
  quizzes: Quiz[];
  attempts: QuizAttempt[];
  reviews: MentorReview[];
  mentorQuestions: MentorQuestion[];
  projects: PrepProject[];
};
