export type UserRole = 'student' | 'teacher';

export interface ClassDoc {
  classId: string; // e.g. "2026-1-3"
  gradeYear: string;
  grade: number;
  classNum: number;
  className: string; // e.g. "2026학년도 1학년 3반"
  classPasswordHash: string;
  studentNameDisplay: 'full' | 'masked';
  studentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudentDoc {
  studentKey: string; // e.g. "2026-1-3-05"
  classId: string;
  gradeYear: string;
  grade: number;
  classNum: number;
  studentNum: number;
  name: string;
  passwordHash: string | null;
  isPasswordSet: boolean;
  avatarId?: string;
  teacherNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyTopicDoc {
  topicId: string;
  title: string;
  englishTitle: string;
  koreanTitle: string;
  category: string;
  description: string;
  guidePrompt: string;
  recommendedVocab: string[];
  sentenceStarters: string[];
  minWords: number;
  isPublished: boolean;
  createdAt: string;
  createdBy: string;
}

export interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

export interface AiGrammarFeedback {
  praiseMessage: string;
  corrections: GrammarCorrection[];
  improvedDraft: string;
}

export interface AiExpressionSuggestion {
  targetSentence: string;
  suggestionTitle: string;
  friendlyGuide: string;
  exampleKeywords: string[];
  exampleResult: string;
}

export interface SelfAssessment {
  difficulty: 'easy' | 'moderate' | 'challenging';
  satisfaction: 'great' | 'good' | 'effort';
  reflectionComment: string;
}

export interface ProcessAssessment {
  summary: string;
  contentRating: '탁월' | '우수' | '보통';
  grammarGrowthRating: '탁월' | '우수' | '보통';
  expressionRating: '탁월' | '우수' | '보통';
  effortRating: '탁월' | '우수' | '보통';
  detailedDraft: string;
  encouragementComment: string;
}

export interface WritingRecordDoc {
  recordId: string;
  studentKey: string;
  classId: string;
  topicId: string;
  topicTitle: string;
  koreanIdea: string;
  initialDraft: string;
  aiGrammarFeedback: AiGrammarFeedback | null;
  aiExpressionSuggestion: AiExpressionSuggestion | null;
  finalWriting: string;
  selfAssessment: SelfAssessment | null;
  currentStep: number; // 1: Topic, 2: Korean Idea, 3: Initial Draft, 4: Grammar Check, 5: Expression Expansion, 6: Final Submission
  status: 'draft' | 'completed';
  xpGranted: {
    step2: boolean; // Korean idea: 1XP
    step3: boolean; // Initial draft: 2XP
    step4: boolean; // 1st grammar check: 1XP
    step5: boolean; // 2nd expression expansion: 1XP
    step6: boolean; // Final submission: 2XP
  };
  wordCount: number;
  teacherAssessment?: ProcessAssessment | null;
  teacherAssessmentApproved?: boolean;
  teacherComment?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
}

export interface BadgeItem {
  badgeId: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
}

export interface StudentGrowthDoc {
  studentKey: string;
  classId: string;
  totalXp: number;
  todayXp: number;
  lastXpDate: string; // YYYY-MM-DD
  level: number;
  levelTitle: string;
  badges: BadgeItem[];
  streakDays: number;
  completedCount: number;
  customAvatar: {
    base: string;
    hat: string;
    accessory: string;
    color: string;
  };
  favorites: string[]; // recordIds
  updatedAt: string;
}

export interface BookRecordItem {
  recordId: string;
  topicTitle: string;
  koreanIdea: string;
  initialDraft: string;
  finalWriting: string;
  submittedAt: string;
}

export interface StudentBookDoc {
  bookId: string;
  studentKey: string;
  classId: string;
  title: string;
  subtitle: string;
  authorEnglishName: string;
  authorBio: string;
  coverStyle: 'classic' | 'modern' | 'storybook' | 'notebook' | 'galaxy';
  coverColor: string;
  records: BookRecordItem[];
  pageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsDoc {
  adminPasswordHash: string;
  schoolName: string;
  isInitialized: boolean;
  updatedAt: string;
}

export interface StudentSession {
  studentKey: string;
  name: string;
  gradeYear: string;
  grade: number;
  classNum: number;
  studentNum: number;
  classId: string;
}

export interface TeacherSession {
  isLoggedIn?: boolean;
  role?: string;
  schoolName?: string;
  loginTime: string;
}

export interface VocabHint {
  korean: string;
  english: string;
  example: string;
  isTeacherRecommended?: boolean;
  synonyms?: string[];
  varietyTip?: string;
}

export interface SentencePattern {
  pattern: string;
  meaning: string;
  isTeacherStarter?: boolean;
  starterSnippet?: string;
}

export interface DiverseExpressionGroup {
  category: string;
  tip: string;
  options: { english: string; korean: string; example?: string }[];
}

export interface AiHintsResponse {
  cheeringMessage: string;
  teacherGuideNotice?: string;
  vocabHints: VocabHint[];
  sentencePatterns: SentencePattern[];
  diverseExpressions?: DiverseExpressionGroup[];
  isAmbiguous?: boolean;
  clarificationMessage?: string;
  guidingQuestions?: string[];
}
