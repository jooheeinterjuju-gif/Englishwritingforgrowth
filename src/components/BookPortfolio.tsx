import React, { useState } from 'react';
import {
  BookMarked,
  Plus,
  Printer,
  Trash2,
  Edit3,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  BookOpen,
  User,
  Heart,
  Share2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudentBookDoc, WritingRecordDoc, StudentSession, StudentGrowthDoc, BookRecordItem } from '../types';
import { saveStudentBook, deleteStudentBook, saveStudentGrowth, getStudentGrowth } from '../firebase/db';

interface BookPortfolioProps {
  studentSession: StudentSession;
  studentGrowth: StudentGrowthDoc;
  completedRecords: WritingRecordDoc[];
  books: StudentBookDoc[];
  onBooksUpdate: (updatedBooks: StudentBookDoc[]) => void;
  onGrowthUpdate: (growth: StudentGrowthDoc) => void;
}

export const BookPortfolio: React.FC<BookPortfolioProps> = ({
  studentSession,
  studentGrowth,
  completedRecords,
  books,
  onBooksUpdate,
  onGrowthUpdate,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBookForRead, setSelectedBookForRead] = useState<StudentBookDoc | null>(null);

  // New Book State
  const [bookTitle, setBookTitle] = useState('My English Journey');
  const [subtitle, setSubtitle] = useState('A Collection of Middle School Essays');
  const [authorEnglishName, setAuthorEnglishName] = useState(studentSession.name);
  const [authorBio, setAuthorBio] = useState('I am a 1st grade middle school student who loves writing in English.');
  const [coverStyle, setCoverStyle] = useState<'classic' | 'modern' | 'storybook' | 'notebook' | 'galaxy'>('storybook');
  const [coverColor, setCoverColor] = useState('sage');
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>(
    completedRecords.map((r) => r.recordId)
  );

  const [saving, setSaving] = useState(false);

  // Toggle record selection
  const toggleRecordSelection = (recordId: string) => {
    if (selectedRecordIds.includes(recordId)) {
      setSelectedRecordIds(selectedRecordIds.filter((id) => id !== recordId));
    } else {
      setSelectedRecordIds([...selectedRecordIds, recordId]);
    }
  };

  // Move record order up/down
  const moveOrder = (index: number, direction: 'up' | 'down') => {
    const newArr = [...selectedRecordIds];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newArr.length) return;
    const temp = newArr[index];
    newArr[index] = newArr[targetIdx];
    newArr[targetIdx] = temp;
    setSelectedRecordIds(newArr);
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRecordIds.length === 0) {
      alert('책에 포함할 완성된 영작을 1개 이상 선택해 주세요.');
      return;
    }

    setSaving(true);
    try {
      const bookItems: BookRecordItem[] = selectedRecordIds
        .map((id) => completedRecords.find((r) => r.recordId === id))
        .filter((r): r is WritingRecordDoc => Boolean(r))
        .map((r) => ({
          recordId: r.recordId,
          topicTitle: r.topicTitle,
          koreanIdea: r.koreanIdea,
          initialDraft: r.initialDraft,
          finalWriting: r.finalWriting || r.initialDraft,
          submittedAt: r.submittedAt || r.updatedAt,
        }));

      const newBook: StudentBookDoc = {
        bookId: `book-${studentSession.studentKey}-${Date.now()}`,
        studentKey: studentSession.studentKey,
        classId: studentSession.classId,
        title: bookTitle.trim() || 'My English Book',
        subtitle: subtitle.trim(),
        authorEnglishName: authorEnglishName.trim() || studentSession.name,
        authorBio: authorBio.trim(),
        coverStyle,
        coverColor,
        records: bookItems,
        pageCount: bookItems.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveStudentBook(newBook);
      const updatedBooksList = [newBook, ...books];
      onBooksUpdate(updatedBooksList);

      // Check author badge
      const freshGrowth = await getStudentGrowth(studentSession.studentKey, studentSession.classId);
      const updatedBadges = [...(freshGrowth.badges || [])];
      if (!updatedBadges.some((b) => b.badgeId === 'book_author')) {
        updatedBadges.push({
          badgeId: 'book_author',
          title: '나만의 책 출판',
          description: '나만의 영작 포트폴리오 책을 만들었어요!',
          icon: '📖',
          earnedAt: new Date().toISOString(),
        });
        const finalGrowth = { ...freshGrowth, badges: updatedBadges };
        await saveStudentGrowth(finalGrowth);
        onGrowthUpdate(finalGrowth);
      }

      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.5 },
      });

      setIsCreating(false);
      setSelectedBookForRead(newBook);
    } catch (error) {
      console.error('Create book error:', error);
      alert('책 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('이 책을 책장에서 삭제하시겠습니까? (영작 원본은 안전하게 보존됩니다)')) return;
    try {
      await deleteStudentBook(bookId);
      onBooksUpdate(books.filter((b) => b.bookId !== bookId));
      if (selectedBookForRead?.bookId === bookId) setSelectedBookForRead(null);
    } catch (e) {
      console.error('Delete book error:', e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const COVER_COLORS: { id: string; name: string; bg: string; text: string; border: string }[] = [
    { id: 'sage', name: '내추럴 세이지', bg: 'bg-[#889E73]', text: 'text-[#FDFCF0]', border: 'border-[#748B5F]' },
    { id: 'terracotta', name: '테라코타 클레이', bg: 'bg-[#D98E73]', text: 'text-[#FDFCF0]', border: 'border-[#C57C62]' },
    { id: 'earth', name: '웜 어스', bg: 'bg-[#4A4A3A]', text: 'text-[#FDFCF0]', border: 'border-[#3A3A2C]' },
    { id: 'amber', name: '클래식 샌드', bg: 'bg-[#C89B53]', text: 'text-[#FDFCF0]', border: 'border-[#B38743]' },
    { id: 'forest', name: '딥 포레스트', bg: 'bg-[#445638]', text: 'text-[#FDFCF0]', border: 'border-[#33422A]' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Non-print UI Header */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#4A4A3A] tracking-tight flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-[#889E73]" />
            나의 영작 책장 (Portfolio Books)
          </h2>
          <p className="text-xs text-[#787664] mt-1">
            완성한 영어 글들을 모아 멋진 영작 포트폴리오 책을 출판하고 A4 PDF로 인쇄해 보세요.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          disabled={completedRecords.length === 0}
          className="px-5 py-2.5 bg-[#889E73] hover:bg-[#748B5F] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-2 self-start sm:self-auto disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>새 영어 책 만들기</span>
        </button>
      </div>

      {completedRecords.length === 0 && !isCreating && books.length === 0 && (
        <div className="print:hidden bg-[#FAF8F3] border border-[#E8C07D] p-6 rounded-2xl text-xs text-[#4A4A3A] flex items-center space-x-3">
          <Sparkles className="w-6 h-6 text-[#D98E73] shrink-0" />
          <div>
            <p className="font-bold text-[#4A4A3A]">아직 완성된 영작이 없습니다</p>
            <p className="text-[#787664] mt-0.5">
              영작 미션을 1개 이상 완료하면 나만의 멋진 영어 책(A4 인쇄/PDF 지원)을 만들 수 있어요!
            </p>
          </div>
        </div>
      )}

      {/* Book Creator Modal / Form */}
      {isCreating && (
        <div className="print:hidden bg-white rounded-3xl border border-[#E5E1D5] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#E5E1D5] pb-4">
            <h3 className="text-lg font-bold text-[#4A4A3A] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#889E73]" />
              나만의 영어 책 만들기
            </h3>
            <button
              onClick={() => setIsCreating(false)}
              className="text-[#787664] hover:text-[#4A4A3A] text-sm font-bold"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleCreateBook} className="space-y-6">
            {/* Book Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#4A4A3A] mb-1">책 영문 제목 (Book Title)</label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="예: My Stories in English"
                  className="w-full px-3.5 py-2 text-sm bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A4A3A] mb-1">부제목 (Subtitle)</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="예: Grade 1 Writing Portfolio"
                  className="w-full px-3.5 py-2 text-sm bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A4A3A] mb-1">작가 영문 이름 (Author Name)</label>
                <input
                  type="text"
                  value={authorEnglishName}
                  onChange={(e) => setAuthorEnglishName(e.target.value)}
                  placeholder="예: Minwoo Kim"
                  className="w-full px-3.5 py-2 text-sm bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A4A3A] mb-1">표지 컬러 테마</label>
                <div className="flex gap-2 pt-1">
                  {COVER_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCoverColor(c.id)}
                      className={`w-8 h-8 rounded-full ${c.bg} transition-transform ${
                        coverColor === c.id ? 'ring-2 ring-[#4A4A3A] ring-offset-2 scale-110' : 'opacity-80'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A4A3A] mb-1">영어 작가 소개 (Author Bio)</label>
              <textarea
                rows={2}
                value={authorBio}
                onChange={(e) => setAuthorBio(e.target.value)}
                placeholder="간단한 영문 자기소개나 글쓰기 포부를 적어보세요..."
                className="w-full p-3 text-xs bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73]"
              />
            </div>

            {/* Select Writings */}
            <div>
              <label className="block text-xs font-bold text-[#4A4A3A] mb-2">
                책에 실을 완성작 선택 및 순서 ({selectedRecordIds.length}편 선택됨)
              </label>

              <div className="space-y-2 max-h-60 overflow-y-auto p-3 bg-[#FAF8F3] rounded-2xl border border-[#E5E1D5]">
                {completedRecords.map((rec) => {
                  const isSelected = selectedRecordIds.includes(rec.recordId);
                  const selectedIdx = selectedRecordIds.indexOf(rec.recordId);

                  return (
                    <div
                      key={rec.recordId}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                        isSelected ? 'bg-white border-[#889E73] shadow-xs' : 'bg-[#F5F2ED]/60 border-[#E5E1D5] opacity-60'
                      }`}
                    >
                      <div className="flex items-center space-x-3 max-w-[75%]">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRecordSelection(rec.recordId)}
                          className="w-4 h-4 text-[#889E73] rounded"
                        />
                        <div>
                          <p className="text-xs font-bold text-[#4A4A3A] truncate">{rec.topicTitle}</p>
                          <p className="text-[11px] text-[#787664] truncate font-mono">{rec.finalWriting}</p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex items-center space-x-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-[#EBF0E5] text-[#4F6839] rounded-md border border-[#D5E0CC]">
                            {selectedIdx + 1}장
                          </span>
                          <button
                            type="button"
                            onClick={() => moveOrder(selectedIdx, 'up')}
                            disabled={selectedIdx === 0}
                            className="p-1 text-[#787664] hover:text-[#4A4A3A] disabled:opacity-30"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveOrder(selectedIdx, 'down')}
                            disabled={selectedIdx === selectedRecordIds.length - 1}
                            className="p-1 text-[#787664] hover:text-[#4A4A3A] disabled:opacity-30"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2.5 bg-[#F5F2ED] text-[#4A4A3A] rounded-xl text-xs font-semibold hover:bg-[#EAE6DE]"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={saving || selectedRecordIds.length === 0}
                className="px-6 py-2.5 bg-[#889E73] hover:bg-[#748B5F] text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {saving ? '책 만드는 중...' : '책 출판하기 (PDF 인쇄 준비)'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bookshelf Grid */}
      <div className="print:hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {books.map((b) => {
          const colorObj = COVER_COLORS.find((c) => c.id === b.coverColor) || COVER_COLORS[0];

          return (
            <div
              key={b.bookId}
              className="bg-white rounded-2xl border border-[#E5E1D5] overflow-hidden shadow-xs hover:border-[#889E73] transition-all flex flex-col justify-between"
            >
              {/* Cover Card */}
              <div
                onClick={() => setSelectedBookForRead(b)}
                className={`h-48 p-6 ${colorObj.bg} ${colorObj.text} cursor-pointer flex flex-col justify-between relative group`}
              >
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest opacity-80 font-medium">English Portfolio</span>
                  <h4 className="text-lg font-bold font-serif leading-tight">{b.title}</h4>
                  {b.subtitle && <p className="text-xs opacity-90">{b.subtitle}</p>}
                </div>

                <div className="flex justify-between items-end text-xs opacity-95 border-t border-white/20 pt-2">
                  <span className="font-medium">by {b.authorEnglishName}</span>
                  <span>{b.records?.length || 0} 편 수록</span>
                </div>
              </div>

              {/* Actions */}
              <div className="p-3.5 bg-[#FAF8F3] border-t border-[#E5E1D5] flex items-center justify-between text-xs">
                <button
                  onClick={() => setSelectedBookForRead(b)}
                  className="font-bold text-[#889E73] hover:text-[#748B5F] flex items-center space-x-1"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>책 열기 & 인쇄</span>
                </button>

                <button
                  onClick={() => handleDeleteBook(b.bookId)}
                  className="text-[#787664] hover:text-[#D98E73] p-1 transition-colors"
                  title="책 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Book Reading & A4 Printable View */}
      {selectedBookForRead && (
        <div className="space-y-6">
          {/* Print Toolbar (Hidden during print) */}
          <div className="print:hidden flex items-center justify-between bg-[#FAF8F3] border border-[#E5E1D5] p-4 rounded-2xl shadow-xs">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-[#889E73]" />
              <div>
                <h4 className="text-sm font-bold text-[#4A4A3A]">{selectedBookForRead.title}</h4>
                <p className="text-xs text-[#787664]">A4 세로 인쇄 및 PDF 저장이 최적화되어 있습니다.</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-[#889E73] hover:bg-[#748B5F] text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>A4 인쇄 / PDF 저장</span>
              </button>

              <button
                onClick={() => setSelectedBookForRead(null)}
                className="px-3 py-2 bg-white text-[#4A4A3A] rounded-xl text-xs font-semibold hover:bg-[#F5F2ED] border border-[#E5E1D5]"
              >
                책 닫기
              </button>
            </div>
          </div>

          {/* Book Pages Container (Visible on screen and during @media print) */}
          <div className="book-print-container bg-white rounded-3xl shadow-sm border border-[#E5E1D5] p-8 sm:p-12 space-y-16 max-w-4xl mx-auto">
            {/* 1. Cover Page */}
            <div className="book-page cover-page min-h-[700px] border-4 border-double border-[#4A4A3A] p-10 flex flex-col justify-between text-center rounded-2xl bg-[#FDFCF0]">
              <div className="space-y-2 pt-10">
                <span className="text-xs uppercase tracking-widest text-[#787664] font-semibold">
                  Middle School Grade 1 English Portfolio
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold font-serif text-[#4A4A3A] pt-4">
                  {selectedBookForRead.title}
                </h1>
                {selectedBookForRead.subtitle && (
                  <p className="text-base text-[#787664] font-serif italic pt-2">{selectedBookForRead.subtitle}</p>
                )}
              </div>

              <div className="my-12 flex justify-center">
                <div className="w-24 h-24 rounded-full border-2 border-[#889E73] flex items-center justify-center text-4xl bg-[#EBF0E5]">
                  🌿
                </div>
              </div>

              <div className="space-y-2 pb-8 border-t border-[#E5E1D5] pt-6">
                <p className="text-sm font-serif font-bold text-[#4A4A3A]">
                  Written by: {selectedBookForRead.authorEnglishName} ({studentSession.name})
                </p>
                <p className="text-xs text-[#787664]">
                  {studentSession.gradeYear}년 {studentSession.grade}학년 {studentSession.classNum}반
                </p>
              </div>
            </div>

            {/* 2. Table of Contents & Author Profile */}
            <div className="book-page page-break min-h-[600px] p-6 space-y-8 border-t border-[#E5E1D5] pt-10">
              <div className="text-center pb-4 border-b border-[#E5E1D5]">
                <h2 className="text-xl font-serif font-bold text-[#4A4A3A]">Table of Contents (목차)</h2>
              </div>

              <div className="space-y-4 max-w-lg mx-auto">
                {selectedBookForRead.records?.map((rec, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-dotted border-[#E5E1D5] pb-2 text-sm">
                    <span className="font-serif font-bold text-[#4A4A3A]">
                      Chapter {idx + 1}. {rec.topicTitle}
                    </span>
                    <span className="text-[#787664] text-xs">Page {idx + 3}</span>
                  </div>
                ))}
              </div>

              {/* Author Bio */}
              <div className="mt-12 p-6 bg-[#FAF8F3] rounded-2xl border border-[#E5E1D5] max-w-lg mx-auto text-xs space-y-2">
                <h3 className="font-bold text-[#4A4A3A] flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#889E73]" />
                  About the Author (작가 소개)
                </h3>
                <p className="text-[#787664] leading-relaxed italic">{selectedBookForRead.authorBio}</p>
              </div>
            </div>

            {/* 3. Each Chapter / Writing Story */}
            {selectedBookForRead.records?.map((rec, idx) => (
              <div key={idx} className="book-page page-break min-h-[700px] p-6 space-y-6 border-t border-[#E5E1D5] pt-10">
                <div className="flex items-center justify-between border-b border-[#E5E1D5] pb-3">
                  <span className="text-xs font-serif font-bold text-[#889E73]">CHAPTER {idx + 1}</span>
                  <span className="text-xs text-[#787664]">{new Date(rec.submittedAt).toLocaleDateString()}</span>
                </div>

                <h3 className="text-2xl font-serif font-bold text-[#4A4A3A]">{rec.topicTitle}</h3>

                {/* English Final Essay */}
                <div className="p-6 bg-[#FAF8F3] border border-[#E5E1D5] rounded-2xl">
                  <p className="text-sm font-mono text-[#4A4A3A] leading-loose whitespace-pre-wrap">
                    {rec.finalWriting}
                  </p>
                </div>

                {/* Korean Initial Thought Card */}
                <div className="p-4 bg-[#EBF0E5]/60 rounded-xl border border-[#D5E0CC] text-xs space-y-1">
                  <span className="font-bold text-[#4F6839]">[작가의 한글 구상 생각]</span>
                  <p className="text-[#4A4A3A] leading-relaxed">{rec.koreanIdea}</p>
                </div>

                {/* Teacher Seal of Praise */}
                <div className="pt-8 flex justify-end">
                  <div className="w-28 h-28 rounded-full border-2 border-[#889E73] p-2 text-center flex flex-col items-center justify-center text-[#4F6839] rotate-6 bg-[#EBF0E5]/80 shadow-xs">
                    <Sparkles className="w-4 h-4 mb-0.5 text-[#889E73]" />
                    <span className="text-[10px] font-bold">참 잘했어요!</span>
                    <span className="text-[9px] text-[#787664] font-semibold">Teacher's Stamp</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
