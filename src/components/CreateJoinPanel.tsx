import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, VolumeX } from 'lucide-react';
import { getDictionary } from '../game/i18n';
import { AVATAR_IDS, AVATAR_LABELS, generateRandomIdentity } from '../game/names';
import type { AvatarId } from '../game/types';
import { MaritimeAvatar } from './MaritimeAvatar';

export function CreateJoinPanel({
  initialMode,
  initialRoomCode,
  livekitAvailable,
  isSubmitting,
  error,
  onBack,
  onCreateRoom,
  onJoinRoom,
}: {
  initialMode: 'create' | 'join';
  initialRoomCode?: string;
  livekitAvailable: boolean;
  isSubmitting: boolean;
  error: string | null;
  onBack: () => void;
  onCreateRoom: (data: {
    nickname: string;
    avatar: AvatarId;
    colorIndex: number;
    maxPlayers: number;
    turnSeconds: number;
    voiceEnabled: boolean;
  }) => void;
  onJoinRoom: (data: {
    code: string;
    nickname: string;
    avatar: AvatarId;
    colorIndex: number;
  }) => void;
}) {
  const t = getDictionary('tr');
  const [mode, setMode] = useState<'create' | 'join'>(initialMode);
  const [identity, setIdentity] = useState(() => generateRandomIdentity());
  const [roomCode, setRoomCode] = useState(initialRoomCode ?? '');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [turnSeconds, setTurnSeconds] = useState(60);
  const [voiceEnabled, setVoiceEnabled] = useState(livekitAvailable);

  useEffect(() => {
    if (livekitAvailable) {
      setVoiceEnabled(true);
    }
  }, [livekitAvailable]);

  const randomize = () => {
    setIdentity(generateRandomIdentity());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      onCreateRoom({
        nickname: identity.nickname,
        avatar: identity.avatar,
        colorIndex: identity.colorIndex,
        maxPlayers,
        turnSeconds,
        voiceEnabled: livekitAvailable && voiceEnabled,
      });
    } else {
      onJoinRoom({
        code: roomCode.trim().toUpperCase(),
        nickname: identity.nickname,
        avatar: identity.avatar,
        colorIndex: identity.colorIndex,
      });
    }
  };

  return (
    <div className="min-h-dvh bg-[#08101A] px-3 py-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-xl">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Ana Ekrana Dön
        </button>

        <div className="mt-3 rounded-3xl border border-slate-800 bg-[#0F1B2B] p-4 shadow-2xl sm:mt-4 sm:p-8">
          {/* Segmented mode switch */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#08101A] p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                mode === 'create'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.actions.createRoom}
            </button>
            <button
              type="button"
              onClick={() => setMode('join')}
              className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                mode === 'join'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.actions.joinRoom}
            </button>
          </div>

          <h1 className="mt-6 font-display text-2xl font-bold text-white sm:text-3xl">
            {mode === 'create' ? 'Yeni Feribot Odası Kur' : 'Davet Koduyla Katıl'}
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Hesap gerekmez. Yalnızca bu sefer için geçerli anonim rumuz ve amblemini seç.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {mode === 'join' && (
              <div>
                <label
                  htmlFor="room-code-input"
                  className="block text-sm font-medium text-slate-200"
                >
                  {t.forms.roomCodeLabel}
                </label>
                <input
                  id="room-code-input"
                  type="text"
                  required
                  maxLength={12}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder={t.forms.roomCodePlaceholder}
                  className="mt-1.5 w-full min-h-[48px] rounded-xl border border-slate-700 bg-[#08101A] px-4 font-mono text-lg font-semibold uppercase tracking-widest text-amber-300 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
                />
              </div>
            )}

            {/* Anonymous Nickname + Randomize */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="nickname-input"
                  className="block text-sm font-medium text-slate-200"
                >
                  {t.forms.nicknameLabel}
                </label>
                <button
                  type="button"
                  onClick={randomize}
                  className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.forms.randomizeIdentity}
                </button>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <MaritimeAvatar
                  avatar={identity.avatar}
                  colorIndex={identity.colorIndex}
                  size="md"
                />
                <input
                  id="nickname-input"
                  type="text"
                  required
                  maxLength={24}
                  value={identity.nickname}
                  onChange={(e) =>
                    setIdentity((prev) => ({ ...prev, nickname: e.target.value }))
                  }
                  placeholder={t.forms.nicknamePlaceholder}
                  className="min-w-0 w-full min-h-[48px] rounded-xl border border-slate-700 bg-[#08101A] px-4 text-base text-white placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Avatar emblem picker */}
            <div>
              <span className="block text-sm font-medium text-slate-200">
                {t.forms.avatarPickerLabel}
              </span>
              <div className="mt-2 grid grid-cols-5 gap-1.5 sm:gap-2">
                {AVATAR_IDS.map((av) => {
                  const selected = identity.avatar === av;
                  return (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setIdentity((prev) => ({ ...prev, avatar: av }))}
                      aria-label={AVATAR_LABELS[av]}
                      aria-pressed={selected}
                      className={`flex min-h-[48px] flex-col items-center justify-center rounded-xl border p-1.5 transition-colors ${
                        selected
                          ? 'border-amber-400 bg-amber-500/15'
                          : 'border-slate-800 bg-[#08101A] hover:border-slate-700'
                      }`}
                    >
                      <MaritimeAvatar
                        avatar={av}
                        colorIndex={identity.colorIndex}
                        size="sm"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {mode === 'create' && (
              <div className="space-y-4 rounded-2xl border border-slate-800 bg-[#0B1522] p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="max-players-select"
                      className="block text-xs font-medium text-slate-300"
                    >
                      {t.forms.maxPlayersLabel}
                    </label>
                    <select
                      id="max-players-select"
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(Number(e.target.value))}
                      className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-700 bg-[#08101A] px-3 text-sm text-white focus:border-amber-400 focus:outline-none"
                    >
                      {[6, 7, 8, 9, 10].map((n) => (
                        <option key={n} value={n}>
                          {n} Oyuncu ({n <= 7 ? '1 Kaçak' : '2 Kaçak'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="turn-seconds-select"
                      className="block text-xs font-medium text-slate-300"
                    >
                      {t.forms.turnSecondsLabel}
                    </label>
                    <select
                      id="turn-seconds-select"
                      value={turnSeconds}
                      onChange={(e) => setTurnSeconds(Number(e.target.value))}
                      className="mt-1.5 w-full min-h-[44px] rounded-xl border border-slate-700 bg-[#08101A] px-3 text-sm text-white focus:border-amber-400 focus:outline-none"
                    >
                      {[30, 45, 60, 75, 90].map((s) => (
                        <option key={s} value={s}>
                          {s} saniye
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Optional voice chat toggle */}
                <div className="border-t border-slate-800 pt-3">
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-200">
                      {t.forms.voiceToggleLabel}
                    </span>
                    <input
                      type="checkbox"
                      disabled={!livekitAvailable}
                      checked={livekitAvailable && voiceEnabled}
                      onChange={(e) => setVoiceEnabled(e.target.checked)}
                      className="h-5 w-5 accent-amber-500 disabled:opacity-40"
                    />
                  </label>
                  {!livekitAvailable && (
                    <p className="mt-2 flex items-start gap-2 text-xs text-slate-400">
                      <VolumeX className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                      <span>{t.forms.voiceUnavailableHint}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-200"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[48px] rounded-xl bg-amber-500 px-6 py-3 text-base font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60 transition-colors"
            >
              {isSubmitting
                ? 'Hazırlanıyor...'
                : mode === 'create'
                  ? 'Odayı Kur ve İskele Lobisine Geç'
                  : 'Odaya Katıl'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
