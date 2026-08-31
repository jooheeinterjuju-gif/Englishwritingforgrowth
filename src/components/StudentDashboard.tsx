import React from 'react';
import { Sparkles, PenTool, BookOpen, BookMarked, Award, ArrowRight, CheckCircle2, Clock, Flame, ChevronRight, FileText } from 'lucide-react';
import { StudentSession, StudentGrowthDoc, DailyTopicDoc, WritingRecordDoc } from '../types';
import { getLevelInfo, getNextLevelInfo, MAX_DAILY_XP } from '../utils/gamification';

interface StudentDashboardProps {
  studentSession: StudentSession;
  studentGrowth: StudentGrowthDoc;
  dailyTopics: DailyTopicDoc[];
  recentRecords: WritingRecordDoc[];
  onStartWriting: (topicId?: string, recordId?: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  studentSession,
  studentGrowth,
  dailyTopics,
  recentRecords,
  onStartWriting,
  onNavigateTab,
}) => {
  const levelInfo = getLevelInfo(studentGrowth.totalXp);
  const nextLevel = getNextLevelInfo(studentGrowth.totalXp);

  const xpCurrentLevel = studentGrowth.totalXp - levelInfo.minXp;
  const xpNeededNext = nextLevel ? nextLevel.minXp - levelInfo.minXp : 100;
  const progressPercent = nextLevel
    ? Math.min(100, Math.max(0, Math.round((xpCurrentLevel / xpNeededNext) * 100)))
    : 100;

  const todayMissionTopic = dailyTopics.length > 0 ? dailyTopics[0] : null;
  const completedCount = recentRecords.filter((r) => r.status === 'completed').length;
  const draftRecord = recentRecords.find((r) => r.status === 'draft');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-[#889E73] rounded-3xl p-6 sm:p-8 text-white shadow-sm border border-[#748B5F]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs font-semibold">
                {studentSession.gradeYear}학년도 {studentSession.grade}학년 {studentSession.classNum}반 {studentSession.studentNum}번
              </span>
              <span className="px-2.5 py-0.5 bg-[#E8C07D] text-[#4A4A3A] rounded-full text-xs font-bold flex items-center shadow-2xs">
                <Flame className="w-3.5 h-3.5 mr-1 text-[#D98E73]" />
                {studentGrowth.streakDays}일 연속 글쓰기
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              반가워요, {studentSession.name} 작가님! ✨
            </h2>
            <p className="text-sm text-[#FDFCF0]/90 max-w-xl">
              한글로 생각을 먼저 떠올리면 영어 글쓰기가 쉬워집니다. 오늘 하루도 10XP 목표를 향해 달려볼까요?
            </p>
          </div>

          {/* Quick CTA */}
          <div className="shrink-0 flex flex-col sm:flex-row gap-3">
            {draftRecord ? (
              <button
                onClick={() => onStartWriting(draftRecord.topicId, draftRecord.recordId)}
                className="px-5 py-3 bg-[#E8C07D] hover:bg-[#dfb56e] text-[#4A4A3A] font-bold text-sm rounded-2xl transition-all shadow-xs flex items-center justify-center space-x-2"
              >
                <Clock className="w-4 h-4" />
                <span>작성 중인 글 이어쓰기</span>
              </button>
            ) : (
              <button
                onClick={() => onStartWriting(todayMissionTopic?.topicId)}
                className="px-6 py-3 bg-white hover:bg-[#FAF8F3] text-[#4F6839] font-bold text-sm rounded-2xl transition-all shadow-xs flex items-center justify-center space-x-2"
              >
                <PenTool className="w-4 h-4" />
                <span>오늘의 영작 시작하기</span>
              </button>
            )}
          </div>
        </div>

        {/* Decorative background blurs */}
        <div className="absolute right-0 -bottom-10 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Grid: Level Card & Today Mission */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Level & XP Card */}
        <div className="bg-white rounded-2xl border border-[#E5E1D5] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-[#787664]">나의 성장 레벨</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EBF0E5] text-[#4F6839] border border-[#D5E0CC]">
                오늘 {studentGrowth.todayXp} / {MAX_DAILY_XP} XP
              </span>
            </div>

            <div className="flex items-center space-x-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-[#F5F2ED] border border-[#E5E1D5] flex items-center justify-center text-3xl shadow-inner">
                {levelInfo.icon}
              </div>
              <div>
                <p className="text-xs font-bold text-[#889E73] uppercase tracking-wider">Lv.{levelInfo.level}</p>
                <h4 className="text-lg font-extrabold text-[#4A4A3A]">{levelInfo.title}</h4>
                <p className="text-xs text-[#787664]">{levelInfo.desc}</p>
              </div>
            </div>

            {/* XP Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-[#4A4A3A]">누적 {studentGrowth.totalXp} XP</span>
                <span className="text-[#787664]">
                  {nextLevel ? `다음 레벨까지 ${nextLevel.minXp - studentGrowth.totalXp} XP` : '최고 레벨 도달!'}
                </span>
              </div>
              <div className="w-full h-3 bg-[#F5F2ED] rounded-full overflow-hidden border border-[#E5E1D5]/50">
                <div
                  className="h-full bg-[#889E73] rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[#E5E1D5] flex items-center justify-between text-xs">
            <span className="text-[#787664]">완성한 영작: <strong className="text-[#4A4A3A]">{completedCount}편</strong></span>
            <button
              onClick={() => onNavigateTab('growth')}
              className="text-[#889E73] hover:text-[#748B5F] font-semibold flex items-center"
            >
              성장 기록실 가기 →
            </button>
          </div>
        </div>

        {/* Today's Topic Mission (2 cols) */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-[#E5E1D5] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#FAF0EC] text-[#A75336] border border-[#F2D5CB]">
                <Sparkles className="w-3.5 h-3.5 mr-1 text-[#D98E73]" />
                오늘의 추천 영작 미션
              </span>
              {todayMissionTopic && (
                <span className="text-xs font-semibold text-[#787664]">{todayMissionTopic.category}</span>
              )}
            </div>

            {todayMissionTopic ? (
              <div className="space-y-2.5">
                <h3 className="text-lg font-bold text-[#4A4A3A]">{todayMissionTopic.title}</h3>
                <p className="text-xs text-[#787664] leading-relaxed line-clamp-2">{todayMissionTopic.description}</p>

                {todayMissionTopic.recommendedVocab?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {todayMissionTopic.recommendedVocab.slice(0, 4).map((v, i) => (
                      <span key={i} className="px-2 py-0.5 bg-[#F5F2ED] text-[#4A4A3A] text-xs rounded-md border border-[#E5E1D5]">
                        {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-[#787664] py-6">선생님이 준비 중인 주제가 있습니다.</p>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-[#E5E1D5] flex items-center justify-between">
            <span className="text-xs text-[#787664]">
              최소 기준: <strong className="text-[#4A4A3A]">{todayMissionTopic?.minWords || 20}단어</strong> (한글 구상부터 시작)
            </span>
            <button
              onClick={() => onStartWriting(todayMissionTopic?.topicId)}
              className="px-4 py-2 bg-[#889E73] hover:bg-[#748B5F] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-1.5"
            >
              <span>이 주제로 쓰기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Badges & Recent Writings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Earned Badges */}
        <div className="bg-white rounded-2xl border border-[#E5E1D5] p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-[#4A4A3A] flex items-center">
              <Award className="w-4 h-4 mr-1.5 text-[#889E73]" />
              획득한 배지 ({studentGrowth.badges?.length || 0})
            </h4>
            <button
              onClick={() => onNavigateTab('growth')}
              className="text-xs text-[#787664] hover:text-[#889E73] font-medium"
            >
              전체보기
            </button>
          </div>

          {studentGrowth.badges && studentGrowth.badges.length > 0 ? (
            <div className="space-y-2.5">
              {studentGrowth.badges.slice(0, 3).map((b, i) => (
                <div key={i} className="flex items-center space-x-3 p-2.5 bg-[#FAF8F3] rounded-xl border border-[#E5E1D5]">
                  <div className="text-2xl">{b.icon}</div>
                  <div>
                    <p className="text-xs font-bold text-[#4A4A3A]">{b.title}</p>
                    <p className="text-[11px] text-[#787664]">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[#787664]">
              <Award className="w-8 h-8 mx-auto text-[#D8D3C4] mb-2" />
              첫 영작을 완료하고 첫 배지를 획득해 보세요!
            </div>
          )}
        </div>

        {/* Recent Writings List */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-[#E5E1D5] p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-[#4A4A3A] flex items-center">
              <BookOpen className="w-4 h-4 mr-1.5 text-[#889E73]" />
              최근 나의 영작 기록
            </h4>
            <button
              onClick={() => onNavigateTab('my-writings')}
              className="text-xs text-[#787664] hover:text-[#889E73] font-medium"
            >
              전체보기 ({recentRecords.length})
            </button>
          </div>

          {recentRecords.length > 0 ? (
            <div className="space-y-3">
              {recentRecords.slice(0, 3).map((rec) => (
                <div
                  key={rec.recordId}
                  className="p-3.5 bg-[#FAF8F3] hover:bg-[#F5F2ED] rounded-xl border border-[#E5E1D5] transition-colors flex items-center justify-between cursor-pointer"
                  onClick={() => onStartWriting(rec.topicId, rec.recordId)}
                >
                  <div className="space-y-1 max-w-[70%]">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          rec.status === 'completed'
                            ? 'bg-[#EBF0E5] text-[#4F6839] border border-[#D5E0CC]'
                            : 'bg-[#FAF0EC] text-[#A75336] border border-[#F2D5CB]'
                        }`}
                      >
                        {rec.status === 'completed' ? '완성' : `작성 중 (Step ${rec.currentStep})`}
                      </span>
                      <h5 className="text-xs font-bold text-[#4A4A3A] truncate">{rec.topicTitle}</h5>
                    </div>
                    <p className="text-xs text-[#787664] truncate font-mono">
                      {rec.finalWriting || rec.initialDraft || rec.koreanIdea || '내용 작성 중'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-[#787664] block">
                      {new Date(rec.updatedAt).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-[#889E73] font-semibold flex items-center justify-end">
                      {rec.status === 'completed' ? '확인하기' : '이어쓰기'}
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[#787664]">
              <FileText className="w-8 h-8 mx-auto text-[#D8D3C4] mb-2" />
              아직 작성된 영작이 없습니다. 지금 첫 글을 써보세요!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
