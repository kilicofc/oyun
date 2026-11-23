import { Anchor, CheckCircle2, EyeOff, Skull } from 'lucide-react';
import { getDictionary } from '../game/i18n';
import type { ClientGameState } from '../game/types';
import { MaritimeAvatar } from './MaritimeAvatar';

export function RoleRevealModal({
  state,
  secondsLeft,
  onAcknowledge,
}: {
  state: ClientGameState;
  secondsLeft: number | null;
  onAcknowledge: () => void;
}) {
  const t = getDictionary('tr');
  const myRole = state.me.role;
  const me = state.players.find((p) => p.id === state.me.id);
  const partners = state.players.filter((p) => state.me.partnerIds.includes(p.id));
  const ackedCount = state.players.filter((p) => p.hasAckedRole).length;

  if (!myRole) return null;
  const isKacak = myRole === 'KACAK';
  const copy = t.roles[myRole];

  return (
    <div className="mx-auto max-w-xl py-2 sm:py-6">
      <div
        className={`rounded-3xl border p-4 shadow-2xl sm:p-8 ${
          isKacak
            ? 'border-rose-500/40 bg-[#1B1218]'
            : 'border-emerald-500/40 bg-[#0F1F26]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300">
            <EyeOff className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            Gizli Rolün (Yalnızca Sana Görünür)
          </span>
          {secondsLeft !== null && (
            <span className="font-mono text-sm font-semibold tabular-nums text-amber-300">
              {secondsLeft} sn
            </span>
          )}
        </div>

        <div className="mt-5 flex items-center gap-3.5 sm:mt-6 sm:gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border sm:h-16 sm:w-16 ${
              isKacak
                ? 'border-rose-400/50 bg-rose-500/15 text-rose-300'
                : 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
            }`}
          >
            {isKacak ? (
              <Skull className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
            ) : (
              <Anchor className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-400">Takımın</div>
            <h1
              className={`font-display text-2xl font-bold sm:text-3xl ${
                isKacak ? 'text-rose-300' : 'text-emerald-300'
              }`}
            >
              {copy.title}
            </h1>
          </div>
        </div>

        <div className="mt-6 space-y-3 rounded-2xl border border-slate-800 bg-[#08101A]/80 p-4 text-sm leading-relaxed text-slate-200">
          <p>
            <strong className="text-white">Kazanma Hedefi:</strong> {copy.goal}
          </p>
          <p className="text-slate-300">{copy.summary}</p>
          <p className="text-xs text-amber-300/90">{copy.actionHint}</p>
        </div>

        {isKacak && (
          <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-950/30 p-4">
            <h2 className="text-xs font-semibold text-rose-200">
              {partners.length > 0 ? t.roles.KACAK.partnerLabel : t.roles.KACAK.soloLabel}
            </h2>
            {partners.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-3">
                {partners.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-[#08101A] px-3 py-2"
                  >
                    <MaritimeAvatar avatar={p.avatar} colorIndex={p.colorIndex} size="sm" />
                    <span className="text-sm font-semibold text-rose-100">{p.nickname}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-400 tabular-nums">
            Hazır onayları: {ackedCount}/{state.players.length}
          </span>
          <button
            type="button"
            disabled={me?.hasAckedRole}
            onClick={onAcknowledge}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:bg-emerald-600/30 disabled:text-emerald-200"
          >
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            {me?.hasAckedRole ? 'Diğer Oyuncular Bekleniyor...' : t.actions.ackRole}
          </button>
        </div>
      </div>
    </div>
  );
}
