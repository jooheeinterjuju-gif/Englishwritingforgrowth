import { BadgeItem, StudentGrowthDoc } from '../types';

export interface LevelThreshold {
  level: number;
  title: string;
  minXp: number;
  maxXp: number;
  icon: string;
  desc: string;
}

export const LEVELS: LevelThreshold[] = [
  { level: 1, title: '알파벳 씨앗', minXp: 0, maxXp: 19, icon: '🌱', desc: '영어 글쓰기의 첫 발걸음을 뗀 씨앗!' },
  { level: 2, title: '영단어 새싹', minXp: 20, maxXp: 49, icon: '🌿', desc: '생각을 영어 단어로 피워내는 새싹!' },
  { level: 3, title: '영어 탐험가', minXp: 50, maxXp: 89, icon: '🧭', desc: '새로운 영어 문장을 탐험하는 여행자!' },
  { level: 4, title: '문장 마스터', minXp: 90, maxXp: 139, icon: '✍️', desc: '바른 문법으로 자신있게 쓰는 마스터!' },
  { level: 5, title: '표현 마스터', minXp: 140, maxXp: 199, icon: '🎨', desc: '다채로운 형용사와 표현을 빚어내는 작가!' },
  { level: 6, title: '스토리 작가', minXp: 200, maxXp: 279, icon: '📖', desc: '자신의 생각을 유창하게 엮어내는 작가!' },
  { level: 7, title: '우리 반 셰익스피어', minXp: 280, maxXp: 9999, icon: '👑', desc: '영어로 마음껏 날개를 펼치는 최고의 작가!' },
];

export function getLevelInfo(xp: number): LevelThreshold {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

export function getNextLevelInfo(xp: number): LevelThreshold | null {
  const current = getLevelInfo(xp);
  const next = LEVELS.find((l) => l.level === current.level + 1);
  return next || null;
}

export const ALL_BADGES: { id: string; title: string; description: string; icon: string }[] = [
  { id: 'first_writing', title: '첫 영작 완성', description: '첫 번째 영어 글쓰기를 끝까지 완성했어요!', icon: '🌟' },
  { id: 'revision_master', title: '수정의 달인', description: '피드백을 꼼꼼히 반영해 5회 이상 고쳐썼어요!', icon: '✨' },
  { id: 'steady_writer', title: '꾸준한 작가', description: '차곡차곡 3편 이상의 글을 완성했어요!', icon: '📚' },
  { id: 'rich_expression', title: '풍부한 표현력', description: 'AI 표현 확장 제안을 멋지게 글에 녹여냈어요!', icon: '🎨' },
  { id: 'book_author', title: '나만의 책 출판', description: '나만의 영작 포트폴리오 책을 만들었어요!', icon: '📖' },
  { id: 'perfect_streak', title: '열정의 작가', description: '총 50 XP 이상을 획득했어요!', icon: '🔥' },
];

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const MAX_DAILY_XP = 10;

/**
 * Calculates XP to grant while strictly respecting the 10 XP daily cap
 */
export function calculateXpGrant(
  currentGrowth: StudentGrowthDoc,
  rawPoints: number
): { grantedXp: number; updatedGrowth: StudentGrowthDoc; leveledUp: boolean; newBadge?: BadgeItem } {
  const today = getTodayDateString();
  const isNewDay = currentGrowth.lastXpDate !== today;

  const currentTodayXp = isNewDay ? 0 : currentGrowth.todayXp || 0;
  const remainingDailyCapacity = Math.max(0, MAX_DAILY_XP - currentTodayXp);
  const actualGranted = Math.min(rawPoints, remainingDailyCapacity);

  const oldTotalXp = currentGrowth.totalXp || 0;
  const newTotalXp = oldTotalXp + actualGranted;

  const oldLevel = getLevelInfo(oldTotalXp);
  const newLevel = getLevelInfo(newTotalXp);
  const leveledUp = newLevel.level > oldLevel.level;

  const updatedGrowth: StudentGrowthDoc = {
    ...currentGrowth,
    totalXp: newTotalXp,
    todayXp: currentTodayXp + actualGranted,
    lastXpDate: today,
    level: newLevel.level,
    levelTitle: newLevel.title,
    updatedAt: new Date().toISOString(),
  };

  return {
    grantedXp: actualGranted,
    updatedGrowth,
    leveledUp,
  };
}
