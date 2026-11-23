import { useState } from 'react';
import {
  Check,
  Copy,
  Crown,
  Headphones,
  Mic,
  MicOff,
  Play,
  Shield,
  UserCheck,
  UserMinus,
  Users,
  VolumeX,
} from 'lucide-react';
import { getDictionary } from '../game/i18n';
import { getKacakCount, MIN_PLAYERS } from '../game/rules';
import type { ClientGameState, RoomSettings } from '../game/types';
import { MaritimeAvatar } from './MaritimeAvatar';

export function LobbyScreen({
  state,
  onToggleReady,
  onUpdateSettings,
  onKickPlayer,
  onStartGame,
  onLeave,
  onOpenPrivacy,
  voice,
}: {
  state: ClientGameState;
  onToggleReady: () => void;
  onUpdateSettings: (patch: Partial<RoomSettings>) => void;
  onKickPlayer: (targetPlayerId: string) => void;
  onStartGame: () => void;
  onLeave: () => void;
  onOpenPrivacy: () => void;
  voice?: {
    connected: boolean;
    connecting: boolean;
    micActive: boolean;
    voiceError: string | null;
    onToggleMic: () => void;
    onJoinListen: () => void;
  };
}) {
  const t = getDictionary('tr');
  const [copiedType, setCopiedType] = useState<'link' | 'code' | null>(null);

  const me = state.players.find((p) => p.id === state.me.id);
  const isHost = Boolean(me?.isHost);
  const readyCount = state.players.filter((p) => p.isReady).length;
  const allReady = state.players.length >= MIN_PLAYERS && state.players.every((p) => p.isReady);

  const inviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?code=${state.code}`
      : `?code=${state.code}`;

  const copyText = async (val: string, kind: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedType(kind);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div className="space-y-6">
      {/* Room Code & Invite Card */}
      <div className="rounded-3xl border border-slate-800 bg-[#0F1B2B] p-4 shadow-xl sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
              <span>{t.phases.LOBBY}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {state.players.length}/{state.settings.maxPlayers} Yolcu
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2.5 sm:gap-3">
              <h1 className="font-mono text-2xl font-bold tracking-widest text-white tabular-nums sm:text-3xl">
                {state.code}
              </h1>
              <button
                type="button"
                onClick={() => copyText(state.code, 'code')}
                aria-label="Oda kodunu kopyala"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-700 bg-[#132234] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-[#1B2E45]"
              >
                {copiedType === 'code' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    <span>{t.actions.copied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Kodu Kopyala</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => copyText(inviteUrl, 'link')}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-500/40 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/25"
            >
              {copiedType === 'link' ? (
                <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{copiedType === 'link' ? t.actions.copied : t.actions.copyInvite}</span>
            </button>

            <button
              type="button"
              onClick={onOpenPrivacy}
              aria-label={t.actions.privacyAndVoice}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-700 bg-[#132234] px-3 py-2 text-xs font-medium text-slate-300 hover:text-white"
            >
              <Shield className="h-4 w-4" aria-hidden="true" />
              <span>Gizlilik</span>
            </button>
          </div>
        </div>

        {/* Role balance & voice info */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/90 pt-4 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 text-amber-400" aria-hidden="true" />
              {state.players.length >= MIN_PLAYERS
                ? `Mevcut kadro: ${state.players.length - getKacakCount(state.players.length)} Mürettebat · ${getKacakCount(state.players.length)} Kaçak`
                : `En az ${MIN_PLAYERS} oyuncu bekleniyor (${MIN_PLAYERS - state.players.length} kişi daha)`}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">Tur süresi: {state.settings.turnSeconds} sn</span>
            <span aria-hidden="true">·</span>
            <span>
              {state.livekitAvailable && state.settings.voiceEnabled
                ? 'Sesli oda açık (LiveKit)'
                : 'Yalnızca yazılı sohbet'}
            </span>
          </div>

          {state.livekitAvailable && state.settings.voiceEnabled && voice && (
            <div className="flex flex-wrap items-center gap-2">
              {!voice.connected && (
                <button
                  type="button"
                  disabled={voice.connecting}
                  onClick={voice.onJoinListen}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-700 bg-[#132234] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-[#1B2E45] disabled:opacity-50"
                >
                  <Headphones className="h-4 w-4 text-sky-400" aria-hidden="true" />
                  <span>{voice.connecting ? 'Bağlanıyor...' : 'Sesli Dinle'}</span>
                </button>
              )}
              <button
                type="button"
                disabled={voice.connecting}
                onClick={voice.onToggleMic}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold ${
                  voice.micActive
                    ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200'
                    : 'border-slate-700 bg-[#132234] text-slate-200 hover:bg-[#1B2E45]'
                }`}
              >
                {voice.micActive ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                <span>
                  {voice.connecting
                    ? 'Bağlanıyor...'
                    : voice.micActive
                      ? 'Mikrofon Açık'
                      : 'Mikrofonu Aç'}
                </span>
              </button>
            </div>
          )}
        </div>

        {voice?.voiceError && (
          <p className="mt-2 text-xs text-amber-300">{voice.voiceError}</p>
        )}
      </div>

      {/* Host Settings Panel */}
      {isHost && (
        <div className="rounded-2xl border border-slate-800 bg-[#0F1B2B] p-5">
          <h2 className="text-sm font-semibold text-slate-200">Oda Sahibi Ayarları</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="lobby-max-players" className="block text-xs text-slate-400">
                {t.forms.maxPlayersLabel}
              </label>
              <select
                id="lobby-max-players"
                value={state.settings.maxPlayers}
                onChange={(e) => onUpdateSettings({ maxPlayers: Number(e.target.value) })}
                className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-700 bg-[#08101A] px-3 text-sm text-white"
              >
                {[6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n} disabled={n < state.players.length}>
                    {n} Oyuncu
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="lobby-turn-seconds" className="block text-xs text-slate-400">
                {t.forms.turnSecondsLabel}
              </label>
              <select
                id="lobby-turn-seconds"
                value={state.settings.turnSeconds}
                onChange={(e) => onUpdateSettings({ turnSeconds: Number(e.target.value) })}
                className="mt-1 w-full min-h-[44px] rounded-xl border border-slate-700 bg-[#08101A] px-3 text-sm text-white"
              >
                {[30, 45, 60, 75, 90].map((s) => (
                  <option key={s} value={s}>
                    {s} saniye
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col justify-end">
              {state.livekitAvailable ? (
                <label className="flex min-h-[44px] items-center justify-between rounded-xl border border-slate-700 bg-[#08101A] px-3 text-sm text-slate-200">
                  <span>Sesli Sohbet</span>
                  <input
                    type="checkbox"
                    checked={state.settings.voiceEnabled}
                    onChange={(e) => onUpdateSettings({ voiceEnabled: e.target.checked })}
                    className="h-5 w-5 accent-amber-500"
                  />
                </label>
              ) : (
                <div className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-800 bg-[#08101A] px-3 text-xs text-slate-500">
                  <VolumeX className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Ses anahtarı tanımlı değil</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Crew Roster */}
      <div className="rounded-3xl border border-slate-800 bg-[#0F1B2B] p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold text-white">Yolcu Listesi</h2>
          <span className="text-xs font-medium text-slate-400 tabular-nums">
            {readyCount}/{state.players.length} Hazır
          </span>
        </div>

        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {state.players.map((p) => {
            const isMe = p.id === state.me.id;
            return (
              <li
                key={p.id}
                className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 ${
                  isMe
                    ? 'border-amber-500/40 bg-[#15263B]'
                    : 'border-slate-800 bg-[#0B1522]'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <MaritimeAvatar avatar={p.avatar} colorIndex={p.colorIndex} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-white">
                        {p.nickname}
                      </span>
                      {p.isHost && (
                        <Crown
                          className="h-4 w-4 shrink-0 text-amber-400"
                          aria-label="Oda Sahibi"
                        />
                      )}
                      {isMe && (
                        <span className="text-xs text-amber-300">(Sen)</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs">
                      {p.isReady ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          Hazır
                        </span>
                      ) : (
                        <span className="text-slate-400">Bekliyor</span>
                      )}
                    </div>
                  </div>
                </div>

                {isHost && !isMe && (
                  <button
                    type="button"
                    onClick={() => onKickPlayer(p.id)}
                    aria-label={`${p.nickname} oyuncusunu çıkar`}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800/60 text-slate-400 hover:border-rose-500/50 hover:text-rose-300"
                  >
                    <UserMinus className="h-4 w-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {/* Primary Bottom Action Bar */}
        <div className="mt-6 flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onLeave}
            className="min-h-[44px] rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            {t.actions.leaveRoom}
          </button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onToggleReady}
              className={`min-h-[48px] rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
                me?.isReady
                  ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                  : 'border border-slate-600 bg-[#132234] text-white hover:bg-[#1B2E45]'
              }`}
            >
              {me?.isReady ? t.actions.ready : 'Hazır Ol'}
            </button>

            {isHost && (
              <button
                type="button"
                disabled={!allReady}
                onClick={onStartGame}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                {t.actions.startGame}
              </button>
            )}
          </div>
        </div>

        {!allReady && (
          <p className="mt-3 text-center text-xs text-slate-400 sm:text-right">
            {state.players.length < MIN_PLAYERS ? t.status.needSixPlayers : t.status.waitingForReady}
          </p>
        )}
      </div>
    </div>
  );
}
