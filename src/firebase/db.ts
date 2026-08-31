import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import {
  ClassDoc,
  StudentDoc,
  DailyTopicDoc,
  WritingRecordDoc,
  StudentGrowthDoc,
  StudentBookDoc,
  SettingsDoc,
  BadgeItem,
} from '../types';
import { getLevelInfo, getTodayDateString } from '../utils/gamification';

// Collections constants
export const COLLECTIONS = {
  CLASSES: 'classes',
  STUDENTS: 'students',
  DAILY_TOPICS: 'dailyTopics',
  WRITING_RECORDS: 'writingRecords',
  STUDENT_GROWTH: 'studentGrowth',
  STUDENT_BOOKS: 'studentBooks',
  SETTINGS: 'settings',
};

// 1. Settings & Admin
export async function getSystemSettings(): Promise<SettingsDoc | null> {
  try {
    const ref = doc(db, COLLECTIONS.SETTINGS, 'global');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as SettingsDoc;
    }
    return null;
  } catch (error) {
    console.error('getSystemSettings error:', error);
    return null;
  }
}

export async function saveSystemSettings(settings: Partial<SettingsDoc>): Promise<void> {
  const ref = doc(db, COLLECTIONS.SETTINGS, 'global');
  await setDoc(ref, { ...settings, updatedAt: new Date().toISOString() }, { merge: true });
}

// 2. Classes
export async function getClasses(): Promise<ClassDoc[]> {
  try {
    const ref = collection(db, COLLECTIONS.CLASSES);
    const snap = await getDocs(ref);
    return snap.docs.map((d) => d.data() as ClassDoc);
  } catch (error) {
    console.error('getClasses error:', error);
    return [];
  }
}

export async function getClassById(classId: string): Promise<ClassDoc | null> {
  try {
    const ref = doc(db, COLLECTIONS.CLASSES, classId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as ClassDoc;
    }
    return null;
  } catch (error) {
    console.error('getClassById error:', error);
    return null;
  }
}

export async function saveClass(classData: ClassDoc): Promise<void> {
  const ref = doc(db, COLLECTIONS.CLASSES, classData.classId);
  await setDoc(ref, { ...classData, updatedAt: new Date().toISOString() }, { merge: true });
}

// 3. Students
export async function getStudentsByClass(classId: string): Promise<StudentDoc[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.STUDENTS),
      where('classId', '==', classId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as StudentDoc);
    return list.sort((a, b) => a.studentNum - b.studentNum);
  } catch (error) {
    console.error('getStudentsByClass error:', error);
    return [];
  }
}

export async function getStudentByKey(studentKey: string): Promise<StudentDoc | null> {
  try {
    const ref = doc(db, COLLECTIONS.STUDENTS, studentKey);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as StudentDoc;
    }
    return null;
  } catch (error) {
    console.error('getStudentByKey error:', error);
    return null;
  }
}

export async function saveStudent(student: StudentDoc): Promise<void> {
  const ref = doc(db, COLLECTIONS.STUDENTS, student.studentKey);
  await setDoc(ref, { ...student, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function batchSaveStudents(students: StudentDoc[]): Promise<void> {
  const batch = writeBatch(db);
  for (const s of students) {
    const ref = doc(db, COLLECTIONS.STUDENTS, s.studentKey);
    batch.set(ref, { ...s, updatedAt: new Date().toISOString() }, { merge: true });
  }
  await batch.commit();
}

// 4. Daily Topics
export async function getDailyTopics(onlyPublished: boolean = true): Promise<DailyTopicDoc[]> {
  try {
    const ref = collection(db, COLLECTIONS.DAILY_TOPICS);
    const snap = await getDocs(ref);
    let list = snap.docs.map((d) => d.data() as DailyTopicDoc);
    if (onlyPublished) {
      list = list.filter((t) => t.isPublished);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('getDailyTopics error:', error);
    return [];
  }
}

export async function getTopicById(topicId: string): Promise<DailyTopicDoc | null> {
  try {
    const ref = doc(db, COLLECTIONS.DAILY_TOPICS, topicId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as DailyTopicDoc;
    }
    return null;
  } catch (error) {
    console.error('getTopicById error:', error);
    return null;
  }
}

export async function saveTopic(topic: DailyTopicDoc): Promise<void> {
  const ref = doc(db, COLLECTIONS.DAILY_TOPICS, topic.topicId);
  await setDoc(ref, topic, { merge: true });
}

export async function deleteTopic(topicId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.DAILY_TOPICS, topicId);
  await deleteDoc(ref);
}

// 5. Writing Records
export async function getWritingRecordsByStudent(studentKey: string): Promise<WritingRecordDoc[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.WRITING_RECORDS),
      where('studentKey', '==', studentKey)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as WritingRecordDoc);
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error) {
    console.error('getWritingRecordsByStudent error:', error);
    return [];
  }
}

