import React, { useState } from 'react';
import { UserCheck, Lock, Sparkles, AlertCircle, ArrowRight, ShieldCheck, KeyRound, CheckCircle2 } from 'lucide-react';
import { StudentSession } from '../types';
import { getClassById, getStudentByKey, saveStudent, getStudentGrowth } from '../firebase/db';
import { sha256 } from '../utils/crypto';

interface StudentAuthProps {
  onLoginSuccess: (session: StudentSession) => void;
  onSwitchToTeacher: () => void;
}

export const StudentAuth: React.FC<StudentAuthProps> = ({ onLoginSuccess, onSwitchToTeacher }) => {
  const [gradeYear, setGradeYear] = useState('2026');
  const [grade, setGrade] = useState(1);
  const [classNum, setClassNum] = useState(1);
  const [studentNum, setStudentNum] = useState(1);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  // First-time setup / Password reset flow
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [classPassword, setClassPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const studentKey = `${gradeYear}-${grade}-${classNum}-${String(studentNum).padStart(2, '0')}`;
  const classId = `${gradeYear}-${grade}-${classNum}`;

  // Handle standard student login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('이름을 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      // 1. Check if class exists
      const classDoc = await getClassById(classId);
      if (!classDoc) {
        setErrorMsg(`${gradeYear}학년도 ${grade}학년 ${classNum}반이 아직 등록되지 않았습니다. 선생님께 학급 개설을 요청하거나 입력 정보를 확인해 주세요.`);
        setLoading(false);
        return;
      }

      // 2. Fetch student record by studentKey
      const student = await getStudentByKey(studentKey);

      if (!student || !student.isPasswordSet || !student.passwordHash) {
        setIsSettingPassword(true);
        setErrorMsg('');
        setSuccessMsg('최초 로그인입니다. 선생님이 안내해주신 학급 비밀번호를 입력하고 사용할 개인 비밀번호를 설정해 주세요.');
        setLoading(false);
        return;
      }

      // 3. Name check
      if (student.name.trim() !== name.trim()) {
        setErrorMsg('등록된 학생 이름과 일치하지 않습니다. 학년/반/번호와 이름을 다시 확인해 주세요.');
        setLoading(false);
        return;
      }

      // 4. Password check
      if (!password) {
        setErrorMsg('개인 비밀번호를 입력해 주세요.');
        setLoading(false);
        return;
      }

      const inputHash = await sha256(password);
      if (inputHash !== student.passwordHash) {
        setErrorMsg('비밀번호가 일치하지 않습니다. 비밀번호를 잊으셨다면 선생님께 초기화를 요청하세요.');
        setLoading(false);
        return;
      }

      // Login success
      const session: StudentSession = {
        studentKey,
        name: student.name,
        gradeYear,
        grade,
        classNum,
        studentNum,
        classId,
      };

      await getStudentGrowth(studentKey, classId);
      onLoginSuccess(session);
    } catch (err: any) {
      console.error('Student login error:', err);
      setErrorMsg('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  // Handle setting/resetting personal password using class password
  const handleSetPersonalPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!classPassword) {
      setErrorMsg('선생님이 안내해주신 학급 비밀번호를 입력해 주세요.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setErrorMsg('개인 비밀번호는 최소 4자리 이상으로 설정해 주세요.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setErrorMsg('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      const classDoc = await getClassById(classId);
      if (!classDoc) {
        setErrorMsg('해당 학급 정보를 찾을 수 없습니다.');
        setLoading(false);
        return;
      }

      const inputClassPasswordHash = await sha256(classPassword);
      if (inputClassPasswordHash !== classDoc.classPasswordHash) {
        setErrorMsg('학급 비밀번호가 일치하지 않습니다. 선생님께 확인해 주세요.');
        setLoading(false);
        return;
      }

      const newPasswordHash = await sha256(newPassword);

      await saveStudent({
        studentKey,
        classId,
        gradeYear,
        grade,
        classNum,
        studentNum,
        name: name.trim(),
        passwordHash: newPasswordHash,
        isPasswordSet: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await getStudentGrowth(studentKey, classId);

      const session: StudentSession = {
        studentKey,
        name: name.trim(),
        gradeYear,
        grade,
        classNum,
        studentNum,
        classId,
      };

      onLoginSuccess(session);
    } catch (err: any) {
      console.error('Set personal password error:', err);
      setErrorMsg('비밀번호 설정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-[#E5E1D5] p-6 sm:p-8">
        {/* Header Icon & Title */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-[#889E73] rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-xs">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-[#4A4A3A] tracking-tight">학생 로그인</h2>
          <p className="text-xs text-[#787664] mt-1">
            {isSettingPassword
              ? '학급 비밀번호 확인 후 개인 비밀번호를 설정합니다'
              : '학년, 반, 번호, 이름과 비밀번호를 입력하세요'}
          </p>
        </div>

        {/* Error / Success Alerts */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-[#FAF0EC] border border-[#F2D5CB] text-[#A75336] rounded-xl text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}
        {successMsg && (
          <div className="mb-5 p-3.5 bg-[#EBF0E5] border border-[#D5E0CC] text-[#4F6839] rounded-xl text-xs flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{successMsg}</p>
          </div>
        )}

        {!isSettingPassword ? (
          /* Regular Login Form */
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Academic Year & Grade */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#4A4A3A] mb-1">학년도</label>
                <input
                  type="text"
                  value={gradeYear}
                  onChange={(e) => setGradeYear(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4A4A3A] mb-1">학년</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73]"
                >
                  <option value={1}>1학년</option>
                  <option value={2}>2학년</option>
                  <option value={3}>3학년</option>
                </select>
              </div>
            </div>

            {/* Class & Student Number */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#4A4A3A] mb-1">반</label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={classNum}
                    onChange={(e) => setClassNum(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-sm bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73]"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-[#787664]">반</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4A4A3A] mb-1">번호</label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={studentNum}
                    onChange={(e) => setStudentNum(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-sm bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73]"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-[#787664]">번</span>
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-[#4A4A3A] mb-1">학생 이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 김민우"
                className="w-full px-3 py-2 text-sm bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73]"
                required
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#4A4A3A]">개인 비밀번호</label>
                <button
                  type="button"
                  onClick={() => setIsSettingPassword(true)}
                  className="text-[11px] text-[#889E73] hover:text-[#748B5F] font-medium"
                >
                  최초 로그인 / 재설정
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="개인 비밀번호 입력"
                  className="w-full px-3 py-2 text-sm bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73]"
                />
                <Lock className="w-4 h-4 absolute right-3 top-2.5 text-[#787664]" />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#889E73] hover:bg-[#748B5F] text-white text-sm font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>로그인하여 영작 시작하기</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* First-time setup / Reset password form */
          <form onSubmit={handleSetPersonalPassword} className="space-y-4">
            <div className="p-3 bg-[#EBF0E5] border border-[#D5E0CC] rounded-xl text-xs text-[#4F6839] space-y-1">
              <p className="font-semibold flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1 text-[#889E73]" />
                선생님 학급 비밀번호 확인
              </p>
              <p className="text-[#4A4A3A]">
                {gradeYear}년 {grade}학년 {classNum}반 {studentNum}번 ({name || '학생'})
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A4A3A] mb-1">학급 비밀번호 (선생님 안내)</label>
              <div className="relative">
                <input
                  type="password"
                  value={classPassword}
                  onChange={(e) => setClassPassword(e.target.value)}
                  placeholder="선생님이 공지한 학급 비밀번호"
                  className="w-full px-3 py-2 text-sm bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73]"
                  required
                />
                <KeyRound className="w-4 h-4 absolute right-3 top-2.5 text-[#787664]" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A4A3A] mb-1">새 개인 비밀번호 설정 (4자리 이상)</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="앞으로 사용할 나만의 비밀번호"
                className="w-full px-3 py-2 text-sm bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A4A3A] mb-1">새 개인 비밀번호 확인</label>
              <input
                type="password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                placeholder="새 비밀번호 다시 입력"
                className="w-full px-3 py-2 text-sm bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73]"
                required
              />
            </div>

            <div className="flex space-x-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsSettingPassword(false);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="w-1/3 py-2.5 px-3 bg-[#F5F2ED] hover:bg-[#EAE6DE] text-[#4A4A3A] text-xs font-medium rounded-xl transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 py-2.5 px-4 bg-[#889E73] hover:bg-[#748B5F] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>비밀번호 등록 및 로그인</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer switch */}
        <div className="mt-8 pt-4 border-t border-[#E5E1D5] flex items-center justify-between text-xs text-[#787664]">
          <span>선생님이신가요?</span>
          <button
            type="button"
            onClick={onSwitchToTeacher}
            className="text-[#889E73] hover:text-[#748B5F] font-semibold transition-colors"
          >
            교사 관리자 로그인 →
          </button>
        </div>
      </div>
    </div>
  );
};
