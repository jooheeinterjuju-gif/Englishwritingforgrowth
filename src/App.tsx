import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StudentAuth } from './components/StudentAuth';
import { TeacherAuth } from './components/TeacherAuth';
import { StudentDashboard } from './components/StudentDashboard';
import { WritingStudio } from './components/WritingStudio';
import { MyWritings } from './components/MyWritings';
import { BookPortfolio } from './components/BookPortfolio';
import { GrowthRoom } from './components/GrowthRoom';
import { TeacherDashboard } from './components/TeacherDashboard';
import {
  StudentSession,
  TeacherSession,
  StudentGrowthDoc,
  DailyTopicDoc,
  WritingRecordDoc,
  StudentBookDoc,
} from './types';
import {
  getDailyTopics,
  getStudentGrowth,
  getWritingRecordsByStudent,
  getStudentBooks,
  initializeDefaultTopicsIfEmpty,
} from './firebase/db';

export function App() {
  // Session States
  const [studentSession, setStudentSession] = useState<StudentSession | null>(() => {
    const saved = localStorage.getItem('ss_student_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [teacherSession, setTeacherSession] = useState<TeacherSession | null>(() => {
    const saved = sessionStorage.getItem('ss_teacher_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [authMode, setAuthMode] = useState<'student' | 'teacher'>('student');

  // Navigation Tabs
  // Student Tabs: 'dashboard' | 'write' | 'my-writings' | 'growth' | 'books'
  // Teacher Tabs: 'classes' | 'topics' | 'assessments' | 'settings'
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Writing Studio target props
  const [targetTopicId, setTargetTopicId] = useState<string | undefined>(undefined);
  const [targetRecordId, setTargetRecordId] = useState<string | undefined>(undefined);

  // Student Data cache
  const [studentGrowth, setStudentGrowth] = useState<StudentGrowthDoc | null>(null);
  const [dailyTopics, setDailyTopics] = useState<DailyTopicDoc[]>([]);
  const [writingRecords, setWritingRecords] = useState<WritingRecordDoc[]>([]);
  const [studentBooks, setStudentBooks] = useState<StudentBookDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Initial Load & Topics bootstrap
  useEffect(() => {
    const init = async () => {
      try {
        await initializeDefaultTopicsIfEmpty();
        const topics = await getDailyTopics(true);
        setDailyTopics(topics);
      } catch (err) {
        console.error('Init error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Fetch Student Data when student session active
  useEffect(() => {
    if (studentSession) {
      loadStudentData(studentSession);
    }
  }, [studentSession]);

  const loadStudentData = async (session: StudentSession) => {
    try {
      const [growth, records, books, topics] = await Promise.all([
        getStudentGrowth(session.studentKey, session.classId),
        getWritingRecordsByStudent(session.studentKey),
        getStudentBooks(session.studentKey),
        getDailyTopics(true),
      ]);
      setStudentGrowth(growth);
      setWritingRecords(records);
      setStudentBooks(books);
      setDailyTopics(topics);
    } catch (e) {
      console.error('Error loading student data:', e);
    }
  };

  // Auth Handlers
  const handleStudentLoginSuccess = (session: StudentSession) => {
    setStudentSession(session);
    setTeacherSession(null);
    localStorage.setItem('ss_student_session', JSON.stringify(session));
    setCurrentTab('dashboard');
    loadStudentData(session);
  };

  const handleTeacherLoginSuccess = (session: TeacherSession) => {
    setTeacherSession(session);
    setStudentSession(null);
    sessionStorage.setItem('ss_teacher_session', JSON.stringify(session));
    setCurrentTab('classes');
  };

  const handleLogout = () => {
    setStudentSession(null);
    setTeacherSession(null);
    localStorage.removeItem('ss_student_session');
    sessionStorage.removeItem('ss_teacher_session');
    setStudentGrowth(null);
    setWritingRecords([]);
    setStudentBooks([]);
    setTargetTopicId(undefined);
    setTargetRecordId(undefined);
    setCurrentTab('dashboard');
  };

  const handleStartWriting = (topicId?: string, recordId?: string) => {
    setTargetTopicId(topicId);
    setTargetRecordId(recordId);
    setCurrentTab('write');
  };

  const handleWritingCompleted = () => {
    if (studentSession) {
      loadStudentData(studentSession);
    }
    setCurrentTab('my-writings');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCF0] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#889E73] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-[#787664]">AI 영어 글쓰기 스튜디오를 준비하고 있습니다...</p>
        </div>
      </div>
    );
  }

  // Not Logged In View
  if (!studentSession && !teacherSession) {
    return (
      <div className="min-h-screen bg-[#FDFCF0] flex flex-col justify-between">
        {/* Top Header */}
        <header className="bg-[#FDFCF0] border-b border-[#E5E1D5] py-4 px-6 shadow-xs">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-[#889E73] flex items-center justify-center text-white font-black text-lg shadow-xs">
                AI
              </div>
              <div>
                <h1 className="text-base font-extrabold text-[#4A4A3A] tracking-tight">
                  단계별 영어 글쓰기 성장 스튜디오
                </h1>
                <p className="text-[11px] text-[#787664]">중학교 1학년 학생 맞춤형 AI 영작 학습 플랫폼</p>
              </div>
            </div>

            {/* Switch Mode Toggle */}
            <div className="flex bg-[#F5F2ED] p-1 rounded-xl border border-[#E5E1D5]">
              <button
                onClick={() => setAuthMode('student')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  authMode === 'student'
                    ? 'bg-white text-[#4F6839] shadow-xs'
                    : 'text-[#787664] hover:text-[#4A4A3A]'
                }`}
              >
                학생 로그인
              </button>
              <button
                onClick={() => setAuthMode('teacher')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  authMode === 'teacher'
                    ? 'bg-white text-[#4F6839] shadow-xs'
                    : 'text-[#787664] hover:text-[#4A4A3A]'
                }`}
              >
                선생님 관리관
              </button>
            </div>
          </div>
        </header>

        {/* Auth Forms */}
        <main className="flex-1 flex items-center justify-center p-4">
          {authMode === 'student' ? (
            <StudentAuth
              onLoginSuccess={handleStudentLoginSuccess}
              onSwitchToTeacher={() => setAuthMode('teacher')}
            />
          ) : (
            <TeacherAuth
              onLoginSuccess={() => {
                const session: TeacherSession = {
                  role: 'teacher',
                  schoolName: '우리중학교',
                  loginTime: new Date().toISOString(),
                };
                handleTeacherLoginSuccess(session);
              }}
              onSwitchToStudent={() => setAuthMode('student')}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="py-4 text-center text-xs text-[#787664] border-t border-[#E5E1D5] bg-[#FDFCF0]">
          <p>© 2026 중학교 1학년 영어과 과정중심평가 연계 AI 영작 성장 프로그램</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF0] text-[#4A4A3A] flex flex-col justify-between">
      {/* Global Navbar */}
      <Navbar
        role={studentSession ? 'student' : 'teacher'}
        studentSession={studentSession}
        studentGrowth={studentGrowth}
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onLogout={handleLogout}
        onSwitchRole={(r) => {
          if (r === 'teacher') {
            setAuthMode('teacher');
            setStudentSession(null);
            localStorage.removeItem('ss_student_session');
          }
        }}
      />

      {/* Main Content Areas */}
      <main className="flex-1">
        {/* STUDENT VIEWS */}
        {studentSession && studentGrowth && (
          <>
            {currentTab === 'dashboard' && (
              <StudentDashboard
                studentSession={studentSession}
                studentGrowth={studentGrowth}
                dailyTopics={dailyTopics}
                recentRecords={writingRecords}
                onStartWriting={handleStartWriting}
                onNavigateTab={setCurrentTab}
              />
            )}

            {currentTab === 'write' && (
              <WritingStudio
                studentSession={studentSession}
                studentGrowth={studentGrowth}
                activeTopicId={targetTopicId}
                activeRecordId={targetRecordId}
                onGrowthUpdate={(newGrowth) => setStudentGrowth(newGrowth)}
                onComplete={handleWritingCompleted}
                onCancel={() => setCurrentTab('dashboard')}
              />
            )}

            {currentTab === 'my-writings' && (
              <MyWritings
                records={writingRecords}
                onContinueWriting={handleStartWriting}
                onNavigateToBooks={() => setCurrentTab('books')}
              />
            )}

            {currentTab === 'growth' && (
              <GrowthRoom
                studentSession={studentSession}
                studentGrowth={studentGrowth}
                onGrowthUpdate={(updated) => setStudentGrowth(updated)}
              />
            )}

            {currentTab === 'books' && (
              <BookPortfolio
                studentSession={studentSession}
                studentGrowth={studentGrowth}
                completedRecords={writingRecords.filter((r) => r.status === 'completed')}
                books={studentBooks}
                onBooksUpdate={(updated) => setStudentBooks(updated)}
                onGrowthUpdate={(updated) => setStudentGrowth(updated)}
              />
            )}
          </>
        )}

        {/* TEACHER VIEWS */}
        {teacherSession && (
          <TeacherDashboard currentTab={currentTab} onTabChange={setCurrentTab} />
        )}
      </main>

      {/* Footer (Hidden when printing A4 book) */}
      <footer className="print:hidden py-6 text-center text-xs text-[#787664] border-t border-[#E5E1D5] bg-[#FDFCF0] mt-12">
        <p>© 2026 중학교 1학년 영어과 과정중심평가 연계 AI 영작 성장 프로그램 | Natural Tones Studio</p>
      </footer>
    </div>
  );
}

export default App;