export async function getWritingRecordsByClass(classId: string): Promise<WritingRecordDoc[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.WRITING_RECORDS),
      where('classId', '==', classId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as WritingRecordDoc);
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error) {
    console.error('getWritingRecordsByClass error:', error);
    return [];
  }
}

export async function getWritingRecord(recordId: string): Promise<WritingRecordDoc | null> {
  try {
    const ref = doc(db, COLLECTIONS.WRITING_RECORDS, recordId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as WritingRecordDoc;
    }
    return null;
  } catch (error) {
    console.error('getWritingRecord error:', error);
    return null;
  }
}

export async function saveWritingRecord(record: WritingRecordDoc): Promise<void> {
  const ref = doc(db, COLLECTIONS.WRITING_RECORDS, record.recordId);
  await setDoc(ref, { ...record, updatedAt: new Date().toISOString() }, { merge: true });
}

// 6. Student Growth & Gamification
export async function getStudentGrowth(studentKey: string, classId: string): Promise<StudentGrowthDoc> {
  try {
    const ref = doc(db, COLLECTIONS.STUDENT_GROWTH, studentKey);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as StudentGrowthDoc;
    }
  } catch (error) {
    console.error('getStudentGrowth error:', error);
  }

  // Default initial growth profile
  const initialGrowth: StudentGrowthDoc = {
    studentKey,
    classId,
    totalXp: 0,
    todayXp: 0,
    lastXpDate: getTodayDateString(),
    level: 1,
    levelTitle: '알파벳 씨앗',
    badges: [],
    streakDays: 1,
    completedCount: 0,
    customAvatar: {
      base: 'bear',
      hat: 'none',
      accessory: 'pencil',
      color: 'amber',
    },
    favorites: [],
    updatedAt: new Date().toISOString(),
  };

  try {
    const ref = doc(db, COLLECTIONS.STUDENT_GROWTH, studentKey);
    await setDoc(ref, initialGrowth);
  } catch (e) {
    console.warn('Initial growth creation deferred:', e);
  }

  return initialGrowth;
}

export async function saveStudentGrowth(growth: StudentGrowthDoc): Promise<void> {
  const ref = doc(db, COLLECTIONS.STUDENT_GROWTH, growth.studentKey);
  await setDoc(ref, { ...growth, updatedAt: new Date().toISOString() }, { merge: true });
}

// 7. Student Books (Portfolio)
export async function getStudentBooks(studentKey: string): Promise<StudentBookDoc[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.STUDENT_BOOKS),
      where('studentKey', '==', studentKey)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as StudentBookDoc);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('getStudentBooks error:', error);
    return [];
  }
}

