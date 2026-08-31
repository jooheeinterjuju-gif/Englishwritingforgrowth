import React, { useState, useEffect } from 'react';
import { Shield, Lock, AlertCircle, CheckCircle2, ArrowRight, KeyRound, Sparkles } from 'lucide-react';
import { getSystemSettings, saveSystemSettings } from '../firebase/db';
import { sha256 } from '../utils/crypto';

interface TeacherAuthProps {
  onLoginSuccess: () => void;
  onSwitchToStudent: () => void;
}

export const TeacherAuth: React.FC<TeacherAuthProps> = ({ onLoginSuccess, onSwitchToStudent }) => {
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [schoolName, setSchoolName] = useState('우리중학교');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    try {
      const settings = await getSystemSettings();
      if (!settings || !settings.adminPasswordHash) {
        setIsFirstTime(true);
      } else {
        setIsFirstTime(false);
      }
    } catch (e) {
      console.error('System settings check error:', e);
      setIsFirstTime(false);
    }
  };

  const handleFirstTimeSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('관리자 비밀번호는 안전을 위해 6자리 이상으로 설정해 주세요.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setErrorMsg('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      const passwordHash = await sha256(newPassword);
      await saveSystemSettings({
        adminPasswordHash: passwordHash,
        schoolName: schoolName.trim() || '우리중학교',
        isInitialized: true,
      });

      setSuccessMsg('교사 관리자 비밀번호가 성공적으로 등록되었습니다.');
      setTimeout(() => {
        onLoginSuccess();
      }, 400);
    } catch (err: any) {
      console.error('Admin setup error:', err);
      setErrorMsg('설정 저장 중 오류가 발생했습니다. Firestore 연결을 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!password) {
      setErrorMsg('관리자 비밀번호를 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const settings = await getSystemSettings();
      if (!settings || !settings.adminPasswordHash) {
        setIsFirstTime(true);
        setErrorMsg('시스템 초기화가 필요합니다. 관리자 비밀번호를 설정해 주세요.');
        setLoading(false);
        return;
      }

      const inputHash = await sha256(password);
      if (inputHash !== settings.adminPasswordHash) {
        setErrorMsg('관리자 비밀번호가 일치하지 않습니다.');
        setLoading(false);
        return;
      }

      onLoginSuccess();
    } catch (err: any) {
      console.error('Admin login error:', err);
      setErrorMsg('로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-[#E5E1D5] p-6 sm:p-8">
        {/* Brand Icon */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-[#4A4A3A] rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-xs">
            <Shield className="w-7 h-7 text-[#E8C07D]" />
          </div>
          <h2 className="text-2xl font-bold text-[#4A4A3A] tracking-tight">교사 관리자</h2>
          <p className="text-xs text-[#787664] mt-1">
            {isFirstTime
              ? '최초 실행: 관리자 계정 비밀번호를 설정합니다'
              : '학급 관리 및 과정중심평가를 위한 관리자 로그인'}
          </p>
        </div>

        {/* Alerts */}
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

        {isFirstTime === null ? (
          <div className="py-12 text-center text-xs text-[#787664]">설정 확인 중...</div>
        ) : isFirstTime ? (
          /* First-time Setup Form */
          <form onSubmit={handleFirstTimeSetup} className="space-y-4">
            <div className="p-3 bg-[#FAF8F3] border border-[#E5E1D5] rounded-xl text-xs text-[#4A4A3A]">
              <p className="font-semibold mb-1 text-[#889E73]">🌱 AI 단계별 영작 시스템 최초 설정</p>
              <p className="text-[11px] text-[#787664]">
                선생님께서 사용하실 관리자 비밀번호를 등록해 주세요. 비밀번호는 안전하게 암호화(SHA-256)되어 저장됩니다.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A4A3A] mb-1">학교명</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="예: 서울중학교"
                className="w-full px-3 py-2 text-sm bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A4A3A] mb-1">관리자 비밀번호 설정 (6자리 이상)</label>
              <div className="relative">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="관리자 비밀번호 입력"
                  className="w-full px-3 py-2 text-sm bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73]"
                  required
                />
                <KeyRound className="w-4 h-4 absolute right-3 top-2.5 text-[#787664]" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A4A3A] mb-1">관리자 비밀번호 확인</label>
              <input
                type="password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                placeholder="비밀번호 다시 입력"
                className="w-full px-3 py-2 text-sm bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#4A4A3A] hover:bg-[#3A3A2C] text-white text-sm font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>관리자 비밀번호 등록 및 시작</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Normal Admin Login Form */
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#4A4A3A] mb-1">관리자 비밀번호</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full px-3 py-2 text-sm bg-[#F5F2ED] border border-[#E5E1D5] text-[#4A4A3A] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#889E73]/20 focus:border-[#889E73]"
                  required
                  autoFocus
                />
                <Lock className="w-4 h-4 absolute right-3 top-2.5 text-[#787664]" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#4A4A3A] hover:bg-[#3A3A2C] text-white text-sm font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>관리자 대시보드 입장</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer switch */}
        <div className="mt-8 pt-4 border-t border-[#E5E1D5] flex items-center justify-between text-xs text-[#787664]">
          <span>학생이신가요?</span>
          <button
            type="button"
            onClick={onSwitchToStudent}
            className="text-[#889E73] hover:text-[#748B5F] font-semibold transition-colors"
          >
            ← 학생 로그인으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
};
