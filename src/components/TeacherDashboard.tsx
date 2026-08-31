import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  PenTool,
  Award,
  Settings,
  Plus,
  Trash2,
  Edit3,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Eye,
  FileText,
  Save,
  Check,
  Shield,
  Search,
  BookOpen,
} from 'lucide-react';
import {
  ClassDoc,
  StudentDoc,
  DailyTopicDoc,
  WritingRecordDoc,
  ProcessAssessment,
  SettingsDoc,
} from '../types';
import {
  getClasses,
  saveClass,
  getStudentsByClass,
  saveStudent,
  batchSaveStudents,
  getDailyTopics,
  saveTopic,
  deleteTopic,
  getWritingRecordsByClass,
  saveWritingRecord,
  getSystemSettings,
  saveSystemSettings,
  testFirestoreConnection,
  initializeDefaultTopicsIfEmpty,
} from '../firebase/db';
import { sha256, maskName } from '../utils/crypto';

interface TeacherDashboardProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ currentTab, onTabChange }) => {
  // Global Data
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassDoc | null>(null);
  const [students, setStudents] = useState<StudentDoc[]>([]);
  const [topics, setTopics] = useState<DailyTopicDoc[]>([]);
  const [writingRecords, setWritingRecords] = useState<WritingRecordDoc[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Class Management State
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [newGradeYear, setNewGradeYear] = useState('2026');
  const [newGrade, setNewGrade] = useState(1);
  const [newClassNum, setNewClassNum] = useState(1);
  const [newClassPassword, setNewClassPassword] = useState('1234');
  const [newNameDisplay, setNewNameDisplay] = useState<'full' | 'masked'>('full');

  // Student Register State
  const [singleStudentNum, setSingleStudentNum] = useState<number>(1);
  const [singleStudentName, setSingleStudentName] = useState('');
  const [batchStudentText, setBatchStudentText] = useState('');
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Student Detail Modal (Password Reset & Teacher Notes)
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<StudentDoc | null>(null);
  const [editTeacherNotes, setEditTeacherNotes] = useState('');

  // Topic Management State
  const [showCreateTopicModal, setShowCreateTopicModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<DailyTopicDoc | null>(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [topicGuide, setTopicGuide] = useState('');
  const [topicVocab, setTopicVocab] = useState('');
  const [topicStarters, setTopicStarters] = useState('');
  const [topicCategory, setTopicCategory] = useState('Daily Life');
  const [topicMinWords, setTopicMinWords] = useState(20);
  const [topicPublished, setTopicPublished] = useState(true);
  const [aiGeneratingTopic, setAiGeneratingTopic] = useState(false);
  const [aiTopicCategory, setAiTopicCategory] = useState('Daily Life');
  const [aiTopicTheme, setAiTopicTheme] = useState('');

  // Process Assessment State
  const [selectedRecordForAssessment, setSelectedRecordForAssessment] = useState<WritingRecordDoc | null>(null);
  const [assessmentDraft, setAssessmentDraft] = useState<ProcessAssessment | null>(null);
  const [teacherCommentInput, setTeacherCommentInput] = useState('');
  const [aiGeneratingAssessment, setAiGeneratingAssessment] = useState(false);

  // System Diagnostics State
  const [firestoreStatus, setFirestoreStatus] = useState<{ testing: boolean; success?: boolean; latencyMs?: number; error?: string }>({ testing: false });
  const [geminiStatus, setGeminiStatus] = useState<{
    testing: boolean;
    success?: boolean;
    latencyMs?: number;
    modelUsed?: string;
    isFallback?: boolean;
    primaryModel?: string;
    fallbackModel?: string;
    error?: string;
  }>({ testing: false });
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [adminPasswordSuccess, setAdminPasswordSuccess] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadStudentsAndRecords(selectedClass.classId);
    }
  }, [selectedClass]);

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      await initializeDefaultTopicsIfEmpty();
      const [classList, topicList] = await Promise.all([getClasses(), getDailyTopics(false)]);
      setClasses(classList);
      setTopics(topicList);

