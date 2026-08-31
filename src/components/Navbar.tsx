import React from 'react';
import { BookOpen, Award, PenTool, LayoutDashboard, Settings, LogOut, Sparkles, BookMarked, UserCheck, Shield } from 'lucide-react';
import { StudentSession, StudentGrowthDoc, UserRole } from '../types';
import { getLevelInfo, MAX_DAILY_XP } from '../utils/gamification';

interface NavbarProps {
  role: UserRole;
  studentSession: StudentSession | null;
  studentGrowth: StudentGrowthDoc | null;
  currentTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  onSwitchRole: (role: UserRole) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  role,
  studentSession,
  studentGrowth,
  currentTab,
  onTabChange,
  onLogout,
  onSwitchRole,
}) => {
  const levelInfo = studentGrowth ? getLevelInfo(studentGrowth.totalXp) : null;

  return (
    <header className="sticky top-0 z-40 bg-[#FDFCF0]/95 backdrop-blur border-b border-[#E5E1D5] shadow-xs print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => onTabChange(role === 'student' ? 'dashboard' : 'classes')}
          >
            <div className="w-10 h-10 rounded-xl bg-[#889E73] flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-[#4A4A3A] tracking-tight">AI 단계별 영작 성장</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#EBF0E5] text-[#4F6839] border border-[#D5E0CC]">
                  중1 맞춤
                </span>
              </div>
              <p className="text-xs text-[#787664] hidden sm:block">한글 생각에서 완성도 높은 영어 포트폴리오까지</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {role === 'student' && studentSession && (
              <>
                <button
                  onClick={() => onTabChange('dashboard')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'dashboard'
                      ? 'bg-[#EBF0E5] text-[#4F6839] font-semibold'
                      : 'text-[#787664] hover:text-[#4A4A3A] hover:bg-[#F5F2ED]'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden md:inline">홈</span>
                </button>

                <button
                  onClick={() => onTabChange('write')}
                  className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'write'
                      ? 'bg-[#889E73] text-white font-semibold shadow-xs'
                      : 'text-[#4F6839] bg-[#EBF0E5]/80 hover:bg-[#EBF0E5]'
                  }`}
                >
                  <PenTool className="w-4 h-4" />
                  <span>영작하기</span>
                </button>

                <button
                  onClick={() => onTabChange('my-writings')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'my-writings'
                      ? 'bg-[#EBF0E5] text-[#4F6839] font-semibold'
                      : 'text-[#787664] hover:text-[#4A4A3A] hover:bg-[#F5F2ED]'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">나의 글</span>
                </button>

                <button
                  onClick={() => onTabChange('books')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'books'
                      ? 'bg-[#EBF0E5] text-[#4F6839] font-semibold'
                      : 'text-[#787664] hover:text-[#4A4A3A] hover:bg-[#F5F2ED]'
                  }`}
                >
                  <BookMarked className="w-4 h-4" />
                  <span className="hidden sm:inline">나의 책장</span>
                </button>

                <button
                  onClick={() => onTabChange('growth')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'growth'
                      ? 'bg-[#EBF0E5] text-[#4F6839] font-semibold'
                      : 'text-[#787664] hover:text-[#4A4A3A] hover:bg-[#F5F2ED]'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span className="hidden md:inline">성장 기록</span>
                </button>
              </>
            )}

            {role === 'teacher' && (
              <>
                <button
                  onClick={() => onTabChange('classes')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'classes'
                      ? 'bg-[#EBF0E5] text-[#4F6839] font-semibold'
                      : 'text-[#787664] hover:text-[#4A4A3A] hover:bg-[#F5F2ED]'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>학급/학생 관리</span>
                </button>

                <button
                  onClick={() => onTabChange('topics')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'topics'
                      ? 'bg-[#EBF0E5] text-[#4F6839] font-semibold'
                      : 'text-[#787664] hover:text-[#4A4A3A] hover:bg-[#F5F2ED]'
                  }`}
                >
                  <PenTool className="w-4 h-4" />
                  <span>주제 관리</span>
                </button>

                <button
                  onClick={() => onTabChange('assessments')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'assessments'
                      ? 'bg-[#EBF0E5] text-[#4F6839] font-semibold'
                      : 'text-[#787664] hover:text-[#4A4A3A] hover:bg-[#F5F2ED]'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>과정중심평가</span>
                </button>

                <button
                  onClick={() => onTabChange('settings')}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'settings'
                      ? 'bg-[#EBF0E5] text-[#4F6839] font-semibold'
                      : 'text-[#787664] hover:text-[#4A4A3A] hover:bg-[#F5F2ED]'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>시스템/진단</span>
                </button>
              </>
            )}
          </nav>

          {/* Right Status / Actions */}
          <div className="flex items-center space-x-3">
            {role === 'student' && studentSession && studentGrowth && levelInfo && (
              <div className="hidden lg:flex items-center bg-[#F5F2ED] rounded-full px-3 py-1 border border-[#E5E1D5] text-xs">
                <span className="mr-1 text-base">{levelInfo.icon}</span>
                <span className="font-semibold text-[#4A4A3A] mr-2">Lv.{levelInfo.level} {levelInfo.title}</span>
                <span className="text-[#889E73] font-bold mr-2">{studentGrowth.totalXp} XP</span>
                <span className="text-[#D8D3C4]">|</span>
                <span className="ml-2 text-[#787664]">오늘: {studentGrowth.todayXp}/{MAX_DAILY_XP}XP</span>
              </div>
            )}

            {role === 'student' && studentSession ? (
              <div className="flex items-center space-x-2">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-[#4A4A3A]">{studentSession.name}</p>
                  <p className="text-[11px] text-[#787664]">
                    {studentSession.gradeYear}년 {studentSession.grade}학년 {studentSession.classNum}반 {studentSession.studentNum}번
                  </p>
                </div>
                <button
                  onClick={onLogout}
                  title="로그아웃"
                  className="p-2 text-[#787664] hover:text-[#4A4A3A] hover:bg-[#F5F2ED] rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : role === 'teacher' ? (
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[#FAF0EC] text-[#A75336] border border-[#F2D5CB]">
                  <Shield className="w-3.5 h-3.5 mr-1" />
                  교사 관리자
                </span>
                <button
                  onClick={onLogout}
                  title="로그아웃"
                  className="p-2 text-[#787664] hover:text-[#4A4A3A] hover:bg-[#F5F2ED] rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onSwitchRole('teacher')}
                  className="text-xs font-medium text-[#787664] hover:text-[#889E73] px-2 py-1 rounded hover:bg-[#F5F2ED] transition-colors"
                >
                  교사 로그인
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
