import type { DailyTask, PrepProject, ProjectMilestone, RoadmapItem } from './types';

type RoadmapSeed = Omit<RoadmapItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
type TaskSeed = Omit<DailyTask, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
type ProjectSeed = Omit<PrepProject, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export const roadmapSeed: RoadmapSeed[] = [
  {
    month_number: 1,
    week_number: 1,
    title: 'Python foundation and Git workflow',
    skill_area: 'Python',
    description: 'Variables, functions, lists, dictionaries, files, Git, GitHub, and clean notebook habits.',
    priority: 'high',
    status: 'not_started'
  },
  {
    month_number: 1,
    week_number: 2,
    title: 'NumPy, pandas, charts, and basic SQL',
    skill_area: 'Data Handling',
    description: 'Load datasets, clean columns, group data, visualize trends, and write select/join SQL.',
    priority: 'high',
    status: 'not_started'
  },
  {
    month_number: 1,
    week_number: 3,
    title: 'Maths for ML: statistics and linear algebra',
    skill_area: 'Maths',
    description: 'Mean, variance, probability, vectors, matrices, dot product, and gradient intuition.',
    priority: 'medium',
    status: 'not_started'
  },
  {
    month_number: 1,
    week_number: 4,
    title: 'DSA base: arrays, strings, hashmaps',
    skill_area: 'DSA',
    description: 'Solve common pattern problems and write interview-style explanations in Python.',
    priority: 'high',
    status: 'not_started'
  },
  {
    month_number: 2,
    week_number: 5,
    title: 'Supervised ML with scikit-learn',
    skill_area: 'Machine Learning',
    description: 'Regression, classification, train/test split, metrics, and baseline models.',
    priority: 'high',
    status: 'not_started'
  },
  {
    month_number: 2,
    week_number: 6,
    title: 'Feature engineering and model evaluation',
    skill_area: 'Machine Learning',
    description: 'Overfitting, cross-validation, feature scaling, confusion matrix, precision, recall, and F1.',
    priority: 'high',
    status: 'not_started'
  },
  {
    month_number: 2,
    week_number: 7,
    title: 'Unsupervised learning and ML project 1',
    skill_area: 'Machine Learning',
    description: 'Clustering, dimensionality reduction basics, and one prediction project with README.',
    priority: 'medium',
    status: 'not_started'
  },
  {
    month_number: 2,
    week_number: 8,
    title: 'DSA: recursion, sorting, linked list',
    skill_area: 'DSA',
    description: 'Recursive thinking, two-pointer variations, custom sorting, and linked list operations.',
    priority: 'high',
    status: 'not_started'
  },
  {
    month_number: 3,
    week_number: 9,
    title: 'PyTorch and neural network basics',
    skill_area: 'Deep Learning',
    description: 'Tensors, modules, loss functions, optimizers, and training loops.',
    priority: 'high',
    status: 'not_started'
  },
  {
    month_number: 3,
    week_number: 10,
    title: 'CNN and image classification project',
    skill_area: 'Deep Learning',
    description: 'Convolutions, pooling, augmentation basics, and a deployable image model notebook.',
    priority: 'medium',
    status: 'not_started'
  },
  {
    month_number: 3,
    week_number: 11,
    title: 'NLP basics and embeddings',
    skill_area: 'NLP',
    description: 'Text cleaning, tokenization, TF-IDF, word embeddings, and sentiment classification.',
    priority: 'high',
    status: 'not_started'
  },
  {
    month_number: 3,
    week_number: 12,
    title: 'DSA: stack, queue, trees, graphs',
    skill_area: 'DSA',
    description: 'BFS, DFS, binary tree traversals, graph traversal, and interview dry runs.',
    priority: 'high',
    status: 'not_started'
  },
  {
    month_number: 4,
    week_number: 13,
    title: 'Transformers and LLM fundamentals',
    skill_area: 'GenAI',
    description: 'Attention intuition, transformer blocks, prompt patterns, hallucination risks, and evaluation.',
    priority: 'high',
    status: 'not_started'
  },
  {
    month_number: 4,
    week_number: 14,
    title: 'RAG app with vector search',
    skill_area: 'GenAI',
    description: 'Chunking, embeddings, vector database, retrieval, grounded answers, and citations.',
    priority: 'high',
    status: 'not_started'
  },
  {
    month_number: 4,
    week_number: 15,
    title: 'FastAPI deployment and project polish',
    skill_area: 'MLOps',
    description: 'Model/API serving, Docker basics, README, demo video, and resume-ready project proof.',
    priority: 'medium',
    status: 'not_started'
  },
  {
    month_number: 4,
    week_number: 16,
    title: 'Mock interviews and job applications',
    skill_area: 'Interview',
    description: 'ML/DL/GenAI revision, DSA mixed practice, project storytelling, resume, and referrals.',
    priority: 'high',
    status: 'not_started'
  }
];

export const projectSeed: ProjectSeed[] = [
  {
    name: 'ML Prediction Project',
    project_type: 'Machine Learning',
    description: 'A clean supervised ML project with data cleaning, feature engineering, metrics, and README.',
    milestones: [
      { title: 'Choose dataset and problem statement', done: false },
      { title: 'Build baseline model and metrics', done: false },
      { title: 'Improve features and compare models', done: false },
      { title: 'Publish GitHub README with screenshots', done: false }
    ] satisfies ProjectMilestone[],
    status: 'not_started',
    github_url: null,
    deploy_url: null
  },
  {
    name: 'Deep Learning or NLP Project',
    project_type: 'Deep Learning',
    description: 'A PyTorch project such as sentiment analysis, image classification, or text classifier.',
    milestones: [
      { title: 'Prepare dataset and dataloaders', done: false },
      { title: 'Train first PyTorch model', done: false },
      { title: 'Evaluate errors and improve model', done: false },
      { title: 'Write project explanation for interviews', done: false }
    ],
    status: 'not_started',
    github_url: null,
    deploy_url: null
  },
  {
    name: 'GenAI RAG Mentor App',
    project_type: 'Generative AI',
    description: 'A PDF chatbot or resume analyzer using embeddings, retrieval, and a FastAPI backend.',
    milestones: [
      { title: 'Create document upload and chunking flow', done: false },
      { title: 'Add embeddings and vector search', done: false },
      { title: 'Generate grounded answers with citations', done: false },
      { title: 'Deploy API and add demo link', done: false }
    ],
    status: 'not_started',
    github_url: null,
    deploy_url: null
  }
];

export function starterTasks(taskDate: string): TaskSeed[] {
  return [
    {
      task_date: taskDate,
      title: 'Python basics revision and 20 practice snippets',
      topic: 'Python fundamentals',
      skill_area: 'Python',
      estimated_minutes: 90,
      priority: 'high',
      status: 'planned',
      source: 'system'
    },
    {
      task_date: taskDate,
      title: 'Solve 5 array/string DSA problems',
      topic: 'Arrays and strings',
      skill_area: 'DSA',
      estimated_minutes: 90,
      priority: 'high',
      status: 'planned',
      source: 'system'
    },
    {
      task_date: taskDate,
      title: 'Study NumPy arrays and pandas DataFrame basics',
      topic: 'Data handling',
      skill_area: 'Data Handling',
      estimated_minutes: 75,
      priority: 'medium',
      status: 'planned',
      source: 'system'
    },
    {
      task_date: taskDate,
      title: 'Write today reflection and blockers',
      topic: 'Accountability',
      skill_area: 'Review',
      estimated_minutes: 20,
      priority: 'low',
      status: 'planned',
      source: 'system'
    }
  ];
}
