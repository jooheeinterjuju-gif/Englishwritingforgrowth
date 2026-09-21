import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  BookOpen,
  HelpCircle,
  PenTool,
  Save,
  Check,
  RefreshCw,
  Award,
  Smile,
  Send,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  DailyTopicDoc,
  WritingRecordDoc,
  StudentSession,
  StudentGrowthDoc,
  AiHintsResponse,
  AiGrammarFeedback,
  AiExpressionSuggestion,
  SelfAssessment,
} from '../types';
import { saveWritingRecord, getWritingRecord, getDailyTopics, saveStudentGrowth, getStudentGrowth } from '../firebase/db';
import { calculateXpGrant } from '../utils/gamification';

interface WritingStudioProps {
  studentSession: StudentSession;
  studentGrowth: StudentGrowthDoc;
  activeTopicId?: string | null;
  activeRecordId?: string | null;
  onGrowthUpdate: (newGrowth: StudentGrowthDoc) => void;
  onComplete: (record: WritingRecordDoc) => void;
  onCancel: () => void;
}

export const WritingStudio: React.FC<WritingStudioProps> = ({
  studentSession,
  studentGrowth,
  activeTopicId,
  activeRecordId,
  onGrowthUpdate,
  onComplete,
  onCancel,
}) => {
  // Topics
  const [topics, setTopics] = useState<DailyTopicDoc[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<DailyTopicDoc | null>(null);

  // Record State
  const [recordId, setRecordId] = useState<string>(activeRecordId || `rec-${studentSession.studentKey}-${Date.now()}`);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [koreanIdea, setKoreanIdea] = useState<string>('');
  const [initialDraft, setInitialDraft] = useState<string>('');
  const [grammarFeedback, setGrammarFeedback] = useState<AiGrammarFeedback | null>(null);
  const [expressionSuggestion, setExpressionSuggestion] = useState<AiExpressionSuggestion | null>(null);
  const [finalWriting, setFinalWriting] = useState<string>('');
  const [selfAssessment, setSelfAssessment] = useState<SelfAssessment>({
    difficulty: 'moderate',
    satisfaction: 'great',
    reflectionComment: '',
  });
  const [xpGranted, setXpGranted] = useState({
    step2: false,
    step3: false,
    step4: false,
    step5: false,
    step6: false,
  });

  // AI State
  const [aiHints, setAiHints] = useState<AiHintsResponse | null>(null);
  const [loadingHints, setLoadingHints] = useState<boolean>(false);
  const [loadingGrammar, setLoadingGrammar] = useState<boolean>(false);
  const [loadingExpression, setLoadingExpression] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Save State
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [xpNotification, setXpNotification] = useState<string | null>(null);

  // Load Topics and existing record if resuming
  useEffect(() => {
    loadTopicsAndRecord();
  }, [activeTopicId, activeRecordId]);

  const loadTopicsAndRecord = async () => {
    try {
      const topicList = await getDailyTopics(true);
      setTopics(topicList);

      if (activeRecordId) {
        const existing = await getWritingRecord(activeRecordId);
        if (existing) {
          setRecordId(existing.recordId);
          setCurrentStep(existing.currentStep || 1);
          setKoreanIdea(existing.koreanIdea || '');
          setInitialDraft(existing.initialDraft || '');
          setGrammarFeedback(existing.aiGrammarFeedback);
          setExpressionSuggestion(existing.aiExpressionSuggestion);
          setFinalWriting(existing.finalWriting || existing.initialDraft || '');
          if (existing.selfAssessment) setSelfAssessment(existing.selfAssessment);
          if (existing.xpGranted) setXpGranted(existing.xpGranted);

          const matchedTopic = topicList.find((t) => t.topicId === existing.topicId);
          if (matchedTopic) setSelectedTopic(matchedTopic);
          return;
        }
      }

      if (activeTopicId) {
        const matched = topicList.find((t) => t.topicId === activeTopicId);
        if (matched) setSelectedTopic(matched);
      } else if (topicList.length > 0) {
        setSelectedTopic(topicList[0]);
      }
    } catch (error) {
      console.error('loadTopicsAndRecord error:', error);
    }
  };

  // Auto-save helper
  const saveCurrentState = async (overrides: Partial<WritingRecordDoc> = {}) => {
    if (!selectedTopic) return;
    setSaveStatus('saving');
    setErrorMessage('');

    const wordCount = (overrides.finalWriting || finalWriting || overrides.initialDraft || initialDraft || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

    const recordToSave: WritingRecordDoc = {
      recordId,
      studentKey: studentSession.studentKey,
      classId: studentSession.classId,
      topicId: selectedTopic.topicId,
      topicTitle: selectedTopic.title,
      koreanIdea: overrides.koreanIdea !== undefined ? overrides.koreanIdea : koreanIdea,
      initialDraft: overrides.initialDraft !== undefined ? overrides.initialDraft : initialDraft,
      aiGrammarFeedback: overrides.aiGrammarFeedback !== undefined ? overrides.aiGrammarFeedback : grammarFeedback,
      aiExpressionSuggestion:
        overrides.aiExpressionSuggestion !== undefined ? overrides.aiExpressionSuggestion : expressionSuggestion,
      finalWriting: overrides.finalWriting !== undefined ? overrides.finalWriting : finalWriting || initialDraft,
      selfAssessment: overrides.selfAssessment !== undefined ? overrides.selfAssessment : selfAssessment,
      currentStep: overrides.currentStep !== undefined ? overrides.currentStep : currentStep,
      status: overrides.status || 'draft',
      xpGranted: overrides.xpGranted || xpGranted,
      wordCount,
      createdAt: overrides.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submittedAt: overrides.submittedAt || null,
    };

    try {
      await saveWritingRecord(recordToSave);
      setSaveStatus('saved');
    } catch (err: any) {
      console.error('Save writing record error:', err);
      setSaveStatus('error');
      setErrorMessage('저장하지 못했어요. (입력하신 내용은 안전하게 유지됩니다)');
      try {
        localStorage.setItem(`emergency-draft-${recordId}`, JSON.stringify(recordToSave));
      } catch (e) {
        // ignore
      }
    }
  };

  // Helper to award XP
  const awardStepXp = async (stepKey: keyof WritingRecordDoc['xpGranted'], points: number) => {
    if (xpGranted[stepKey]) return;

    const freshGrowth = await getStudentGrowth(studentSession.studentKey, studentSession.classId);
    const { grantedXp, updatedGrowth, leveledUp } = calculateXpGrant(freshGrowth, points);

    if (grantedXp > 0) {
      await saveStudentGrowth(updatedGrowth);
      onGrowthUpdate(updatedGrowth);
      setXpNotification(`+${grantedXp} XP 획득! ${leveledUp ? '🎉 레벨 업!' : ''}`);
      setTimeout(() => setXpNotification(null), 3500);
    }

    const updatedXpGranted = { ...xpGranted, [stepKey]: true };
    setXpGranted(updatedXpGranted);
    return updatedXpGranted;
  };

  // Step 2: Korean Idea -> Advance to Step 3
  const handleProceedFromStep2 = async () => {
    if (!koreanIdea.trim()) {
      setErrorMessage('한글로 내 생각이나 하고 싶은 말을 한 문장 이상 적어주세요.');
      return;
    }
    setErrorMessage('');
    const newXpGranted = await awardStepXp('step2', 1);
    const nextStep = 3;
    setCurrentStep(nextStep);
    await saveCurrentState({ koreanIdea, currentStep: nextStep, xpGranted: newXpGranted || xpGranted });
  };

  // Step 3: Request AI Hints based on Korean Idea
  const handleRequestAiHints = async () => {
    if (!koreanIdea.trim()) return;
    setLoadingHints(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/gemini/hints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          koreanIdea,
          topicTitle: selectedTopic?.title,
        }),
      });
      const data = await res.json();
      if (data.success && data.hints) {
        setAiHints(data.hints);
      } else {
        setErrorMessage(data.error || 'AI 힌트를 불러오지 못했습니다. 다시 시도해 주세요.');
      }
    } catch (e) {
      console.error('Request AI hints error:', e);
      setErrorMessage('힌트 요청 중 통신 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoadingHints(false);
    }
  };

  // Step 3: Initial Draft -> Advance to Step 4 (Grammar Check)
  const handleProceedToGrammarCheck = async () => {
    if (!initialDraft.trim()) {
      setErrorMessage('영어로 첫 문장을 작성해 보세요. 완벽하지 않아도 괜찮아요!');
      return;
    }

    setErrorMessage('');
    setLoadingGrammar(true);

    try {
      const newXpGranted = await awardStepXp('step3', 2);

      const res = await fetch('/api/gemini/grammar-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftText: initialDraft,
          koreanIdea,
          topicTitle: selectedTopic?.title,
        }),
      });
      const data = await res.json();

      if (data.success && data.feedback) {
        setGrammarFeedback(data.feedback);
        const nextStep = 4;
        setCurrentStep(nextStep);
        await saveCurrentState({
          initialDraft,
          aiGrammarFeedback: data.feedback,
          currentStep: nextStep,
          xpGranted: newXpGranted || xpGranted,
        });
      } else {
        setErrorMessage('문법 검토를 생성하지 못했습니다. 다시 시도해 주세요.');
      }
    } catch (e) {
      console.error('Grammar check request error:', e);
      setErrorMessage('문법 검토 요청 중 오류가 발생했습니다.');
    } finally {
      setLoadingGrammar(false);
    }
  };

  // Step 4: Grammar Feedback -> Advance to Step 5 (Expression Expansion)
  const handleProceedToExpressionExpansion = async (useImproved: boolean) => {
    setErrorMessage('');
    setLoadingExpression(true);

    const workingText = useImproved && grammarFeedback?.improvedDraft ? grammarFeedback.improvedDraft : initialDraft;
    setFinalWriting(workingText);

    try {
      const newXpGranted = await awardStepXp('step4', 1);

      const res = await fetch('/api/gemini/expression-expansion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentText: workingText,
          koreanIdea,
          topicTitle: selectedTopic?.title,
        }),
      });
      const data = await res.json();

      if (data.success && data.suggestion) {
        setExpressionSuggestion(data.suggestion);
        const nextStep = 5;
        setCurrentStep(nextStep);
        await saveCurrentState({
          finalWriting: workingText,
          aiExpressionSuggestion: data.suggestion,
          currentStep: nextStep,
          xpGranted: newXpGranted || xpGranted,
        });
      } else {
        setErrorMessage('표현 확장 제안을 불러오지 못했습니다. 바로 다음 단계로 이동할 수 있습니다.');
        setCurrentStep(5);
      }
    } catch (e) {
      console.error('Expression expansion request error:', e);
      setErrorMessage('표현 확장 요청 중 오류가 발생했습니다.');
      setCurrentStep(5);
    } finally {
      setLoadingExpression(false);
    }
  };

  // Step 5: Advance to Step 6 (Final Submission & Reflection)
  const handleProceedToFinalStep = async () => {
    if (!finalWriting.trim()) {
      setErrorMessage('최종 영작 내용을 확인해 주세요.');
      return;
    }
    setErrorMessage('');
    const newXpGranted = await awardStepXp('step5', 1);
    const nextStep = 6;
    setCurrentStep(nextStep);
    await saveCurrentState({
      finalWriting,
      currentStep: nextStep,
      xpGranted: newXpGranted || xpGranted,
    });
  };

  // Step 6: Final Submission
  const handleFinalSubmit = async () => {
    if (!finalWriting.trim()) {
      setErrorMessage('제출할 영작 내용이 비어 있습니다.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const newXpGranted = await awardStepXp('step6', 2);

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#889E73', '#D98E73', '#E8C07D', '#748B5F', '#4A4A3A'],
      });

      const freshGrowth = await getStudentGrowth(studentSession.studentKey, studentSession.classId);
      const newCompletedCount = (freshGrowth.completedCount || 0) + 1;
      const updatedBadges = [...(freshGrowth.badges || [])];

      if (newCompletedCount >= 1 && !updatedBadges.some((b) => b.badgeId === 'first_writing')) {
        updatedBadges.push({
          badgeId: 'first_writing',
          title: '첫 영작 완성',
          description: '첫 번째 영어 글쓰기를 끝까지 완성했어요!',
          icon: '🌟',
          earnedAt: new Date().toISOString(),
        });
      }
      if (newCompletedCount >= 3 && !updatedBadges.some((b) => b.badgeId === 'steady_writer')) {
        updatedBadges.push({
          badgeId: 'steady_writer',
          title: '꾸준한 작가',
          description: '차곡차곡 3편 이상의 글을 완성했어요!',
          icon: '📚',
          earnedAt: new Date().toISOString(),
        });
      }

      const finalGrowthDoc: StudentGrowthDoc = {
        ...freshGrowth,
        completedCount: newCompletedCount,
        badges: updatedBadges,
        updatedAt: new Date().toISOString(),
      };
      await saveStudentGrowth(finalGrowthDoc);
      onGrowthUpdate(finalGrowthDoc);

      const submittedRecord: WritingRecordDoc = {
        recordId,
        studentKey: studentSession.studentKey,
        classId: studentSession.classId,
        topicId: selectedTopic!.topicId,
        topicTitle: selectedTopic!.title,
        koreanIdea,
        initialDraft,
        aiGrammarFeedback: grammarFeedback,
        aiExpressionSuggestion: expressionSuggestion,
        finalWriting,
        selfAssessment,
        currentStep: 6,
        status: 'completed',
        xpGranted: newXpGranted || xpGranted,
        wordCount: finalWriting.trim().split(/\s+/).filter(Boolean).length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
      };

      await saveWritingRecord(submittedRecord);
      onComplete(submittedRecord);
    } catch (err: any) {
      console.error('Final submit error:', err);
      setErrorMessage('제출 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentWordCount = (currentStep >= 5 ? finalWriting : initialDraft)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const minWords = selectedTopic?.minWords || 20;

  const STEPS = [
    { num: 1, name: '주제 확인' },
    { num: 2, name: '한글 생각 쓰기' },
    { num: 3, name: '기초 영작' },
    { num: 4, name: '1차 AI 문법 수정' },
    { num: 5, name: '2차 AI 표현 확장' },
    { num: 6, name: '고쳐쓰기 & 제출' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Top Bar: Progress, Save Status, XP Notification */}
      <div className="bg-white rounded-2xl border border-[#E5E1D5] p-4 sm:p-5 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg text-[#787664] hover:text-[#4A4A3A] hover:bg-[#F5F2ED] transition-colors"
              title="나가기"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-bold text-[#4A4A3A] flex items-center gap-2">
                <span>단계별 영어 글쓰기</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#EBF0E5] text-[#4F6839] font-semibold border border-[#D5E0CC]">
                  Step {currentStep} / 6
                </span>
              </h2>
              <p className="text-xs text-[#787664]">{selectedTopic?.title || '주제 선택 중'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-end sm:self-auto">
            {/* XP notification toast */}
            {xpNotification && (
              <div className="animate-bounce flex items-center space-x-1.5 px-3 py-1 bg-[#E8C07D] text-[#4A4A3A] rounded-full text-xs font-bold shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#D98E73]" />
                <span>{xpNotification}</span>
              </div>
            )}

            {/* Word Count Indicator */}
            <div className="flex items-center space-x-1.5 text-xs bg-[#FAF8F3] border border-[#E5E1D5] px-3 py-1.5 rounded-lg text-[#4A4A3A] font-medium">
              <span>단어 수:</span>
              <span className={`font-bold ${currentWordCount >= minWords ? 'text-[#4F6839]' : 'text-[#D98E73]'}`}>
                {currentWordCount}
              </span>
              <span className="text-[#787664]">/ {minWords}단어</span>
            </div>

            {/* Auto-save Status */}
            <div className="flex items-center space-x-1 text-xs text-[#787664]">
              {saveStatus === 'saving' && (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#889E73]" />
                  <span>저장 중...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Check className="w-3.5 h-3.5 text-[#889E73]" />
                  <span className="text-[#4F6839]">저장 완료</span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-[#D98E73]" />
                  <span className="text-[#D98E73]">임시 보관됨</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Step Indicator Pills */}
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {STEPS.map((s) => {
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <div
                key={s.num}
                className={`py-2 px-1 text-center rounded-xl text-[11px] sm:text-xs font-medium transition-all ${
                  isCurrent
                    ? 'bg-[#889E73] text-white font-bold shadow-xs ring-2 ring-[#889E73]/30'
                    : isCompleted
                    ? 'bg-[#EBF0E5] text-[#4F6839] font-semibold border border-[#D5E0CC]'
                    : 'bg-[#F5F2ED] text-[#787664]'
                }`}
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>{s.num}.</span>
                  <span className="truncate hidden sm:inline">{s.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-[#FAF0EC] border border-[#F2D5CB] text-[#A75336] rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-[#A75336] hover:text-[#782813] font-bold">
            ✕
          </button>
        </div>
      )}

      {/* STEP 1: Topic Selection & Overview */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-[#E5E1D5] p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EBF0E5] text-[#4F6839] border border-[#D5E0CC]">
              STEP 1
            </span>
            <h3 className="text-xl font-bold text-[#4A4A3A] mt-2">오늘의 글쓰기 주제를 확인하세요</h3>
            <p className="text-xs text-[#787664] mt-1">마음에 드는 주제를 고르고 영작 가이드를 읽어보세요.</p>
          </div>

          {/* Topic Selector Tabs if multiple */}
          {topics.length > 1 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {topics.map((t) => (
                <button
                  key={t.topicId}
                  onClick={() => setSelectedTopic(t)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-all ${
                    selectedTopic?.topicId === t.topicId
                      ? 'bg-[#EBF0E5] border-[#889E73] text-[#4F6839] font-bold shadow-xs'
                      : 'bg-[#FAF8F3] border-[#E5E1D5] text-[#787664] hover:bg-[#F5F2ED]'
                  }`}
                >
                  {t.title}
                </button>
              ))}
            </div>
          )}

          {selectedTopic && (
            <div className="bg-[#FAF8F3] rounded-2xl border border-[#E5E1D5] p-5 sm:p-6 space-y-5">
              <div className="border-b border-[#E5E1D5] pb-4">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#FAF0EC] text-[#A75336] border border-[#F2D5CB]">
                  {selectedTopic.category}
                </span>
                <h4 className="text-lg font-bold text-[#4A4A3A] mt-2">{selectedTopic.title}</h4>
                <p className="text-xs text-[#787664] mt-1.5 leading-relaxed">{selectedTopic.description}</p>
              </div>

              {/* Guide Questions */}
              {selectedTopic.guidePrompt && (
                <div>
                  <h5 className="text-xs font-bold text-[#4A4A3A] mb-2 flex items-center">
                    <HelpCircle className="w-4 h-4 mr-1.5 text-[#889E73]" />
                    생각해보기 질문 (가이드)
                  </h5>
                  <div className="bg-white p-3.5 rounded-xl border border-[#E5E1D5] text-xs text-[#4A4A3A] whitespace-pre-line leading-relaxed">
                    {selectedTopic.guidePrompt}
                  </div>
                </div>
              )}

              {/* Recommended Vocab & Sentence Starters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedTopic.recommendedVocab?.length > 0 && (
                  <div className="bg-white p-4 rounded-xl border border-[#E5E1D5]">
                    <h5 className="text-xs font-bold text-[#4F6839] mb-2.5 flex items-center">
                      <BookOpen className="w-3.5 h-3.5 mr-1.5 text-[#889E73]" />
                      추천 기초 어휘
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTopic.recommendedVocab.map((v, i) => (
                        <span key={i} className="px-2 py-1 bg-[#EBF0E5] text-[#4F6839] text-xs rounded-lg font-medium border border-[#D5E0CC]">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTopic.sentenceStarters?.length > 0 && (
                  <div className="bg-white p-4 rounded-xl border border-[#E5E1D5]">
                    <h5 className="text-xs font-bold text-[#4A4A3A] mb-2.5 flex items-center">
                      <PenTool className="w-3.5 h-3.5 mr-1.5 text-[#889E73]" />
                      문장 시작 힌트
                    </h5>
                    <ul className="text-xs text-[#787664] space-y-1 font-mono">
                      {selectedTopic.sentenceStarters.map((s, i) => (
                        <li key={i} className="bg-[#FAF8F3] px-2 py-1 rounded text-[#4A4A3A] border border-[#E5E1D5]">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2.5 bg-[#889E73] hover:bg-[#748B5F] text-white text-sm font-semibold rounded-xl transition-all shadow-xs inline-flex items-center space-x-2"
                >
                  <span>2단계: 한글로 생각 쓰러 가기</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Korean Idea */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl border border-[#E5E1D5] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EBF0E5] text-[#4F6839] border border-[#D5E0CC]">
                STEP 2 (한글 생각 쓰기)
              </span>
              <h3 className="text-xl font-bold text-[#4A4A3A] mt-2">먼저 한글로 편하게 적어보세요</h3>
              <p className="text-xs text-[#787664] mt-1">
                영어로 바로 쓰지 않아도 괜찮아요! 이번 주제에 대해 하고 싶은 말을 한글로 자유롭게 적어보세요. (1XP 획득)
              </p>
            </div>
            <div className="hidden sm:flex items-center px-3 py-1 bg-[#FAF8F3] border border-[#E8C07D] rounded-full text-[#4A4A3A] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-[#D98E73]" />
              완료 시 +1 XP
            </div>
          </div>

          {/* Topic reminder banner */}
          <div className="p-3.5 bg-[#FAF8F3] rounded-xl border border-[#E5E1D5] text-xs text-[#4A4A3A]">
            <span className="font-semibold text-[#889E73] mr-2">[글쓰기 주제]</span>
            {selectedTopic?.title}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A4A3A] mb-1.5">나의 한글 생각 (2~4문장 권장)</label>
            <textarea
              rows={5}
              value={koreanIdea}
              onChange={(e) => setKoreanIdea(e.target.value)}
              placeholder="예: 내가 가장 좋아하는 계절은 가을이다. 왜냐하면 날씨가 시원하고 하늘이 맑기 때문이다. 주말에는 친구들과 공원에서 자전거를 탄다."
              className="w-full p-4 text-sm bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73] leading-relaxed"
            />
            <div className="flex justify-between text-xs text-[#787664] mt-1.5">
              <span>{koreanIdea.length}자 입력됨</span>
              <span>한글 작성이 끝나면 아래 버튼을 눌러주세요</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 text-xs font-medium text-[#787664] hover:bg-[#F5F2ED] rounded-xl transition-colors"
            >
              ← 이전 (주제 확인)
            </button>

            <button
              onClick={handleProceedFromStep2}
              className="px-6 py-2.5 bg-[#889E73] hover:bg-[#748B5F] text-white text-sm font-semibold rounded-xl transition-all shadow-xs inline-flex items-center space-x-2"
            >
              <span>3단계: 기초 영작 시작하기 (+1 XP)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Initial Draft + AI Hints */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl border border-[#E5E1D5] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EBF0E5] text-[#4F6839] border border-[#D5E0CC]">
                STEP 3 (기초 영작)
              </span>
              <h3 className="text-xl font-bold text-[#4A4A3A] mt-2">한글 생각을 바탕으로 영어로 써보세요</h3>
              <p className="text-xs text-[#787664] mt-1">
                틀려도 괜찮아요! 쉬운 단어로 아는 만큼 적어보세요. 막히면 'AI 힌트 받기'를 눌러보세요. (+2 XP)
              </p>
            </div>
            <div className="hidden sm:flex items-center px-3 py-1 bg-[#FAF8F3] border border-[#E8C07D] rounded-full text-[#4A4A3A] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-[#D98E73]" />
              완료 시 +2 XP
            </div>
          </div>

          {/* Student Korean Idea Reference */}
          <div className="p-4 bg-[#EBF0E5]/60 border border-[#D5E0CC] rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-[#4F6839]">내가 쓴 한글 생각:</span>
              <button
                onClick={() => setCurrentStep(2)}
                className="text-[11px] text-[#889E73] hover:underline font-medium"
              >
                한글 수정하기
              </button>
            </div>
            <p className="text-xs text-[#4A4A3A] leading-relaxed font-medium">{koreanIdea}</p>
          </div>

          {/* AI Hints Trigger & Results */}
          <div className="bg-[#FAF8F3] border border-[#E5E1D5] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-4 h-4 text-[#D98E73]" />
                <span className="text-xs font-bold text-[#4A4A3A]">중1 맞춤 AI 단어 및 문장 패턴 힌트</span>
              </div>
              <button
                type="button"
                onClick={handleRequestAiHints}
                disabled={loadingHints}
                className="px-3 py-1.5 bg-[#E8C07D] hover:bg-[#dfb56e] text-[#4A4A3A] rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs disabled:opacity-50"
              >
                {loadingHints ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{aiHints ? '힌트 다시 받기' : 'AI 힌트 받기'}</span>
              </button>
            </div>

            {aiHints && (
              <div className="pt-2 border-t border-[#E5E1D5] space-y-3">
                {aiHints.isAmbiguous ? (
                  <div className="bg-[#FFFBF0] border border-[#F5D8A5] rounded-xl p-4 text-xs space-y-2.5">
                    <div className="flex items-center gap-2 text-[#A86414] font-bold text-sm">
                      <HelpCircle className="w-4 h-4 text-[#D98E73]" />
                      <span>한글 생각을 조금만 더 구체적으로 적어볼까요?</span>
                    </div>
                    <p className="text-[#684C21] leading-relaxed">
                      {aiHints.clarificationMessage ||
                        '어떤 일이나 장소, 기분에 대해 쓰고 싶은지 조금만 더 구체적으로 적어주면 딱 맞는 멋진 영어 힌트를 줄게요!'}
                    </p>

                    {aiHints.guidingQuestions && aiHints.guidingQuestions.length > 0 && (
                      <div className="bg-white/90 p-3 rounded-lg border border-[#F5D8A5]/60 space-y-1.5 mt-1.5">
                        <span className="font-bold text-[#A86414] block text-[11px]">💡 이렇게 생각을 더 보완해보세요:</span>
                        <ul className="space-y-1 text-[#684C21] text-[11px] list-disc list-inside">
                          {aiHints.guidingQuestions.map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="px-3.5 py-1.5 bg-[#889E73] hover:bg-[#748B5F] text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center space-x-1.5 shadow-2xs"
                      >
                        <span>2단계로 가서 한글 생각 더 자세히 적기</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-[#4F6839] font-medium bg-[#EBF0E5] p-2.5 rounded-lg border border-[#D5E0CC]">
                      💬 {aiHints.cheeringMessage}
                    </p>

                    {aiHints.vocabHints?.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold text-[#4A4A3A] block mb-1.5">💡 쓸 수 있는 맞춤 영단어</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {aiHints.vocabHints.map((vh, i) => (
                            <div key={i} className="bg-white p-2.5 rounded-lg border border-[#E5E1D5] text-xs">
                              <p className="font-bold text-[#889E73]">{vh.english}</p>
                              <p className="text-[#787664] text-[11px]">{vh.korean}</p>
                              {vh.example && <p className="text-[10px] text-[#787664] mt-1">예: {vh.example}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiHints.sentencePatterns?.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold text-[#4A4A3A] block mb-1.5">📝 추천 맞춤 문장 패턴</span>
                        <div className="space-y-1.5">
                          {aiHints.sentencePatterns.map((sp, i) => (
                            <div key={i} className="bg-white p-2 rounded-lg border border-[#E5E1D5] text-xs flex justify-between">
                              <span className="font-mono text-[#4A4A3A]">{sp.pattern}</span>
                              <span className="text-[#787664] text-[11px]">{sp.meaning}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Initial Draft Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#4A4A3A]">나의 첫 영어 글 (초고)</label>
              <span className={`text-xs font-semibold ${currentWordCount >= minWords ? 'text-[#4F6839]' : 'text-[#D98E73]'}`}>
                {currentWordCount} / {minWords} 단어 ({currentWordCount >= minWords ? '목표 단어 달성!' : '조금 더 써보세요'})
              </span>
            </div>
            <textarea
              rows={6}
              value={initialDraft}
              onChange={(e) => setInitialDraft(e.target.value)}
              placeholder="Write your English sentences here... (예: My favorite season is fall. The weather is cool and sky is blue. I ride bike with my friend.)"
              className="w-full p-4 text-sm font-sans bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73] leading-relaxed"
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 text-xs font-medium text-[#787664] hover:bg-[#F5F2ED] rounded-xl transition-colors"
            >
              ← 이전 (한글 생각)
            </button>

            <button
              onClick={handleProceedToGrammarCheck}
              disabled={loadingGrammar}
              className="px-6 py-2.5 bg-[#889E73] hover:bg-[#748B5F] text-white text-sm font-semibold rounded-xl transition-all shadow-xs inline-flex items-center space-x-2 disabled:opacity-50"
            >
              {loadingGrammar ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI 선생님이 문법 검토 중...</span>
                </>
              ) : (
                <>
                  <span>4단계: 1차 AI 문법 검토 받기 (+2 XP)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: 1st AI Grammar Check */}
      {currentStep === 4 && (
        <div className="bg-white rounded-2xl border border-[#E5E1D5] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EBF0E5] text-[#4F6839] border border-[#D5E0CC]">
                STEP 4 (1차 AI 문법 수정)
              </span>
              <h3 className="text-xl font-bold text-[#4A4A3A] mt-2">문법을 바르게 다듬어 볼까요?</h3>
              <p className="text-xs text-[#787664] mt-1">
                중1 눈높이에 맞춰 친절하게 설명해 드릴게요. 설명을 확인하고 글을 수정해 보세요. (+1 XP)
              </p>
            </div>
            <div className="hidden sm:flex items-center px-3 py-1 bg-[#FAF8F3] border border-[#E8C07D] rounded-full text-[#4A4A3A] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-[#D98E73]" />
              완료 시 +1 XP
            </div>
          </div>

          {/* Praise message */}
          {grammarFeedback?.praiseMessage && (
            <div className="p-4 bg-[#EBF0E5] border border-[#D5E0CC] rounded-xl text-xs text-[#4F6839] flex items-start space-x-2">
              <Smile className="w-4 h-4 text-[#889E73] mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-[#4F6839] mb-0.5">선생님의 칭찬 한마디</p>
                <p>{grammarFeedback.praiseMessage}</p>
              </div>
            </div>
          )}

          {/* Grammar Corrections List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#4A4A3A] flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-[#889E73]" />
              문법 교정 안내 ({grammarFeedback?.corrections?.length || 0}건)
            </h4>

            {grammarFeedback?.corrections && grammarFeedback.corrections.length > 0 ? (
              <div className="space-y-2.5">
                {grammarFeedback.corrections.map((c, idx) => (
                  <div key={idx} className="p-3.5 bg-[#FAF8F3] border border-[#E5E1D5] rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center space-x-2 font-mono">
                      <span className="line-through text-[#D98E73] bg-[#FAF0EC] px-1.5 py-0.5 rounded">{c.original}</span>
                      <span className="text-[#787664]">→</span>
                      <span className="font-bold text-[#4F6839] bg-[#EBF0E5] px-1.5 py-0.5 rounded">{c.corrected}</span>
                    </div>
                    <p className="text-[#4A4A3A] font-sans text-xs">{c.explanation}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-[#EBF0E5] border border-[#D5E0CC] rounded-xl text-xs text-[#4F6839]">
                🎉 문법 오류가 거의 없이 아주 훌륭하게 잘 썼어요! 다음 단계로 바로 넘어가도 좋아요.
              </div>
            )}
          </div>

          {/* Improved draft preview */}
          {grammarFeedback?.improvedDraft && (
            <div className="p-4 bg-[#FAF8F3] border border-[#E5E1D5] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#4A4A3A]">문법을 다듬은 추천 문장:</span>
                <button
                  type="button"
                  onClick={() => setFinalWriting(grammarFeedback.improvedDraft)}
                  className="px-2.5 py-1 bg-[#889E73] hover:bg-[#748B5F] text-white rounded-lg text-[11px] font-semibold transition-colors"
                >
                  이 문안으로 적용하기
                </button>
              </div>
              <p className="text-xs font-mono text-[#4A4A3A] bg-white p-3 rounded-lg border border-[#E5E1D5]">
                {grammarFeedback.improvedDraft}
              </p>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 text-xs font-medium text-[#787664] hover:bg-[#F5F2ED] rounded-xl transition-colors"
            >
              ← 이전 (기초 영작)
            </button>

            <button
              onClick={() => handleProceedToExpressionExpansion(true)}
              disabled={loadingExpression}
              className="px-6 py-2.5 bg-[#889E73] hover:bg-[#748B5F] text-white text-sm font-semibold rounded-xl transition-all shadow-xs inline-flex items-center space-x-2 disabled:opacity-50"
            >
              {loadingExpression ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>2차 표현 확장 준비 중...</span>
                </>
              ) : (
                <>
                  <span>5단계: 2차 AI 표현 확장 제안 받기 (+1 XP)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: 2nd AI Expression Expansion */}
      {currentStep === 5 && (
        <div className="bg-white rounded-2xl border border-[#E5E1D5] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EBF0E5] text-[#4F6839] border border-[#D5E0CC]">
                STEP 5 (2차 AI 표현 확장)
              </span>
              <h3 className="text-xl font-bold text-[#4A4A3A] mt-2">감정과 디테일을 풍부하게 더해볼까요?</h3>
              <p className="text-xs text-[#787664] mt-1">
                글이 더 생생해지도록 딱 1가지 표현(기분 형용사나 수식어)을 덧붙여보세요! (+1 XP)
              </p>
            </div>
            <div className="hidden sm:flex items-center px-3 py-1 bg-[#FAF8F3] border border-[#E8C07D] rounded-full text-[#4A4A3A] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-[#D98E73]" />
              완료 시 +1 XP
            </div>
          </div>

          {/* Expression Suggestion Card */}
          {expressionSuggestion && (
            <div className="p-5 bg-[#FAF8F3] border border-[#E8C07D] rounded-2xl space-y-4">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 bg-[#E8C07D] text-[#4A4A3A] rounded-lg text-xs font-bold">
                  💡 이번에 더해볼 1가지 제안
                </span>
                <span className="text-sm font-bold text-[#4A4A3A]">{expressionSuggestion.suggestionTitle}</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-[#E5E1D5] text-xs text-[#4A4A3A] leading-relaxed">
                <p className="font-semibold text-[#889E73] mb-1">선생님의 안내:</p>
                <p>{expressionSuggestion.friendlyGuide}</p>
              </div>

              {expressionSuggestion.exampleKeywords?.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-[#4A4A3A] block mb-1.5">
                    추천 단어 (클릭하여 글에 덧붙여 보세요):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {expressionSuggestion.exampleKeywords.map((kw, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const cleanWord = kw.split('(')[0].trim();
                          setFinalWriting((prev) => `${prev} ${cleanWord}`);
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-[#FAF0EC] text-[#A75336] border border-[#F2D5CB] rounded-xl text-xs font-semibold transition-colors shadow-2xs"
                      >
                        + {kw}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {expressionSuggestion.exampleResult && (
                <div className="p-3 bg-white rounded-xl text-xs text-[#787664] border border-[#E5E1D5]">
                  <span className="font-bold text-[#4A4A3A] mr-2">참고 예시:</span>
                  <span className="font-mono text-[#4A4A3A]">{expressionSuggestion.exampleResult}</span>
                </div>
              )}
            </div>
          )}

          {/* Final Writing Polishing Editor */}
          <div>
            <label className="block text-xs font-bold text-[#4A4A3A] mb-1.5">
              표현을 덧붙여 완성하는 나의 영작
            </label>
            <textarea
              rows={6}
              value={finalWriting}
              onChange={(e) => setFinalWriting(e.target.value)}
              placeholder="표현 확장을 반영하여 자연스러운 문장으로 가다듬어 보세요..."
              className="w-full p-4 text-sm font-sans bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73] leading-relaxed"
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setCurrentStep(4)}
              className="px-4 py-2 text-xs font-medium text-[#787664] hover:bg-[#F5F2ED] rounded-xl transition-colors"
            >
              ← 이전 (1차 문법 검토)
            </button>

            <button
              onClick={handleProceedToFinalStep}
              className="px-6 py-2.5 bg-[#889E73] hover:bg-[#748B5F] text-white text-sm font-semibold rounded-xl transition-all shadow-xs inline-flex items-center space-x-2"
            >
              <span>6단계: 최종 점검 및 제출 (+1 XP)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: Final Review & Submission */}
      {currentStep === 6 && (
        <div className="bg-white rounded-2xl border border-[#E5E1D5] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EBF0E5] text-[#4F6839] border border-[#D5E0CC]">
                STEP 6 (최종 제출 & 자기 평가)
              </span>
              <h3 className="text-xl font-bold text-[#4A4A3A] mt-2">나만의 멋진 영작이 완성되었습니다!</h3>
              <p className="text-xs text-[#787664] mt-1">
                처음 쓴 초고와 최종 완성된 글을 비교해보고, 자기 평가를 작성한 후 제출해 주세요. (+2 XP)
              </p>
            </div>
            <div className="hidden sm:flex items-center px-3 py-1 bg-[#FAF8F3] border border-[#E8C07D] rounded-full text-[#4A4A3A] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-[#D98E73]" />
              제출 시 +2 XP
            </div>
          </div>

          {/* Before & After Growth Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#FAF8F3] rounded-xl border border-[#E5E1D5]">
              <span className="text-xs font-bold text-[#787664] block mb-2">🌱 나의 기초 초고 (Step 3)</span>
              <p className="text-xs text-[#4A4A3A] font-mono leading-relaxed whitespace-pre-wrap">{initialDraft}</p>
            </div>

            <div className="p-4 bg-[#EBF0E5] rounded-xl border border-[#D5E0CC]">
              <span className="text-xs font-bold text-[#4F6839] block mb-2">✨ 최종 완성 영작 (Step 6)</span>
              <p className="text-xs text-[#4A4A3A] font-mono font-medium leading-relaxed whitespace-pre-wrap">
                {finalWriting}
              </p>
            </div>
          </div>

          {/* Self Assessment Form */}
          <div className="p-5 bg-[#FAF8F3] border border-[#E5E1D5] rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-[#4A4A3A]">📝 자기 평가 (스스로 돌아보기)</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#787664] mb-1.5 font-medium">이번 영작 난이도는 어땠나요?</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'easy', label: '쉬웠어요 😊' },
                    { id: 'moderate', label: '적당했어요 👍' },
                    { id: 'challenging', label: '어려웠어요 😅' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelfAssessment((prev) => ({ ...prev, difficulty: item.id as any }))}
                      className={`py-2 px-2 rounded-lg text-xs font-medium border transition-all ${
                        selfAssessment.difficulty === item.id
                          ? 'bg-[#889E73] text-white border-[#889E73] font-bold'
                          : 'bg-white text-[#4A4A3A] border-[#E5E1D5] hover:bg-[#F5F2ED]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#787664] mb-1.5 font-medium">완성한 글에 대한 만족도</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'great', label: '매우 만족 ⭐' },
                    { id: 'good', label: '뿌듯함 ✨' },
                    { id: 'effort', label: '더 노력할래요 💪' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelfAssessment((prev) => ({ ...prev, satisfaction: item.id as any }))}
                      className={`py-2 px-2 rounded-lg text-xs font-medium border transition-all ${
                        selfAssessment.satisfaction === item.id
                          ? 'bg-[#889E73] text-white border-[#889E73] font-bold'
                          : 'bg-white text-[#4A4A3A] border-[#E5E1D5] hover:bg-[#F5F2ED]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#787664] mb-1.5 font-medium">한 줄 소감 / 스스로에게 칭찬</label>
              <input
                type="text"
                value={selfAssessment.reflectionComment}
                onChange={(e) => setSelfAssessment((prev) => ({ ...prev, reflectionComment: e.target.value }))}
                placeholder="예: 한글로 먼저 생각하고 쓰니까 영작이 훨씬 쉬웠다!"
                className="w-full px-3.5 py-2 text-xs bg-white border border-[#E5E1D5] text-[#4A4A3A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73]"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setCurrentStep(5)}
              className="px-4 py-2 text-xs font-medium text-[#787664] hover:bg-[#F5F2ED] rounded-xl transition-colors"
            >
              ← 이전 (표현 확장)
            </button>

            <button
              onClick={handleFinalSubmit}
              disabled={submitting}
              className="px-8 py-3 bg-[#889E73] hover:bg-[#748B5F] text-white text-sm font-bold rounded-xl transition-all shadow-xs inline-flex items-center space-x-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>최종 제출 및 저장 중...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>최종 제출 완료 (+2 XP & 배지 확인)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
