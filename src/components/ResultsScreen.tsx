import { useState } from 'react';
import {
  Anchor,
  Award,
  Check,
  Copy,
  Download,
  RotateCcw,
  Skull,
  Sparkles,
  Trophy,
} from 'lucide-react';
import type { AchievementDefinition } from '../game/achievements';
import { getDictionary } from '../game/i18n';
import type { ClientGameState } from '../game/types';
import { MaritimeAvatar } from './MaritimeAvatar';

export function ResultsScreen({
  state,
  newlyUnlocked,
  onPlayAgain,
  onNewRoom,
  onOpenAchievements,
}: {
  state: ClientGameState;
  newlyUnlocked: AchievementDefinition[];
  onPlayAgain: () => void;
  onNewRoom: () => void;
  onOpenAchievements: () => void;
}) {
  const t = getDictionary('tr');
  const [copied, setCopied] = useState(false);

  const me = state.players.find((p) => p.id === state.me.id);
  const isHost = Boolean(me?.isHost);
  const crewWon = state.winner === 'MURETTEBAT';

  const buildShareSummary = () => {
    const lines = [
      `Son Sefer (${state.code}) — ${crewWon ? 'Mürettebat Kazandı!' : 'Kaçaklar Kazandı!'}`,
      ...state.players.map((p) => {
        const role = state.revealedRoles?.[p.id] === 'KACAK' ? 'Kaçak' : 'Mürettebat';
        return `- ${p.nickname}: ${role}`;
      }),
    ];
    return lines.join('\n');
  };

  const handleCopyShare = async () => {
    try {
      await navigator.clipboard.writeText(buildShareSummary());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleDownloadCard = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#08101A';
    ctx.fillRect(0, 0, 960, 540);
    ctx.strokeStyle = crewWon ? '#10B981' : '#EF4444';
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, 912, 492);

    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`SON SEFER · ODA ${state.code}`, 56, 78);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 42px serif';
    ctx.fillText(crewWon ? 'Mürettebat Limana Ulaştı' : 'Kaçaklar Seferi Sabote Etti', 56, 134);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '20px sans-serif';
    ctx.fillText('Maç Sonu Roller', 56, 190);

    let y = 230;
    state.players.forEach((p, idx) => {
      const col = idx >= 5 ? 490 : 56;
      const rowY = y + (idx % 5) * 44;
      const isKacak = state.revealedRoles?.[p.id] === 'KACAK';
      ctx.fillStyle = isKacak ? '#FCA5A5' : '#A7F3D0';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`${p.nickname} — ${isKacak ? 'Kaçak' : 'Mürettebat'}`, col, rowY);
    });

    const link = document.createElement('a');
    link.download = `son-sefer-${state.code}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Winner Banner */}
      <div
        className={`rounded-3xl border p-4 shadow-2xl sm:p-8 ${
          crewWon
            ? 'border-emerald-500/50 bg-[#0F2422]'
            : 'border-rose-500/50 bg-[#241118]'
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border sm:h-16 sm:w-16 ${
                crewWon
                  ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300'
                  : 'border-rose-400/50 bg-rose-500/20 text-rose-300'
              }`}
            >
              {crewWon ? (
                <Anchor className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
              ) : (
                <Skull className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-medium text-amber-300">Sefer Sonu</span>
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                {crewWon ? t.status.crewWon : t.status.kacakWon}
              </h1>
              {state.winReason === 'STORM_LIMIT' && (
                <p className="mt-1 text-xs text-amber-200">
                  Art arda ekip retleri fırtına sınırını aştı.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleCopyShare}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-600 bg-[#08101A]/80 px-4 py-2 text-xs font-semibold text-white hover:bg-[#132234]"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{copied ? t.actions.copied : t.actions.shareResult}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadCard}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-600 bg-[#08101A]/80 px-4 py-2 text-xs font-semibold text-white hover:bg-[#132234]"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>{t.actions.downloadCard}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Newly Unlocked Achievements */}
      {newlyUnlocked.length > 0 && (
        <div className="rounded-3xl border border-amber-500/40 bg-[#182230] p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-300">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              <h2 className="font-display text-lg font-bold">Yeni Başarım Açıldı!</h2>
            </div>
            <button
              type="button"
              onClick={onOpenAchievements}
              className="text-xs font-semibold text-amber-300 hover:underline"
            >
              Tüm Seyir Defterini Gör
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {newlyUnlocked.map((ach) => (
              <div
                key={ach.id}
                className="flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-[#0F1B2B] p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
                  <Award className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{ach.title}</div>
                  <div className="text-xs text-slate-400">{ach.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revealed Roles */}
      <div className="rounded-3xl border border-slate-800 bg-[#0F1B2B] p-4 sm:p-6">
        <h2 className="font-display text-xl font-bold text-white">Açığa Çıkan Roller</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {state.players.map((p) => {
            const role = state.revealedRoles?.[p.id] ?? 'MURETTEBAT';
            const isKacak = role === 'KACAK';
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 ${
                  isKacak
                    ? 'border-rose-500/35 bg-rose-950/25'
                    : 'border-emerald-500/30 bg-emerald-950/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MaritimeAvatar avatar={p.avatar} colorIndex={p.colorIndex} size="md" />
                  <div>
                    <div className="text-sm font-semibold text-white">{p.nickname}</div>
                    <div
                      className={`text-xs font-medium ${
                        isKacak ? 'text-rose-300' : 'text-emerald-300'
                      }`}
                    >
                      {isKacak ? 'Kaçak' : 'Mürettebat'}
                    </div>
                  </div>
                </div>
                {isKacak ? (
                  <Skull className="h-5 w-5 text-rose-400" aria-hidden="true" />
                ) : (
                  <Anchor className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Match Awards */}
      {state.awards.length > 0 && (
        <div className="rounded-3xl border border-slate-800 bg-[#0F1B2B] p-4 sm:p-6">
          <div className="flex items-center gap-2 text-amber-400">
            <Trophy className="h-5 w-5" aria-hidden="true" />
            <h2 className="font-display text-xl font-bold text-white">Sefer Unvanları</h2>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {state.awards.map((award) => {
              const info = t.awards[award.titleKey];
              return (
                <div
                  key={award.id}
                  className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-[#0B1522] p-4"
                >
                  <MaritimeAvatar
                    avatar={award.playerAvatar}
                    colorIndex={award.playerColorIndex}
                    size="md"
                  />
                  <div>
                    <div className="text-xs font-semibold text-amber-300">
                      {info?.title ?? award.titleKey}
                    </div>
                    <div className="mt-0.5 text-sm font-bold text-white">
                      {award.playerNickname}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{info?.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Play Again / New Room */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onNewRoom}
          className="min-h-[48px] rounded-xl border border-slate-700 bg-[#132234] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1B2E45]"
        >
          {t.actions.newRoom}
        </button>
        {isHost && (
          <button
            type="button"
            onClick={onPlayAgain}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t.actions.playAgain}
          </button>
        )}
      </div>
    </div>
  );
}
