import { useEffect, useState } from 'react';
import { ArrowLeft, Globe, Lock, Mic, Plus, RefreshCw, Users, VolumeX } from 'lucide-react';
import { getDictionary } from '../game/i18n';
import { AVATAR_IDS, AVATAR_LABELS, generateRandomIdentity } from '../game/names';
import type { AvatarId, PublicRoomSummary } from '../game/types';
import { MaritimeAvatar } from './MaritimeAvatar';

export function CreateJoinPanel({
  initialMode,
  initialRoomCode,
  livekitAvailable,
  onlineCount,
  publicRooms,
  isSubmitting,
  error,
  onBack,
  onRefreshRooms,
  onCreateRoom,
  onJoinRoom,
}: {
  initialMode: 'create' | 'join';
  initialRoomCode?: string;
  livekitAvailable: boolean;
  onlineCount: number | null;
  publicRooms: PublicRoomSummary[];
  isSubmitting: boolean;
  error: string | null;
  onBack: () => void;
  onRefreshRooms: () => void;
  onCreateRoom: (data: {
    nickname: string;
    avatar: AvatarId;
    colorIndex: number;
    maxPlayers: number;
    turnSeconds: number;
    voiceEnabled: boolean;
    isPublic: boolean;
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
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (livekitAvailable) {
      setVoiceEnabled(true);
    }
  }, [livekitAvailable]);

  const randomize = () => {
    setIdentity(generateRandomIdentity());
  };

  const handleDirectJoin = (code: string) => {
    onJoinRoom({
      code,
      nickname: identity.nickname.trim() || 'Yolcu',
      avatar: identity.avatar,
      colorIndex: identity.colorIndex,
    });
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
        isPublic,
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
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Ana Ekrana Dön
          </button>

          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3 py-1 text-xs font-semibold text-emerald-300 tabular-nums"
            title="Sitedeki anlık çevrimiçi sayısı"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
            <span>Çevrimiçi: {Math.max(1, onlineCount ?? 1)}</span>
          </span>
        </div>

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
              className={`min-h-[44px] flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors ${
                mode === 'join'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{t.actions.joinRoom}</span>
              {publicRooms.length > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                    mode === 'join'
                      ? 'bg-slate-950/20 text-slate-950'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {publicRooms.length}
                </span>
              )}
            </button>
          </div>

          <h1 className="mt-6 font-display text-2xl font-bold text-white sm:text-3xl">
            {mode === 'create' ? 'Yeni Feribot Odası Kur' : 'Açık Odalara Katıl'}
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            {mode === 'create'
              ? 'Hesap gerekmez. Yalnızca bu sefer için geçerli anonim rumuz ve amblemini seç.'
              : 'Açık bir odaya tek tıkla gir veya davet kodunu yaz. Rumuzun hazır, dilersen aşağıdan değiştirebilirsin.'}
          </p>

          {mode === 'join' && (
            <section
              aria-label="Açık Odalar"
              className="mt-5 rounded-2xl border border-slate-800 bg-[#0B1522] p-3.5 sm:p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-white">
                    Açık Odalar ({publicRooms.length})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onRefreshRooms}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#08101A] px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-slate-600 hover:text-white transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Yenile</span>
                </button>
              </div>

              {publicRooms.length > 0 ? (
                <ul className="mt-3 space-y-2.5">
                  {publicRooms.map((room) => (
                    <li
                      key={room.code}
                      className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-[#08101A] p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <MaritimeAvatar
                          avatar={room.hostAvatar}
                          colorIndex={room.hostColorIndex}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="truncate text-sm font-semibold text-white">
                              {room.hostNickname}&apos;in Odası
                            </span>
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-amber-300">
                              {room.code}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                            <span className="inline-flex items-center gap-1 tabular-nums text-slate-300">
                              <Users className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                              {room.playerCount}/{room.maxPlayers} Yolcu
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{room.turnSeconds} sn</span>
                            {room.voiceEnabled && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="inline-flex items-center gap-1 text-emerald-300">
                                  <Mic className="h-3 w-3" aria-hidden="true" />
                                  Sesli
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleDirectJoin(room.code)}
                        className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-colors sm:w-auto"
                      >
                        {isSubmitting ? 'Giriliyor...' : 'Katıl'}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-slate-800 bg-[#08101A]/70 p-4 text-center">
                  <p className="text-xs leading-relaxed text-slate-400">
                    Şu an açık bir oda yok. Aşağıdan davet kodu girebilir veya yeni oda kurabilirsin.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMode('create')}
                    className="mt-2.5 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Yeni Oda Kur
                  </button>
                </div>
              )}
            </section>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
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

                {/* Public / Private room listing toggle */}
                <div className="border-t border-slate-800 pt-3">
                  <label className="flex cursor-pointer items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
                        {isPublic ? (
                          <Globe className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
                        ) : (
                          <Lock className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
                        )}
                        Açık Oda (Odalar listesinde görünsün)
                      </span>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {isPublic
                          ? 'Diğer oyuncular oda kodu yazmadan tek tıkla katılabilir.'
                          : 'Yalnızca davet kodu veya linki paylaştığın kişiler girebilir.'}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="h-5 w-5 shrink-0 accent-amber-500"
                    />
                  </label>
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

            {mode === 'join' && (
              <div className="space-y-3 border-t border-slate-800 pt-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  veya davet koduyla gir
                </p>
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
                  : 'Kodla Odaya Katıl'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