export async function saveStudentBook(book: StudentBookDoc): Promise<void> {
  const ref = doc(db, COLLECTIONS.STUDENT_BOOKS, book.bookId);
  await setDoc(ref, { ...book, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function deleteStudentBook(bookId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.STUDENT_BOOKS, bookId);
  await deleteDoc(ref);
}

// 8. Default Seeds & Diagnostics
export async function initializeDefaultTopicsIfEmpty(): Promise<void> {
  try {
    const topics = await getDailyTopics(false);
    if (topics.length > 0) return;

    const sampleTopics: DailyTopicDoc[] = [
      {
        topicId: 'topic-my-dream',
        title: 'My Dream / 나의 꿈과 미래의 모습',
        englishTitle: 'My Dream for the Future',
        koreanTitle: '나의 꿈과 미래의 모습',
        category: 'Future',
        description: '내가 미래에 되고 싶은 사람이나 꿈꾸는 미래의 하루를 소개해 보세요.',
        guidePrompt: '1. 미래에 어떤 일을 하고 싶나요?\n2. 왜 그 꿈을 가지게 되었나요?\n3. 그 꿈을 위해 지금 무엇을 노력하고 있나요?',
        recommendedVocab: ['dream(꿈)', 'future(미래)', 'become(되다)', 'help(돕다)', 'study hard(열심히 공부하다)'],
        sentenceStarters: ['My dream is to be a...', 'I want to help...', 'In the future, I will...'],
        minWords: 20,
        isPublished: true,
        createdAt: new Date().toISOString(),
        createdBy: '교사용 기본 주제',
      },
      {
        topicId: 'topic-favorite-season',
        title: 'My Favorite Season / 내가 가장 좋아하는 계절',
        englishTitle: 'My Favorite Season and Why',
        koreanTitle: '내가 가장 좋아하는 계절과 그 이유',
        category: 'Daily Life',
        description: '사계절 중 내가 가장 사랑하는 계절과 그 계절에 즐기는 활동을 적어보세요.',
        guidePrompt: '1. 봄/여름/가을/겨울 중 어떤 계절을 가장 좋아하나요?\n2. 그 계절의 날씨나 풍경은 어떤가요?\n3. 그 계절에 친구나 가족과 무엇을 하나요?',
        recommendedVocab: ['spring(봄)', 'summer(여름)', 'autumn(가을)', 'winter(겨울)', 'weather(날씨)', 'delicious(맛있는)'],
        sentenceStarters: ['My favorite season is...', 'The weather is...', 'I like to... with my friends.'],
        minWords: 20,
        isPublished: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        createdBy: '교사용 기본 주제',
      },
      {
        topicId: 'topic-special-hobby',
        title: 'My Special Hobby / 나의 특별한 취미 소개하기',
        englishTitle: 'My Favorite Hobby',
        koreanTitle: '나를 행복하게 만드는 취미 활동',
        category: 'Hobby',
        description: '방과 후나 주말에 시간 가는 줄 모르고 즐기는 나만의 취미를 영어로 표현해 보세요.',
        guidePrompt: '1. 취미가 무엇인가요? (운동, 그림, 게임, 요리, 독서 등)\n2. 언제, 어디서 그 취미를 즐기나요?\n3. 그 취미를 할 때 기분이 어떤가요?',
        recommendedVocab: ['hobby(취미)', 'play(하다)', 'draw(그리다)', 'feel happy(행복을 느끼다)', 'relaxing(편안한)'],
        sentenceStarters: ['My hobby is...', 'When I have free time, I...', 'It makes me feel...'],
        minWords: 20,
        isPublished: true,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        createdBy: '교사용 기본 주제',
      }
    ];

    for (const t of sampleTopics) {
      await saveTopic(t);
    }
  } catch (error) {
    console.error('initializeDefaultTopicsIfEmpty error:', error);
  }
}

// Diagnostics helper
export async function testFirestoreConnection(): Promise<{ success: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  const testDocId = `test-${Date.now()}`;
  try {
    const testRef = doc(db, 'settings', testDocId);
    await setDoc(testRef, { test: true, timestamp: serverTimestamp() });
    const snap = await getDoc(testRef);
    if (!snap.exists()) throw new Error('Firestore document write verification failed.');
    await deleteDoc(testRef);
    return { success: true, latencyMs: Date.now() - start };
  } catch (error: any) {
    return { success: false, latencyMs: Date.now() - start, error: error?.message || String(error) };
  }
}
