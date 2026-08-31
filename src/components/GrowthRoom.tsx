import React, { useState } from 'react';
import { Award, Sparkles, CheckCircle2, Lock, Flame, Shield, User, Palette } from 'lucide-react';
import { StudentGrowthDoc, StudentSession } from '../types';
import { LEVELS, ALL_BADGES, getLevelInfo, getNextLevelInfo, MAX_DAILY_XP } from '../utils/gamification';
import { saveStudentGrowth } from '../firebase/db';

interface GrowthRoomProps {
  studentSession: StudentSession;
  studentGrowth: StudentGrowthDoc;
  onGrowthUpdate: (growth: StudentGrowthDoc) => void;
}

export const GrowthRoom: React.FC<GrowthRoomProps> = ({
  studentSession,
  studentGrowth,
  onGrowthUpdate,
}) => {
  const levelInfo = getLevelInfo(studentGrowth.totalXp);
  const nextLevel = getNextLevelInfo(studentGrowth.totalXp);

  const [avatarBase, setAvatarBase] = useState(studentGrowth.customAvatar?.base || 'bear');
  const [avatarHat, setAvatarHat] = useState(studentGrowth.customAvatar?.hat || 'none');
  const [avatarAccessory, setAvatarAccessory] = useState(studentGrowth.customAvatar?.accessory || 'pencil');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const AVATARS = [
    { id: 'bear', name: '꼬마곰', emoji: '🐻' },
    { id: 'cat', name: '책냥이', emoji: '🐱' },
    { id: 'bunny', name: '당근토끼', emoji: '🐰' },
    { id: 'owl', name: '지혜부엉이', emoji: '🦉' },
    { id: 'puppy', name: '열정댕댕이', emoji: '🐶' },
  ];

  const HATS = [
    { id: 'none', name: '없음', emoji: '' },
    { id: 'grad_cap', name: '학사모', emoji: '🎓' },
    { id: 'crown', name: '왕관', emoji: '👑' },
    { id: 'beret', name: '베레모', emoji: '🎨' },
    { id: 'party', name: '파티햇', emoji: '🥳' },
  ];

  const ACCESSORIES = [
    { id: 'pencil', name: '연필', emoji: '✏️' },
    { id: 'book', name: '영어책', emoji: '📖' },
    { id: 'star', name: '별빛', emoji: '✨' },
    { id: 'coffee', name: '따뜻한 코코아', emoji: '☕' },
  ];

  const handleSaveAvatar = async () => {
    setSavingAvatar(true);
    try {
      const updatedGrowth: StudentGrowthDoc = {
        ...studentGrowth,
        customAvatar: {
          base: avatarBase,
          hat: avatarHat,
          accessory: avatarAccessory,
          color: 'sage',
        },
        updatedAt: new Date().toISOString(),
      };
      await saveStudentGrowth(updatedGrowth);
      onGrowthUpdate(updatedGrowth);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } catch (e) {
      console.error('Save avatar error:', e);
    } finally {
      setSavingAvatar(false);
    }
  };

  const selectedAvatarObj = AVATARS.find((a) => a.id === avatarBase) || AVATARS[0];
  const selectedHatObj = HATS.find((h) => h.id === avatarHat);
  const selectedAccObj = ACCESSORIES.find((acc) => acc.id === avatarAccessory);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#4A4A3A] tracking-tight flex items-center gap-2">
          <Award className="w-6 h-6 text-[#889E73]" />
          나의 영작 성장 기록실
        </h2>
        <p className="text-xs text-[#787664] mt-1">
          다른 학생과의 비교나 경쟁이 아닌, 나의 어제와 오늘을 돌아보는 꾸준한 성장 공간입니다.
        </p>
      </div>

      {/* Top Profile & Avatar Customizer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Avatar Display & Customizer */}
        <div className="bg-white rounded-3xl border border-[#E5E1D5] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-[#787664] flex items-center gap-1">
                <User className="w-4 h-4 text-[#889E73]" />
                나의 글쓰기 마스코트
              </span>
              {savedToast && (
                <span className="text-[11px] font-bold text-[#4F6839] bg-[#EBF0E5] px-2 py-0.5 rounded-full border border-[#D5E0CC]">
                  저장됨!
                </span>
              )}
            </div>

            {/* Avatar Preview Stage */}
            <div className="w-36 h-36 mx-auto rounded-full bg-[#F5F2ED] border-4 border-white shadow-md flex flex-col items-center justify-center relative mb-6">
              {selectedHatObj?.emoji && (
                <span className="text-2xl absolute top-1.5 animate-bounce">{selectedHatObj.emoji}</span>
              )}
              <span className="text-6xl pt-2">{selectedAvatarObj.emoji}</span>
              {selectedAccObj?.emoji && (
                <span className="text-xl absolute bottom-2 right-4 bg-white p-1 rounded-full shadow-xs border border-[#E5E1D5]">
                  {selectedAccObj.emoji}
                </span>
              )}
            </div>

            {/* Avatar Options */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#4A4A3A] mb-1">캐릭터 선택</label>
                <div className="flex gap-1.5 justify-between">
                  {AVATARS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAvatarBase(a.id)}
                      className={`p-2 rounded-xl text-lg border transition-all ${
                        avatarBase === a.id ? 'bg-[#EBF0E5] border-[#889E73] scale-105' : 'bg-[#FAF8F3] border-[#E5E1D5]'
                      }`}
                      title={a.name}
                    >
                      {a.emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#4A4A3A] mb-1">모자/장식</label>
                <div className="flex gap-1.5 justify-between">
                  {HATS.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setAvatarHat(h.id)}
                      className={`p-2 rounded-xl text-base border transition-all ${
                        avatarHat === h.id ? 'bg-[#EBF0E5] border-[#889E73] scale-105' : 'bg-[#FAF8F3] border-[#E5E1D5]'
                      }`}
                      title={h.name}
                    >
                      {h.emoji || '❌'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#4A4A3A] mb-1">소품</label>
                <div className="flex gap-1.5 justify-between">
                  {ACCESSORIES.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setAvatarAccessory(acc.id)}
                      className={`p-2 rounded-xl text-base border transition-all ${
                        avatarAccessory === acc.id ? 'bg-[#EBF0E5] border-[#889E73] scale-105' : 'bg-[#FAF8F3] border-[#E5E1D5]'
                      }`}
                      title={acc.name}
                    >
                      {acc.emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveAvatar}
            disabled={savingAvatar}
            className="w-full mt-4 py-2 bg-[#889E73] hover:bg-[#748B5F] text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            {savingAvatar ? '저장 중...' : '마스코트 변경 저장'}
          </button>
        </div>

        {/* Current XP & Level Progress */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-[#E5E1D5] p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#889E73] uppercase tracking-wider">Current Level</span>
                <h3 className="text-2xl font-extrabold text-[#4A4A3A] mt-0.5 flex items-center gap-2">
                  <span>{levelInfo.icon}</span>
                  <span>Lv.{levelInfo.level} {levelInfo.title}</span>
                </h3>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-[#889E73]">{studentGrowth.totalXp}</span>
                <span className="text-xs font-bold text-[#787664]"> XP</span>
              </div>
            </div>

            <p className="text-xs text-[#4A4A3A] bg-[#FAF8F3] p-3.5 rounded-xl border border-[#E5E1D5]">
              💡 {levelInfo.desc}
            </p>

            {/* Daily Rule Banner */}
            <div className="p-4 bg-[#FAF8F3] border border-[#E8C07D] rounded-2xl text-xs text-[#4A4A3A] space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-[#4A4A3A]">
                <Sparkles className="w-4 h-4 text-[#D98E73]" />
                하루 10 XP 성장 습관 규칙
              </p>
              <p className="text-[11px] text-[#787664] leading-relaxed">
                한 번에 몰아서 쓰기보다 매일 꾸준히 쓰는 습관을 위해 하루 최대 <strong className="text-[#4A4A3A]">{MAX_DAILY_XP} XP</strong>까지만 획득할 수 있습니다.
                (오늘 획득: {studentGrowth.todayXp} / {MAX_DAILY_XP} XP)
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E1D5] grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-[#FAF8F3] rounded-xl border border-[#E5E1D5]">
              <span className="text-[#787664] text-[11px] block">완성한 영작</span>
              <strong className="text-sm text-[#4A4A3A]">{studentGrowth.completedCount}편</strong>
            </div>
            <div className="p-2 bg-[#FAF8F3] rounded-xl border border-[#E5E1D5]">
              <span className="text-[#787664] text-[11px] block">획득한 배지</span>
              <strong className="text-sm text-[#4A4A3A]">{studentGrowth.badges?.length || 0}개</strong>
            </div>
            <div className="p-2 bg-[#FAF8F3] rounded-xl border border-[#E5E1D5]">
              <span className="text-[#787664] text-[11px] block">연속 글쓰기</span>
              <strong className="text-sm text-[#4A4A3A]">{studentGrowth.streakDays}일째</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Level Roadmap (Lv 1 ~ Lv 7) */}
      <div className="bg-white rounded-3xl border border-[#E5E1D5] p-6 sm:p-8 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-[#4A4A3A]">🗺️ 영작 성장 레벨 로드맵</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {LEVELS.map((lvl) => {
            const isReached = studentGrowth.totalXp >= lvl.minXp;
            const isCurrent = levelInfo.level === lvl.level;

            return (
              <div
                key={lvl.level}
                className={`p-4 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-[#EBF0E5] border-[#889E73] shadow-xs ring-2 ring-[#889E73]/20'
                    : isReached
                    ? 'bg-[#FAF8F3] border-[#E5E1D5]'
                    : 'bg-[#F5F2ED]/60 border-[#E5E1D5]/60 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{lvl.icon}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#E5E1D5] text-[#4A4A3A]">
                    {lvl.minXp} XP+
                  </span>
                </div>

                <p className="text-xs font-bold text-[#4A4A3A]">
                  Lv.{lvl.level} {lvl.title}
                </p>
                <p className="text-[11px] text-[#787664] mt-1 leading-tight">{lvl.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges Showcase */}
      <div className="bg-white rounded-3xl border border-[#E5E1D5] p-6 sm:p-8 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-[#4A4A3A]">🏅 영작 활동 배지 컬렉션</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {ALL_BADGES.map((b) => {
            const earned = studentGrowth.badges?.find((eb) => eb.badgeId === b.id);

            return (
              <div
                key={b.id}
                className={`p-4 rounded-2xl border flex items-start space-x-3.5 transition-all ${
                  earned
                    ? 'bg-[#FAF8F3] border-[#E8C07D] shadow-xs'
                    : 'bg-[#F5F2ED]/70 border-[#E5E1D5] opacity-60'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E1D5] flex items-center justify-center text-2xl shrink-0 shadow-xs">
                  {earned ? b.icon : <Lock className="w-5 h-5 text-[#D8D3C4]" />}
                </div>

                <div>
                  <div className="flex items-center space-x-1.5">
                    <h4 className="text-xs font-bold text-[#4A4A3A]">{b.title}</h4>
                    {earned && <CheckCircle2 className="w-3.5 h-3.5 text-[#889E73]" />}
                  </div>
                  <p className="text-[11px] text-[#787664] mt-0.5 leading-snug">{b.description}</p>
                  {earned && (
                    <span className="text-[10px] text-[#D98E73] font-semibold mt-1 block">
                      획득일: {new Date(earned.earnedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
