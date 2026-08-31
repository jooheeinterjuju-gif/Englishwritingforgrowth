import React, { useState } from 'react';
import { BookOpen, Clock, CheckCircle2, ArrowRight, Eye, Sparkles, Filter, ArrowUpDown, Award, MessageSquare } from 'lucide-react';
import { WritingRecordDoc } from '../types';

interface MyWritingsProps {
  records: WritingRecordDoc[];
  onContinueWriting: (topicId: string, recordId: string) => void;
  onNavigateToBooks: () => void;
}

export const MyWritings: React.FC<MyWritingsProps> = ({ records, onContinueWriting, onNavigateToBooks }) => {
  const [filter, setFilter] = useState<'all' | 'completed' | 'draft'>('all');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<WritingRecordDoc | null>(null);

  const filteredRecords = records
    .filter((r) => {
      if (filter === 'completed') return r.status === 'completed';
      if (filter === 'draft') return r.status === 'draft';
      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.updatedAt).getTime();
      const timeB = new Date(b.updatedAt).getTime();
      return sortOrder === 'latest' ? timeB - timeA : timeA - timeB;
    });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#4A4A3A] tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#889E73]" />
            나의 영작 서랍
          </h2>
          <p className="text-xs text-[#787664] mt-1">내가 작성한 모든 영어 글과 단계별 성장 과정을 확인하세요.</p>
        </div>

        <button
          onClick={onNavigateToBooks}
          className="px-4 py-2.5 bg-[#889E73] hover:bg-[#748B5F] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>완성작으로 나만의 책 만들기</span>
        </button>
      </div>

      {/* Filters & Sorting */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E1D5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'all' ? 'bg-[#4A4A3A] text-white' : 'bg-[#F5F2ED] text-[#787664] hover:bg-[#EAE6DE]'
            }`}
          >
            전체 ({records.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'completed'
                ? 'bg-[#889E73] text-white'
                : 'bg-[#EBF0E5] text-[#4F6839] hover:bg-[#DCE6D4]'
            }`}
          >
            완성 ({records.filter((r) => r.status === 'completed').length})
          </button>
          <button
            onClick={() => setFilter('draft')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'draft'
                ? 'bg-[#D98E73] text-white'
                : 'bg-[#FAF0EC] text-[#A75336] hover:bg-[#F5E2DA]'
            }`}
          >
            작성 중 ({records.filter((r) => r.status === 'draft').length})
          </button>
        </div>

        {/* Sort Toggle */}
        <div className="flex items-center space-x-2 text-xs text-[#787664]">
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>정렬:</span>
          <button
            onClick={() => setSortOrder((prev) => (prev === 'latest' ? 'oldest' : 'latest'))}
            className="font-bold text-[#4A4A3A] hover:text-[#889E73]"
          >
            {sortOrder === 'latest' ? '최신순 ↓' : '오래된순 ↑'}
          </button>
        </div>
      </div>

      {/* Record Grid */}
      {filteredRecords.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecords.map((rec) => (
            <div
              key={rec.recordId}
              className="bg-white rounded-2xl border border-[#E5E1D5] p-5 shadow-xs hover:border-[#889E73] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      rec.status === 'completed'
                        ? 'bg-[#EBF0E5] text-[#4F6839] border border-[#D5E0CC]'
                        : 'bg-[#FAF0EC] text-[#A75336] border border-[#F2D5CB]'
                    }`}
                  >
                    {rec.status === 'completed' ? '✓ 영작 완성' : `작성 중 (Step ${rec.currentStep})`}
                  </span>

                  <span className="text-[11px] text-[#787664]">
                    {new Date(rec.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#4A4A3A] mb-2">{rec.topicTitle}</h3>

                {/* Preview text */}
                <div className="p-3 bg-[#FAF8F3] rounded-xl text-xs font-mono text-[#4A4A3A] border border-[#E5E1D5] mb-3 line-clamp-3 leading-relaxed">
                  {rec.finalWriting || rec.initialDraft || rec.koreanIdea || '작성 중인 내용이 없습니다.'}
                </div>

                {/* Process badge count */}
                <div className="flex items-center space-x-2 text-[11px] text-[#787664] mb-3">
                  <span>단어 수: <strong className="text-[#4A4A3A]">{rec.wordCount || 0}</strong></span>
                  <span>•</span>
                  <span>한글 구상 {rec.koreanIdea ? '✓' : '-'}</span>
                  <span>•</span>
                  <span>문법 검토 {rec.aiGrammarFeedback ? '✓' : '-'}</span>
                  <span>•</span>
                  <span>표현 확장 {rec.aiExpressionSuggestion ? '✓' : '-'}</span>
                </div>

                {/* Teacher assessment approved stamp */}
                {rec.teacherAssessmentApproved && (
                  <div className="mb-3 p-2 bg-[#EBF0E5] border border-[#D5E0CC] rounded-lg text-xs text-[#4F6839] flex items-center space-x-1.5">
                    <Award className="w-3.5 h-3.5 text-[#889E73]" />
                    <span className="font-bold">선생님 과정중심평가 승인 완료</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#E5E1D5] flex items-center justify-between">
                <button
                  onClick={() => setSelectedRecordForDetail(rec)}
                  className="text-xs font-semibold text-[#787664] hover:text-[#889E73] flex items-center space-x-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>전체 과정 보기</span>
                </button>

                <button
                  onClick={() => onContinueWriting(rec.topicId, rec.recordId)}
                  className="px-3.5 py-1.5 bg-[#EBF0E5] hover:bg-[#DCE6D4] text-[#4F6839] rounded-lg text-xs font-bold transition-colors flex items-center space-x-1"
                >
                  <span>{rec.status === 'completed' ? '다시 보기/수정' : '이어서 쓰기'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E1D5] p-12 text-center text-[#787664]">
          <BookOpen className="w-12 h-12 mx-auto text-[#D8D3C4] mb-3" />
          <p className="text-sm font-semibold text-[#4A4A3A]">해당하는 영작 기록이 없습니다.</p>
          <p className="text-xs text-[#787664] mt-1">오늘의 영작 미션에 도전해 보세요!</p>
        </div>
      )}

      {/* Detailed Process Modal */}
      {selectedRecordForDetail && (
        <div className="fixed inset-0 z-50 bg-[#4A4A3A]/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-[#E5E1D5] max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between border-b border-[#E5E1D5] pb-4">
              <div>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#EBF0E5] text-[#4F6839] border border-[#D5E0CC]">
                  전체 영작 과정 및 성장 기록
                </span>
                <h3 className="text-xl font-bold text-[#4A4A3A] mt-2">{selectedRecordForDetail.topicTitle}</h3>
              </div>
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="p-1 rounded-lg text-[#787664] hover:text-[#4A4A3A] hover:bg-[#F5F2ED]"
              >
                ✕
              </button>
            </div>

            {/* Steps Evolution */}
            <div className="space-y-4 text-xs">
              {/* 1. Korean Idea */}
              <div className="p-4 bg-[#FAF8F3] rounded-xl border border-[#E5E1D5]">
                <p className="font-bold text-[#4A4A3A] mb-1">1단계: 학생 한글 생각 (Korean Idea)</p>
                <p className="text-[#4A4A3A] leading-relaxed">{selectedRecordForDetail.koreanIdea || '(미작성)'}</p>
              </div>

              {/* 2. Initial Draft */}
              <div className="p-4 bg-[#FAF8F3] rounded-xl border border-[#E5E1D5]">
                <p className="font-bold text-[#4A4A3A] mb-1">2단계: 기초 영작 초고 (Initial Draft)</p>
                <p className="text-[#4A4A3A] font-mono leading-relaxed">{selectedRecordForDetail.initialDraft || '(미작성)'}</p>
              </div>

              {/* 3. AI Grammar Feedback */}
              {selectedRecordForDetail.aiGrammarFeedback && (
                <div className="p-4 bg-[#FAF8F3] rounded-xl border border-[#E8C07D]">
                  <p className="font-bold text-[#4A4A3A] mb-1">3단계: 1차 AI 문법 수정 (Grammar Check)</p>
                  <p className="text-[#787664] mb-2">{selectedRecordForDetail.aiGrammarFeedback.praiseMessage}</p>
                  {selectedRecordForDetail.aiGrammarFeedback.corrections?.map((c, i) => (
                    <div key={i} className="bg-white p-2 rounded-lg text-[11px] mb-1 font-mono text-[#4A4A3A] border border-[#E5E1D5]">
                      <span className="line-through text-[#D98E73]">{c.original}</span> →{' '}
                      <span className="font-bold text-[#4F6839]">{c.corrected}</span> ({c.explanation})
                    </div>
                  ))}
                </div>
              )}

              {/* 4. AI Expression Suggestion */}
              {selectedRecordForDetail.aiExpressionSuggestion && (
                <div className="p-4 bg-[#FAF0EC] rounded-xl border border-[#F2D5CB]">
                  <p className="font-bold text-[#A75336] mb-1">4단계: 2차 AI 표현 확장 (Expression Expansion)</p>
                  <p className="text-[#A75336] mb-1 font-semibold">{selectedRecordForDetail.aiExpressionSuggestion.suggestionTitle}</p>
                  <p className="text-[#4A4A3A]">{selectedRecordForDetail.aiExpressionSuggestion.friendlyGuide}</p>
                </div>
              )}

              {/* 5. Final Polished Writing */}
              <div className="p-4 bg-[#EBF0E5] border border-[#D5E0CC] rounded-xl">
                <p className="font-bold text-[#4F6839] mb-1">5단계: 최종 완성 영작 (Final Writing)</p>
                <p className="text-[#4A4A3A] font-mono font-medium leading-relaxed whitespace-pre-wrap">
                  {selectedRecordForDetail.finalWriting || selectedRecordForDetail.initialDraft}
                </p>
              </div>

              {/* Teacher Assessment if present */}
              {selectedRecordForDetail.teacherAssessment && (
                <div className="p-4 bg-[#FAF8F3] border border-[#889E73] rounded-xl">
                  <p className="font-bold text-[#4A4A3A] mb-1 flex items-center">
                    <Award className="w-4 h-4 mr-1 text-[#889E73]" />
                    교사 과정중심평가 피드백
                  </p>
                  <p className="text-[#4A4A3A] mb-2">{selectedRecordForDetail.teacherAssessment.detailedDraft}</p>
                  {selectedRecordForDetail.teacherAssessment.encouragementComment && (
                    <p className="text-[#4F6839] italic">
                      💬 선생님 한마디: "{selectedRecordForDetail.teacherAssessment.encouragementComment}"
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="text-right pt-2 border-t border-[#E5E1D5]">
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="px-5 py-2 bg-[#4A4A3A] text-white hover:bg-[#3A3A2C] rounded-xl text-xs font-bold"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