      if (classList.length > 0) {
        setSelectedClass(classList[0]);
      }
    } catch (e) {
      console.error('loadInitialData error:', e);
    } finally {
      setLoadingData(false);
    }
  };

  const loadStudentsAndRecords = async (classId: string) => {
    try {
      const [stuList, recList] = await Promise.all([
        getStudentsByClass(classId),
        getWritingRecordsByClass(classId),
      ]);
      setStudents(stuList);
      setWritingRecords(recList);
      if (stuList.length > 0) {
        setSingleStudentNum(stuList[stuList.length - 1].studentNum + 1);
      }
    } catch (e) {
      console.error('loadStudentsAndRecords error:', e);
    }
  };

  // 1. Create Class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const classId = `${newGradeYear}-${newGrade}-${newClassNum}`;
    try {
      const passHash = await sha256(newClassPassword);
      const newCls: ClassDoc = {
        classId,
        gradeYear: newGradeYear,
        grade: newGrade,
        classNum: newClassNum,
        className: `${newGradeYear}학년도 ${newGrade}학년 ${newClassNum}반`,
        classPasswordHash: passHash,
        studentNameDisplay: newNameDisplay,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveClass(newCls);
      const updatedClasses = [...classes.filter((c) => c.classId !== classId), newCls];
      setClasses(updatedClasses);
      setSelectedClass(newCls);
      setShowCreateClassModal(false);
      showToast('새 학급이 성공적으로 생성되었습니다.');
    } catch (e) {
      console.error('handleCreateClass error:', e);
      alert('학급 생성 중 오류가 발생했습니다.');
    }
  };

  // 2. Update Class Name Display / Password
  const handleUpdateNameDisplay = async (display: 'full' | 'masked') => {
    if (!selectedClass) return;
    const updated = { ...selectedClass, studentNameDisplay: display, updatedAt: new Date().toISOString() };
    await saveClass(updated);
    setSelectedClass(updated);
    setClasses(classes.map((c) => (c.classId === updated.classId ? updated : c)));
    showToast(`학생 이름 표시가 '${display === 'masked' ? '마스킹(홍*동)' : '실명'}'으로 변경되었습니다.`);
  };

  // 3. Add Single Student
  const handleAddSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !singleStudentName.trim()) return;

    const studentKey = `${selectedClass.gradeYear}-${selectedClass.grade}-${selectedClass.classNum}-${String(singleStudentNum).padStart(2, '0')}`;
    try {
      const newStu: StudentDoc = {
        studentKey,
        classId: selectedClass.classId,
        gradeYear: selectedClass.gradeYear,
        grade: selectedClass.grade,
        classNum: selectedClass.classNum,
        studentNum: singleStudentNum,
        name: singleStudentName.trim(),
        passwordHash: null,
        isPasswordSet: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveStudent(newStu);
      const updated = [...students.filter((s) => s.studentKey !== studentKey), newStu].sort(
        (a, b) => a.studentNum - b.studentNum
      );
      setStudents(updated);
      setSingleStudentName('');
      setSingleStudentNum(singleStudentNum + 1);
      showToast(`${newStu.name} 학생이 등록되었습니다. (최초 로그인 시 학급 비밀번호로 인증)`);
    } catch (e) {
      console.error('handleAddSingleStudent error:', e);
    }
  };

  // 4. Batch Add Students
  const handleBatchAddStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !batchStudentText.trim()) return;

    const lines = batchStudentText.split('\n').filter((l) => l.trim().length > 0);
    const newStudents: StudentDoc[] = [];

    lines.forEach((line, idx) => {
      const parts = line.trim().split(/[\s,]+/);
      let sNum = idx + 1;
      let sName = '';

      if (parts.length >= 2 && !isNaN(Number(parts[0]))) {
        sNum = Number(parts[0]);
        sName = parts.slice(1).join(' ');
      } else {
        sName = parts.join(' ');
      }

      if (sName) {
        const studentKey = `${selectedClass.gradeYear}-${selectedClass.grade}-${selectedClass.classNum}-${String(sNum).padStart(2, '0')}`;
        newStudents.push({
          studentKey,
          classId: selectedClass.classId,
          gradeYear: selectedClass.gradeYear,
          grade: selectedClass.grade,
          classNum: selectedClass.classNum,
          studentNum: sNum,
          name: sName.trim(),
          passwordHash: null,
          isPasswordSet: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    try {
      await batchSaveStudents(newStudents);
      setShowBatchModal(false);
      setBatchStudentText('');
      loadStudentsAndRecords(selectedClass.classId);
      showToast(`${newStudents.length}명의 학생이 일괄 등록되었습니다.`);
    } catch (e) {
      console.error('handleBatchAddStudents error:', e);
      alert('일괄 등록 중 오류가 발생했습니다.');
    }
  };

  // 5. Reset Student Password
  const handleResetStudentPassword = async (student: StudentDoc) => {
    if (!confirm(`${student.name} 학생의 비밀번호를 초기화하시겠습니까?\n초기화 후 학생은 학급 비밀번호로 다시 인증하여 새 비밀번호를 설정하게 됩니다.`)) return;

    try {
      const updatedStu: StudentDoc = {
        ...student,
        passwordHash: null,
        isPasswordSet: false,
        updatedAt: new Date().toISOString(),
      };
      await saveStudent(updatedStu);
      setStudents(students.map((s) => (s.studentKey === student.studentKey ? updatedStu : s)));
      if (selectedStudentForEdit?.studentKey === student.studentKey) {
        setSelectedStudentForEdit(updatedStu);
      }
      showToast(`${student.name} 학생의 비밀번호가 초기화되었습니다.`);
    } catch (e) {
      console.error('Reset student password error:', e);
    }
  };

  // 6. Save Teacher Notes
  const handleSaveTeacherNotes = async () => {
    if (!selectedStudentForEdit) return;
    try {
      const updatedStu: StudentDoc = {
        ...selectedStudentForEdit,
        teacherNotes: editTeacherNotes,
        updatedAt: new Date().toISOString(),
      };
      await saveStudent(updatedStu);
      setStudents(students.map((s) => (s.studentKey === updatedStu.studentKey ? updatedStu : s)));
      setSelectedStudentForEdit(null);
      showToast('교사 관찰 메모가 저장되었습니다.');
    } catch (e) {
      console.error('Save teacher notes error:', e);
    }
  };

  // 7. Topic Management
  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim()) return;

    const topicId = editingTopic?.topicId || `topic-${Date.now()}`;
    const newTopic: DailyTopicDoc = {
      topicId,
      title: topicTitle.trim(),
      englishTitle: topicTitle.trim(),
      koreanTitle: topicTitle.trim(),
      category: topicCategory,
      description: topicDesc.trim(),
      guidePrompt: topicGuide.trim(),
      recommendedVocab: topicVocab.split(',').map((s) => s.trim()).filter(Boolean),
      sentenceStarters: topicStarters.split('\n').map((s) => s.trim()).filter(Boolean),
      minWords: topicMinWords || 20,
      isPublished: topicPublished,
      createdAt: editingTopic?.createdAt || new Date().toISOString(),
      createdBy: '교사 관리자',
    };

    try {
      await saveTopic(newTopic);
      setTopics([newTopic, ...topics.filter((t) => t.topicId !== topicId)]);
      setShowCreateTopicModal(false);
      setEditingTopic(null);
      resetTopicForm();
      showToast('주제가 저장되었습니다.');
    } catch (e) {
      console.error('Save topic error:', e);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm('이 주제를 삭제하시겠습니까?')) return;
    try {
      await deleteTopic(topicId);
      setTopics(topics.filter((t) => t.topicId !== topicId));
      showToast('주제가 삭제되었습니다.');
    } catch (e) {
      console.error('Delete topic error:', e);
    }
  };

  const handleTogglePublishTopic = async (topic: DailyTopicDoc) => {
    const updated = { ...topic, isPublished: !topic.isPublished };
    await saveTopic(updated);
    setTopics(topics.map((t) => (t.topicId === topic.topicId ? updated : t)));
    showToast(`주제가 '${updated.isPublished ? '학생 공개' : '비공개'}' 상태로 변경되었습니다.`);
  };

  const handleGenerateAiTopic = async () => {
    setAiGeneratingTopic(true);
    try {
      const res = await fetch('/api/gemini/generate-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: aiTopicCategory,
          customTheme: aiTopicTheme,
        }),
      });
      const data = await res.json();
      if (data.success && data.topic) {
        setTopicTitle(data.topic.title);
        setTopicDesc(data.topic.description);
        setTopicGuide(data.topic.guidePrompt);
        setTopicVocab(data.topic.recommendedVocab?.join(', ') || '');
        setTopicStarters(data.topic.sentenceStarters?.join('\n') || '');
        setTopicCategory(data.topic.category || aiTopicCategory);
        setTopicMinWords(data.topic.minWords || 20);
        showToast('중1 맞춤 AI 영작 주제가 생성되었습니다!');
      } else {
        alert('AI 주제 생성에 실패했습니다.');
      }
    } catch (e) {
      console.error('Generate AI topic error:', e);
    } finally {
      setAiGeneratingTopic(false);
    }
  };

  const resetTopicForm = () => {
    setTopicTitle('');
    setTopicDesc('');
    setTopicGuide('');
    setTopicVocab('');
    setTopicStarters('');
    setTopicCategory('Daily Life');
    setTopicMinWords(20);
    setTopicPublished(true);
  };

  // 8. Process-Oriented Assessment Draft & Approval
  const handleOpenAssessment = (rec: WritingRecordDoc) => {
    setSelectedRecordForAssessment(rec);
    if (rec.teacherAssessment) {
      setAssessmentDraft(rec.teacherAssessment);
    } else {
      setAssessmentDraft(null);
    }
    setTeacherCommentInput(rec.teacherComment || rec.teacherAssessment?.encouragementComment || '');
  };

  const handleGenerateAiAssessment = async () => {
    if (!selectedRecordForAssessment) return;
    setAiGeneratingAssessment(true);
    try {
      const student = students.find((s) => s.studentKey === selectedRecordForAssessment.studentKey);
      const res = await fetch('/api/gemini/process-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: student?.name || '학생',
          topicTitle: selectedRecordForAssessment.topicTitle,
          koreanIdea: selectedRecordForAssessment.koreanIdea,
          initialDraft: selectedRecordForAssessment.initialDraft,
          aiGrammarFeedback: selectedRecordForAssessment.aiGrammarFeedback,
          aiExpressionSuggestion: selectedRecordForAssessment.aiExpressionSuggestion,
          finalWriting: selectedRecordForAssessment.finalWriting,
          selfAssessment: selectedRecordForAssessment.selfAssessment,
        }),
      });
      const data = await res.json();
      if (data.success && data.assessment) {
        setAssessmentDraft(data.assessment);
        setTeacherCommentInput(data.assessment.encouragementComment || '');
        showToast('과정중심평가 초안이 성공적으로 생성되었습니다.');
      } else {
        alert('과정중심평가 생성 실패');
      }
    } catch (e) {
      console.error('Generate process assessment error:', e);
    } finally {
      setAiGeneratingAssessment(false);
    }
  };

  const handleApproveAssessment = async () => {
    if (!selectedRecordForAssessment || !assessmentDraft) return;

    try {
      const updatedRecord: WritingRecordDoc = {
        ...selectedRecordForAssessment,
        teacherAssessment: {
          ...assessmentDraft,
          encouragementComment: teacherCommentInput,
        },
        teacherAssessmentApproved: true,
        teacherComment: teacherCommentInput,
        updatedAt: new Date().toISOString(),
      };
      await saveWritingRecord(updatedRecord);
      setWritingRecords(writingRecords.map((r) => (r.recordId === updatedRecord.recordId ? updatedRecord : r)));
      setSelectedRecordForAssessment(null);
      showToast('과정중심평가가 공식 승인되어 학생 기록에 반영되었습니다.');
    } catch (e) {
      console.error('Approve assessment error:', e);
    }
  };

  // 9. Diagnostics
  const handleTestFirestore = async () => {
    setFirestoreStatus({ testing: true });
    const res = await testFirestoreConnection();
    setFirestoreStatus({ testing: false, success: res.success, latencyMs: res.latencyMs, error: res.error });
  };

  const handleTestGemini = async () => {
    setGeminiStatus({ testing: true });
    try {
      const res = await fetch('/api/gemini/test-connection', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setGeminiStatus({
          testing: false,
          success: true,
          latencyMs: data.latencyMs,
          modelUsed: data.modelUsed,
          isFallback: data.isFallback,
          primaryModel: data.primaryModel,
          fallbackModel: data.fallbackModel,
        });
      } else {
        setGeminiStatus({
          testing: false,
          success: false,
          error: data.error,
          primaryModel: data.primaryModel,
          fallbackModel: data.fallbackModel,
        });
      }
    } catch (e: any) {
      setGeminiStatus({ testing: false, success: false, error: e?.message });
    }
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminPassword.length < 6) {
      alert('비밀번호는 6자리 이상이어야 합니다.');
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      alert('비밀번호와 확인이 일치하지 않습니다.');
      return;
    }

    try {
      const hash = await sha256(newAdminPassword);
      await saveSystemSettings({ adminPasswordHash: hash });
      setAdminPasswordSuccess(true);
      setNewAdminPassword('');
      setConfirmAdminPassword('');
      setTimeout(() => setAdminPasswordSuccess(false), 3000);
      showToast('관리자 비밀번호가 성공적으로 변경되었습니다.');
    } catch (e) {
      console.error('Change admin password error:', e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#4A4A3A] text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold flex items-center space-x-2 border border-[#787664] animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#889E73]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Class Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E1D5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3 overflow-x-auto pb-2 sm:pb-0">
          <span className="text-xs font-bold text-[#787664] shrink-0">학급 선택:</span>
          {classes.map((c) => (
            <button
              key={c.classId}
              onClick={() => setSelectedClass(c)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedClass?.classId === c.classId
                  ? 'bg-[#889E73] text-white shadow-xs'
                  : 'bg-[#FAF8F3] text-[#4A4A3A] hover:bg-[#F5F2ED] border border-[#E5E1D5]'
              }`}
            >
              {c.className}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowCreateClassModal(true)}
          className="px-3.5 py-1.5 bg-[#4A4A3A] hover:bg-[#38382c] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-1.5 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>새 학급 개설</span>
        </button>
      </div>

      {/* TAB 1: Class & Students Management */}
      {currentTab === 'classes' && selectedClass && (
        <div className="space-y-6">
          {/* Class Config Card */}
          <div className="bg-white p-6 rounded-3xl border border-[#E5E1D5] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E1D5] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#4A4A3A]">{selectedClass.className} 현황</h3>
                <p className="text-xs text-[#787664]">
                  학급 ID: <code className="font-mono">{selectedClass.classId}</code> | 등록 학생: {students.length}명 |
                  제출 완료: {writingRecords.filter((r) => r.status === 'completed').length}건
                </p>
              </div>

              {/* Name display mask toggle */}
              <div className="flex items-center space-x-2 bg-[#FAF8F3] p-1.5 rounded-xl border border-[#E5E1D5]">
                <span className="text-xs text-[#787664] font-medium pl-1">이름 표시:</span>
                <button
                  onClick={() => handleUpdateNameDisplay('full')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    selectedClass.studentNameDisplay === 'full'
                      ? 'bg-white text-[#4F6839] shadow-xs border border-[#D5E0CC]'
                      : 'text-[#787664] hover:text-[#4A4A3A]'
                  }`}
                >
                  실명 (홍길동)
                </button>
                <button
                  onClick={() => handleUpdateNameDisplay('masked')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    selectedClass.studentNameDisplay === 'masked'
                      ? 'bg-white text-[#4F6839] shadow-xs border border-[#D5E0CC]'
                      : 'text-[#787664] hover:text-[#4A4A3A]'
                  }`}
                >
                  마스킹 (홍*동)
                </button>
              </div>
            </div>

            {/* Quick Register Row */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <form onSubmit={handleAddSingleStudent} className="flex gap-2 flex-1">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={singleStudentNum}
                  onChange={(e) => setSingleStudentNum(Number(e.target.value))}
                  placeholder="번호"
                  className="w-20 px-3 py-2 text-xs bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73]"
                  required
                />
                <input
                  type="text"
                  value={singleStudentName}
                  onChange={(e) => setSingleStudentName(e.target.value)}
                  placeholder="학생 이름 입력"
                  className="flex-1 px-3 py-2 text-xs bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73]"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#889E73] hover:bg-[#748B5F] text-white rounded-xl text-xs font-bold shrink-0 shadow-xs"
                >
                  학생 등록
                </button>
              </form>

              <button
                onClick={() => setShowBatchModal(true)}
                className="px-4 py-2 bg-[#FAF8F3] hover:bg-[#F5F2ED] text-[#4A4A3A] border border-[#E5E1D5] rounded-xl text-xs font-bold shrink-0 flex items-center space-x-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-[#889E73]" />
                <span>여러 명 일괄 등록 (명렬표 붙여넣기)</span>
              </button>
            </div>
          </div>

          {/* Student Roster Table */}
          <div className="bg-white rounded-3xl border border-[#E5E1D5] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E5E1D5] flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#4A4A3A]">학급 학생 명단 ({students.length}명)</h4>
              <span className="text-xs text-[#787664]">
                비밀번호 미설정 학생은 학급 비밀번호로 첫 로그인 시 개인 비밀번호를 생성합니다.
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F3] text-[#787664] font-semibold border-b border-[#E5E1D5]">
                  <tr>
                    <th className="p-3 pl-6">번호</th>
                    <th className="p-3">이름</th>
                    <th className="p-3">Student Key</th>
                    <th className="p-3">비밀번호 상태</th>
                    <th className="p-3">영작 활동</th>
                    <th className="p-3">교사 메모</th>
                    <th className="p-3 pr-6 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E1D5]">
                  {students.map((stu) => {
                    const displayName =
                      selectedClass.studentNameDisplay === 'masked' ? maskName(stu.name) : stu.name;
                    const studentRecords = writingRecords.filter((r) => r.studentKey === stu.studentKey);
                    const completed = studentRecords.filter((r) => r.status === 'completed').length;

                    return (
                      <tr key={stu.studentKey} className="hover:bg-[#FAF8F3]/80 transition-colors">
                        <td className="p-3 pl-6 font-bold text-[#4A4A3A]">{stu.studentNum}번</td>
                        <td className="p-3 font-semibold text-[#4A4A3A]">{displayName}</td>
                        <td className="p-3 font-mono text-[#787664] text-[11px]">{stu.studentKey}</td>
                        <td className="p-3">
                          {stu.isPasswordSet ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF0E5] text-[#4F6839] border border-[#D5E0CC]">
                              ✓ 설정됨
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F3] text-[#A75336] border border-[#F2D5CB]">
                              최초 대기
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="text-[#4A4A3A] font-medium">
                            완성 {completed}편 / 작성 중 {studentRecords.length - completed}편
                          </span>
                        </td>
                        <td className="p-3 text-[#787664] truncate max-w-xs">{stu.teacherNotes || '-'}</td>
                        <td className="p-3 pr-6 text-right space-x-2">
                          <button
                            onClick={() => {
                              setSelectedStudentForEdit(stu);
                              setEditTeacherNotes(stu.teacherNotes || '');
                            }}
                            className="px-2.5 py-1 bg-[#FAF8F3] hover:bg-[#F5F2ED] text-[#4A4A3A] border border-[#E5E1D5] rounded-lg text-[11px] font-bold"
                          >
                            메모
                          </button>
                          <button
                            onClick={() => handleResetStudentPassword(stu)}
                            className="px-2.5 py-1 bg-[#FAF0EC] hover:bg-[#F8E0D7] text-[#A75336] border border-[#F2D5CB] rounded-lg text-[11px] font-bold"
                          >
                            비번 초기화
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#787664]">
                        등록된 학생이 없습니다. 위에서 학생을 등록해 주세요.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Topics Management */}
      {currentTab === 'topics' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#4A4A3A]">영작 주제 관리</h3>
              <p className="text-xs text-[#787664]">학생들에게 제시할 일상/학교생활 주제를 등록하고 수정합니다.</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  resetTopicForm();
                  setEditingTopic(null);
                  setShowCreateTopicModal(true);
                }}
                className="px-4 py-2 bg-[#889E73] hover:bg-[#748B5F] text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>새 주제 직접 작성</span>
              </button>
            </div>
          </div>

          {/* AI Generator Box */}
          <div className="bg-[#FAF8F3] p-5 rounded-3xl border border-[#E8C07D] space-y-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-[#889E73]" />
              <h4 className="text-sm font-bold text-[#4A4A3A]">Gemini 중1 맞춤 영작 주제 자동 생성</h4>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={aiTopicCategory}
                onChange={(e) => setAiTopicCategory(e.target.value)}
                className="px-3 py-2 bg-white border border-[#E5E1D5] text-[#4A4A3A] rounded-xl text-xs focus:outline-none focus:border-[#889E73]"
              >
                <option value="Daily Life">일상 생활 (Daily Life)</option>
                <option value="School">학교 생활 (School)</option>
                <option value="Hobby">취미 & 여가 (Hobby)</option>
                <option value="Food">음식 (Food)</option>
                <option value="Future">미래 & 꿈 (Future)</option>
                <option value="Emotion">감정 & 추억 (Emotion)</option>
              </select>

              <input
                type="text"
                value={aiTopicTheme}
                onChange={(e) => setAiTopicTheme(e.target.value)}
                placeholder="희망 테마/키워드 (선택, 예: 가을 운동회, 반려동물)"
                className="flex-1 px-3 py-2 bg-white border border-[#E5E1D5] text-[#4A4A3A] rounded-xl text-xs focus:outline-none focus:border-[#889E73]"
              />

              <button
                onClick={handleGenerateAiTopic}
                disabled={aiGeneratingTopic}
                className="px-5 py-2 bg-[#889E73] hover:bg-[#748B5F] text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs disabled:opacity-50"
              >
                {aiGeneratingTopic ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>주제 생성 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI 주제 추천받기</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Topics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topics.map((t) => (
              <div
                key={t.topicId}
                className="bg-white rounded-3xl border border-[#E5E1D5] p-6 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FAF0EC] text-[#A75336] border border-[#F2D5CB]">
                      {t.category}
                    </span>
                    <button
                      onClick={() => handleTogglePublishTopic(t)}
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold transition-colors ${
                        t.isPublished
                          ? 'bg-[#EBF0E5] text-[#4F6839] border border-[#D5E0CC]'
                          : 'bg-[#FAF8F3] text-[#787664] border border-[#E5E1D5]'
                      }`}
                    >
                      {t.isPublished ? '✓ 학생 공개' : '비공개'}
                    </button>
                  </div>

                  <h4 className="text-base font-bold text-[#4A4A3A] mt-1">{t.title}</h4>
                  <p className="text-xs text-[#787664] mt-1.5 leading-relaxed line-clamp-2">{t.description}</p>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {t.recommendedVocab?.slice(0, 5).map((v, i) => (
                      <span key={i} className="text-[11px] px-2 py-0.5 bg-[#FAF8F3] text-[#4A4A3A] rounded-md border border-[#E5E1D5]">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[#E5E1D5] flex items-center justify-between text-xs">
                  <span className="text-[#787664]">최소 {t.minWords || 20}단어</span>
                  <div className="space-x-2">
                    <button
                      onClick={() => {
                        setEditingTopic(t);
                        setTopicTitle(t.title);
                        setTopicDesc(t.description);
                        setTopicGuide(t.guidePrompt);
                        setTopicVocab(t.recommendedVocab?.join(', ') || '');
                        setTopicStarters(t.sentenceStarters?.join('\n') || '');
                        setTopicCategory(t.category);
                        setTopicMinWords(t.minWords);
                        setTopicPublished(t.isPublished);
                        setShowCreateTopicModal(true);
                      }}
                      className="text-[#4A4A3A] hover:text-[#889E73] font-bold"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteTopic(t.topicId)}
                      className="text-[#A75336] hover:text-[#782813] font-bold"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Process-Oriented Assessment */}
      {currentTab === 'assessments' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-[#4A4A3A]">과정중심평가 대시보드</h3>
            <p className="text-xs text-[#787664]">
              한글 구상부터 초고, 문법 피드백 수용, 표현 확장 반영, 최종 영작까지 전체 글쓰기 과정을 관찰하고 평가합니다.
            </p>
          </div>

          {/* Records Table for Assessment */}
          <div className="bg-white rounded-3xl border border-[#E5E1D5] shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F3] text-[#787664] font-semibold border-b border-[#E5E1D5]">
                <tr>
                  <th className="p-3.5 pl-6">학생 이름</th>
                  <th className="p-3.5">글쓰기 주제</th>
                  <th className="p-3.5">진행 단계</th>
                  <th className="p-3.5">최종 영작 미리보기</th>
                  <th className="p-3.5">평가 승인 상태</th>
                  <th className="p-3.5 pr-6 text-right">과정 평가하기</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E1D5]">
                {writingRecords.map((rec) => {
                  const student = students.find((s) => s.studentKey === rec.studentKey);
                  const sName = student
                    ? selectedClass?.studentNameDisplay === 'masked'
                      ? maskName(student.name)
                      : student.name
                    : rec.studentKey;

                  return (
                    <tr key={rec.recordId} className="hover:bg-[#FAF8F3]/80 transition-colors">
                      <td className="p-3.5 pl-6 font-bold text-[#4A4A3A]">{sName}</td>
                      <td className="p-3.5 font-semibold text-[#4A4A3A]">{rec.topicTitle}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.status === 'completed'
                              ? 'bg-[#EBF0E5] text-[#4F6839] border border-[#D5E0CC]'
                              : 'bg-[#FAF8F3] text-[#A75336] border border-[#F2D5CB]'
                          }`}
                        >
                          {rec.status === 'completed' ? '제출 완료' : `작성 중 (Step ${rec.currentStep})`}
                        </span>
                      </td>
                      <td className="p-3.5 text-[#787664] font-mono truncate max-w-xs">
                        {rec.finalWriting || rec.initialDraft || rec.koreanIdea}
                      </td>
                      <td className="p-3.5">
                        {rec.teacherAssessmentApproved ? (
                          <span className="text-[#4F6839] font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> 승인 완료
                          </span>
                        ) : rec.teacherAssessment ? (
                          <span className="text-[#D98E73] font-bold">초안 작성됨</span>
                        ) : (
                          <span className="text-[#787664]">미평가</span>
                        )}
                      </td>
                      <td className="p-3.5 pr-6 text-right">
                        <button
                          onClick={() => handleOpenAssessment(rec)}
                          className="px-3.5 py-1.5 bg-[#EBF0E5] hover:bg-[#D5E0CC] text-[#4F6839] font-bold rounded-xl text-xs transition-colors border border-[#D5E0CC]"
                        >
                          과정 평가 열기
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {writingRecords.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#787664]">
                      제출되거나 작성 중인 영작 기록이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: System Diagnostics & Settings */}
      {currentTab === 'settings' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-[#4A4A3A]">시스템 진단 및 관리자 설정</h3>
            <p className="text-xs text-[#787664]">Firebase Firestore 및 Gemini API의 실제 연동 상태를 테스트합니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Live Diagnostics Card */}
            <div className="bg-white p-6 rounded-3xl border border-[#E5E1D5] shadow-xs space-y-5">
              <h4 className="text-sm font-bold text-[#4A4A3A] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#889E73]" />
                실시간 연동 상태 진단 (Live Health Test)
              </h4>

              {/* Firestore Test */}
              <div className="p-4 bg-[#FAF8F3] rounded-2xl border border-[#E5E1D5] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#4A4A3A]">Firebase Firestore 상태</span>
                  <button
                    onClick={handleTestFirestore}
                    disabled={firestoreStatus.testing}
                    className="px-3 py-1 bg-white border border-[#E5E1D5] hover:bg-[#F5F2ED] rounded-lg text-xs font-bold text-[#4A4A3A]"
                  >
                    {firestoreStatus.testing ? '테스트 중...' : '실제 쓰기/읽기 테스트'}
                  </button>
                </div>
                {firestoreStatus.success !== undefined && (
                  <div
                    className={`text-xs p-2.5 rounded-xl font-medium ${
                      firestoreStatus.success
                        ? 'bg-[#EBF0E5] text-[#4F6839] border border-[#D5E0CC]'
                        : 'bg-[#FAF0EC] text-[#A75336] border border-[#F2D5CB]'
                    }`}
                  >
                    {firestoreStatus.success
                      ? `✓ 정상 연결됨 (응답 시간: ${firestoreStatus.latencyMs}ms)`
                      : `오류: ${firestoreStatus.error}`}
                  </div>
                )}
              </div>

              {/* Gemini Dual-Model Test */}
              <div className="p-4 bg-[#FAF8F3] rounded-2xl border border-[#E5E1D5] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#4A4A3A]">Gemini AI 듀얼 엔진 상태</span>
                      <span className="px-1.5 py-0.5 bg-[#EBF0E5] text-[#4F6839] text-[10px] font-bold rounded-md">
                        자동 복구 백업
                      </span>
                    </div>
                    <p className="text-[11px] text-[#787664] mt-0.5">
                      주 모델: <code className="text-[#889E73] font-bold">gemini-3.6-flash</code> | 보조 모델: <code className="text-[#A75336] font-bold">gemini-3.7-flash</code>
                    </p>
                  </div>
                  <button
                    onClick={handleTestGemini}
                    disabled={geminiStatus.testing}
                    className="px-3 py-1.5 bg-white border border-[#E5E1D5] hover:bg-[#F5F2ED] rounded-xl text-xs font-bold text-[#4A4A3A] transition-colors shrink-0 shadow-2xs"
                  >
                    {geminiStatus.testing ? '통신 진단 중...' : '연결 점검'}
                  </button>
                </div>
                {geminiStatus.success !== undefined && (
                  <div
                    className={`text-xs p-3 rounded-xl font-medium space-y-1 ${
                      geminiStatus.success
                        ? 'bg-[#EBF0E5] text-[#4F6839] border border-[#D5E0CC]'
                        : 'bg-[#FAF0EC] text-[#A75336] border border-[#F2D5CB]'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>{geminiStatus.success ? '✓ Gemini AI 엔진 정상 작동 중' : '✗ 통신 실패'}</span>
                      {geminiStatus.latencyMs !== undefined && <span>{geminiStatus.latencyMs}ms</span>}
                    </div>
                    {geminiStatus.success ? (
                      <p className="text-[11px] opacity-90">
                        응답 모델: <strong>{geminiStatus.modelUsed || 'gemini-3.6-flash'}</strong>
                        {geminiStatus.isFallback ? ' (주 모델 오류로 보조 모델 자동 전환됨)' : ' (주 모델 정상 응답)'}
                      </p>
                    ) : (
                      <p className="text-[11px]">오류 내용: {geminiStatus.error}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Change Admin Password Card */}
            <div className="bg-white p-6 rounded-3xl border border-[#E5E1D5] shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-[#4A4A3A] flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#889E73]" />
                교사 관리자 비밀번호 변경
              </h4>

              {adminPasswordSuccess && (
                <div className="p-3 bg-[#EBF0E5] text-[#4F6839] border border-[#D5E0CC] rounded-xl text-xs font-bold">
                  ✓ 비밀번호가 성공적으로 변경되었습니다.
                </div>
              )}

              <form onSubmit={handleChangeAdminPassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#4A4A3A] mb-1">새 관리자 비밀번호</label>
                  <input
                    type="password"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="6자리 이상 입력"
                    className="w-full px-3 py-2 text-xs bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl focus:outline-none focus:border-[#889E73]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4A4A3A] mb-1">새 관리자 비밀번호 확인</label>
                  <input
                    type="password"
                    value={confirmAdminPassword}
                    onChange={(e) => setConfirmAdminPassword(e.target.value)}
                    placeholder="비밀번호 다시 입력"
                    className="w-full px-3 py-2 text-xs bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl focus:outline-none focus:border-[#889E73]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#4A4A3A] hover:bg-[#38382c] text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  관리자 비밀번호 변경 저장
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Create Class */}
      {showCreateClassModal && (
        <div className="fixed inset-0 z-50 bg-[#4A4A3A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-[#E5E1D5] p-6 sm:p-8 space-y-4">
            <h3 className="text-lg font-bold text-[#4A4A3A]">새 학급 개설</h3>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#4A4A3A] mb-1">학년도</label>
                  <input
                    type="text"
                    value={newGradeYear}
                    onChange={(e) => setNewGradeYear(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl focus:outline-none focus:border-[#889E73]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#4A4A3A] mb-1">학년</label>
                  <select
                    value={newGrade}
                    onChange={(e) => setNewGrade(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl focus:outline-none focus:border-[#889E73]"
                  >
                    <option value={1}>1학년</option>
                    <option value={2}>2학년</option>
                    <option value={3}>3학년</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A4A3A] mb-1">반 번호</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={newClassNum}
                  onChange={(e) => setNewClassNum(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl focus:outline-none focus:border-[#889E73]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A4A3A] mb-1">
                  학급 비밀번호 (학생 최초 로그인/초기화 시 인증용)
                </label>
                <input
                  type="password"
                  value={newClassPassword}
                  onChange={(e) => setNewClassPassword(e.target.value)}
                  placeholder="예: 1234"
                  className="w-full px-3 py-2 text-xs bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl focus:outline-none focus:border-[#889E73]"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateClassModal(false)}
                  className="px-4 py-2 bg-[#FAF8F3] text-[#787664] hover:bg-[#F5F2ED] rounded-xl text-xs font-bold border border-[#E5E1D5]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#889E73] hover:bg-[#748B5F] text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  학급 개설
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Batch Add Students */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-[#4A4A3A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-[#E5E1D5] p-6 sm:p-8 space-y-4">
            <h3 className="text-lg font-bold text-[#4A4A3A]">학생 일괄(여러 줄) 등록</h3>
            <p className="text-xs text-[#787664]">
              학급 명렬표를 복사하여 붙여넣으세요. (줄마다 '번호 이름' 또는 '이름' 형식)
            </p>

            <form onSubmit={handleBatchAddStudents} className="space-y-4">
              <textarea
                rows={8}
                value={batchStudentText}
                onChange={(e) => setBatchStudentText(e.target.value)}
                placeholder="1 강민수&#10;2 김도윤&#10;3 박지민&#10;4 이서진"
                className="w-full p-3 font-mono text-xs bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl leading-relaxed focus:outline-none focus:border-[#889E73]"
                required
              />

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 bg-[#FAF8F3] text-[#787664] hover:bg-[#F5F2ED] rounded-xl text-xs font-bold border border-[#E5E1D5]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#889E73] hover:bg-[#748B5F] text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  일괄 등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Edit Student Notes */}
      {selectedStudentForEdit && (
        <div className="fixed inset-0 z-50 bg-[#4A4A3A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-[#E5E1D5] p-6 space-y-4">
            <h3 className="text-base font-bold text-[#4A4A3A]">
              {selectedStudentForEdit.name} 학생 교사 메모
            </h3>

            <textarea
              rows={4}
              value={editTeacherNotes}
              onChange={(e) => setEditTeacherNotes(e.target.value)}
              placeholder="학생의 영작 습관, 지도 포인트, 관찰 내용 등을 기록하세요..."
              className="w-full p-3 text-xs bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl leading-relaxed focus:outline-none focus:border-[#889E73]"
            />

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setSelectedStudentForEdit(null)}
                className="px-4 py-2 bg-[#FAF8F3] text-[#787664] hover:bg-[#F5F2ED] rounded-xl text-xs font-bold border border-[#E5E1D5]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveTeacherNotes}
                className="px-5 py-2 bg-[#889E73] hover:bg-[#748B5F] text-white rounded-xl text-xs font-bold shadow-xs"
              >
                메모 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Create/Edit Topic */}
      {showCreateTopicModal && (
        <div className="fixed inset-0 z-50 bg-[#4A4A3A]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-[#E5E1D5] p-6 sm:p-8 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-[#4A4A3A]">
              {editingTopic ? '주제 수정' : '새 영작 주제 등록'}
            </h3>

            <form onSubmit={handleSaveTopic} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#4A4A3A] mb-1">카테고리</label>
                  <select
                    value={topicCategory}
                    onChange={(e) => setTopicCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl focus:outline-none focus:border-[#889E73]"
                  >
                    <option value="Daily Life">일상 생활 (Daily Life)</option>
                    <option value="School">학교 생활 (School)</option>
                    <option value="Hobby">취미 & 여가 (Hobby)</option>
                    <option value="Food">음식 (Food)</option>
                    <option value="Future">미래 & 꿈 (Future)</option>
                    <option value="Emotion">감정 & 추억 (Emotion)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#4A4A3A] mb-1">최소 단어 수 (Word count)</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={topicMinWords}
                    onChange={(e) => setTopicMinWords(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl focus:outline-none focus:border-[#889E73]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#4A4A3A] mb-1">주제 제목</label>
                <input
                  type="text"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  placeholder="예: My Favorite Season / 내가 가장 좋아하는 계절"
                  className="w-full px-3 py-2 text-sm bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl focus:outline-none focus:border-[#889E73]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A4A3A] mb-1">학생 안내 설명</label>
                <textarea
                  rows={2}
                  value={topicDesc}
                  onChange={(e) => setTopicDesc(e.target.value)}
                  placeholder="학생의 흥미를 유도하는 친절한 설명"
                  className="w-full p-3 bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl focus:outline-none focus:border-[#889E73]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A4A3A] mb-1">생각해보기 질문 가이드 (줄바꿈 구분)</label>
                <textarea
                  rows={3}
                  value={topicGuide}
                  onChange={(e) => setTopicGuide(e.target.value)}
                  placeholder="1. 어떤 계절을 좋아하나요?&#10;2. 그 계절에 무엇을 하나요?"
                  className="w-full p-3 bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl focus:outline-none focus:border-[#889E73]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A4A3A] mb-1">추천 어휘 힌트 (쉼표로 구분)</label>
                <input
                  type="text"
                  value={topicVocab}
                  onChange={(e) => setTopicVocab(e.target.value)}
                  placeholder="spring(봄), summer(여름), warm(따뜻한)"
                  className="w-full px-3 py-2 bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl focus:outline-none focus:border-[#889E73]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A4A3A] mb-1">문장 시작 패턴 (줄바꿈 구분)</label>
                <textarea
                  rows={2}
                  value={topicStarters}
                  onChange={(e) => setTopicStarters(e.target.value)}
                  placeholder="My favorite season is...&#10;I like to..."
                  className="w-full p-3 font-mono bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-xl focus:outline-none focus:border-[#889E73]"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="pubTopicCheck"
                  checked={topicPublished}
                  onChange={(e) => setTopicPublished(e.target.checked)}
                  className="w-4 h-4 text-[#889E73] rounded"
                />
                <label htmlFor="pubTopicCheck" className="font-bold text-[#4A4A3A]">
                  학생 화면에 즉시 공개
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTopicModal(false)}
                  className="px-4 py-2 bg-[#FAF8F3] text-[#787664] hover:bg-[#F5F2ED] rounded-xl font-bold border border-[#E5E1D5]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#889E73] hover:bg-[#748B5F] text-white rounded-xl font-bold shadow-xs"
                >
                  주제 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Process Assessment Inspector & AI Drafting */}
      {selectedRecordForAssessment && (
        <div className="fixed inset-0 z-50 bg-[#4A4A3A]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-[#E5E1D5] p-6 sm:p-8 space-y-6 my-8 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-[#E5E1D5] pb-4">
              <div>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#EBF0E5] text-[#4F6839] border border-[#D5E0CC]">
                  과정중심평가 (Process Assessment)
                </span>
                <h3 className="text-lg font-bold text-[#4A4A3A] mt-1">
                  {selectedRecordForAssessment.topicTitle}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecordForAssessment(null)}
                className="text-[#787664] hover:text-[#4A4A3A] font-bold"
              >
                ✕
              </button>
            </div>

            {/* Whole Process Evolution Timeline */}
            <div className="space-y-3">
              <h4 className="font-bold text-[#4A4A3A] text-sm">📈 학생의 단계별 영작 진화 과정</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-[#FAF8F3] rounded-xl border border-[#E5E1D5]">
                  <span className="font-bold text-[#787664] block mb-1">1. 한글 구상 생각 (Korean Idea)</span>
                  <p className="text-[#4A4A3A] leading-relaxed">{selectedRecordForAssessment.koreanIdea}</p>
                </div>

                <div className="p-3 bg-[#FAF8F3] rounded-xl border border-[#E5E1D5]">
                  <span className="font-bold text-[#787664] block mb-1">2. 기초 영작 초고 (Initial Draft)</span>
                  <p className="text-[#4A4A3A] font-mono leading-relaxed">{selectedRecordForAssessment.initialDraft}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-[#FAF8F3] rounded-xl border border-[#E8C07D]">
                  <span className="font-bold text-[#4A4A3A] block mb-1">3. 1차 문법 피드백 및 교정</span>
                  <p className="text-[#787664] font-mono leading-relaxed">
                    {selectedRecordForAssessment.aiGrammarFeedback?.improvedDraft || '(피드백 없음)'}
                  </p>
                </div>

                <div className="p-3 bg-[#EBF0E5] rounded-xl border border-[#D5E0CC]">
                  <span className="font-bold text-[#4F6839] block mb-1">4. 최종 제출 영작 (Final Writing)</span>
                  <p className="text-[#4A4A3A] font-mono font-bold leading-relaxed whitespace-pre-wrap">
                    {selectedRecordForAssessment.finalWriting}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Generator CTA */}
            <div className="p-4 bg-[#FAF8F3] border border-[#E8C07D] rounded-2xl flex items-center justify-between">
              <div>
                <h5 className="font-bold text-[#4A4A3A]">Gemini 과정중심평가 초안 자동 생성</h5>
                <p className="text-[11px] text-[#787664]">
                  학생의 전체 성장 과정(한글 생각 구상, 문법 오류 극복, 표현 확장 반영도)을 종합 분석합니다.
                </p>
              </div>

              <button
                onClick={handleGenerateAiAssessment}
                disabled={aiGeneratingAssessment}
                className="px-4 py-2 bg-[#889E73] hover:bg-[#748B5F] text-white rounded-xl font-bold flex items-center space-x-1.5 shrink-0 disabled:opacity-50 shadow-xs"
              >
                {aiGeneratingAssessment ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>초안 생성 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI 평가 초안 생성</span>
                  </>
                )}
              </button>
            </div>

            {/* Assessment Editor */}
            {assessmentDraft && (
              <div className="p-5 bg-[#FAF8F3] border border-[#E5E1D5] rounded-2xl space-y-4">
                <h5 className="font-bold text-[#4A4A3A] text-sm">📝 교사 확인 및 승인 문안</h5>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: '내용 구성', key: 'contentRating' },
                    { label: '문법 성장', key: 'grammarGrowthRating' },
                    { label: '표현 확장', key: 'expressionRating' },
                    { label: '참여 태도', key: 'effortRating' },
                  ].map((field) => (
                    <div key={field.key} className="bg-white p-2.5 rounded-xl border border-[#E5E1D5]">
                      <span className="text-[10px] font-bold text-[#787664] block mb-1">{field.label}</span>
                      <select
                        value={(assessmentDraft as any)[field.key]}
                        onChange={(e) =>
                          setAssessmentDraft({ ...assessmentDraft, [field.key]: e.target.value as any })
                        }
                        className="w-full p-1 bg-[#FAF8F3] border border-[#E5E1D5] rounded text-xs font-bold text-[#4F6839]"
                      >
                        <option value="탁월">탁월</option>
                        <option value="우수">우수</option>
                        <option value="보통">보통</option>
                      </select>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block font-bold text-[#4A4A3A] mb-1">
                    학교생활기록부 교과학습발달상황(세특) 반영 문안
                  </label>
                  <textarea
                    rows={4}
                    value={assessmentDraft.detailedDraft}
                    onChange={(e) => setAssessmentDraft({ ...assessmentDraft, detailedDraft: e.target.value })}
                    className="w-full p-3 bg-white border border-[#E5E1D5] text-[#4A4A3A] rounded-xl leading-relaxed text-xs focus:outline-none focus:border-[#889E73]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#4A4A3A] mb-1">학생에게 전달할 따뜻한 피드백 한마디</label>
                  <input
                    type="text"
                    value={teacherCommentInput}
                    onChange={(e) => setTeacherCommentInput(e.target.value)}
                    placeholder="선생님의 칭찬과 격려 코멘트"
                    className="w-full px-3 py-2 bg-white border border-[#E5E1D5] text-[#4A4A3A] rounded-xl text-xs focus:outline-none focus:border-[#889E73]"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#E5E1D5]">
              <button
                type="button"
                onClick={() => setSelectedRecordForAssessment(null)}
                className="px-4 py-2 bg-[#FAF8F3] text-[#787664] hover:bg-[#F5F2ED] rounded-xl font-bold border border-[#E5E1D5]"
              >
                닫기
              </button>
              {assessmentDraft && (
                <button
                  type="button"
                  onClick={handleApproveAssessment}
                  className="px-6 py-2 bg-[#889E73] hover:bg-[#748B5F] text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>교사 최종 승인 (학생 화면에 공개)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
