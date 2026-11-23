import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Anchor,
  Check,
  CheckCircle2,
  Clock,
  CloudFog,
  CloudLightning,
  Flag,
  Headphones,
  Mic,
  MicOff,
  Navigation,
  Radio,
  Shield,
  Skull,
  Volume2,
  VolumeX,
  Wrench,
  XCircle,
} from 'lucide-react';
import { getDictionary } from '../game/i18n';
import { getTeamSize, MAX_CONSECUTIVE_REJECTIONS, MAX_ROUNDS } from '../game/rules';
import type { ClientGameState, CrisisCardId, MissionCard } from '../game/types';
import type { VoiceChannel } from '../hooks/useLiveKitVoice';
import { MaritimeAvatar } from './MaritimeAvatar';

const YARDIM_CARD_IMG = '/src/assets/images/card_yardim_1795464715627.jpg';
const SABOTAJ_CARD_IMG = '/src/assets/images/card_sabotaj_1795464717472.jpg';

function CrisisIcon({ id }: { id: CrisisCardId }) {
  switch (id) {
    case 'YOGUN_SIS':
      return <CloudFog className="h-5 w-5 text-sky-300" aria-hidden="true" />;
    case 'BOZUK_TELSIZ':
      return <Radio className="h-5 w-5 text-amber-300" aria-hidden="true" />;
    case 'ACIL_ONARIM':
      return <Wrench className="h-5 w-5 text-rose-300" aria-hidden="true" />;
  }
}

export function GameBoard({
  state,
  secondsLeft,
  mutedPlayerIds,
  reportedPlayerIds,
  onToggleMute,
  onReportPlayer,
  onProposeTeam,
  onVoteTeam,
  onPlayMissionCard,
  onNextRound,
  onOpenPrivacy,
  voice,
}: {
  state: ClientGameState;
  secondsLeft: number | null;
  mutedPlayerIds: Set<string>;
  reportedPlayerIds: Set<string>;
  onToggleMute: (playerId: string) => void;
  onReportPlayer: (playerId: string) => void;
  onProposeTeam: (teamIds: string[]) => void;
  onVoteTeam: (accept: boolean) => void;
  onPlayMissionCard: (card: MissionCard) => void;
  onNextRound: () => void;
  onOpenPrivacy: () => void;
  voice: {
    connected: boolean;
    connecting: boolean;
    micActive: boolean;
    activeSpeakers: string[];
    voiceError: string | null;
    channel: VoiceChannel;
    onChangeChannel: (ch: VoiceChannel) => void;
    onToggleMic: () => void;
    onJoinListen: () => void;
  };
}) {
  const t = getDictionary('tr');
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);

  // Reset selected team when round/phase changes
  useEffect(() => {
    setSelectedTeam([]);
  }, [state.round, state.phase, state.captainIndex]);

  const captain = state.players[state.captainIndex];
  const isCaptain = captain?.id === state.me.id;
  const requiredTeamSize =
    state.round >= 1 && state.round <= MAX_ROUNDS
      ? getTeamSize(state.players.length, state.round)
      : 2;
  const isInProposedTeam = state.proposedTeamIds.includes(state.me.id);
  const myRole = state.me.role;
  const canUseKacakVoice = myRole === 'KACAK' && state.players.length >= 8;
  const isSecretVoiceMutePhase =
    (state.phase === 'TEAM_VOTE' || state.phase === 'MISSION_EXECUTION') &&
    voice.channel !== 'KACAK';

  const toggleTeamMember = (id: string) => {
    if (!isCaptain || state.phase !== 'TEAM_PROPOSAL') return;
    setSelectedTeam((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= requiredTeamSize) return prev;
      return [...prev, id];
    });
  };

  const lastMission = state.missions[state.missions.length - 1];

  return (
    <div className="space-y-5">
      {/* Top Ferry Bridge HUD */}
      <div className="rounded-3xl border border-slate-800 bg-[#0F1B2B] p-3.5 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="font-mono text-xs font-semibold text-amber-300 tabular-nums sm:text-sm">
              Tur {state.round}/{MAX_ROUNDS}
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-xs font-semibold text-white sm:text-sm">
              {t.phases[state.phase]}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
            {secondsLeft !== null && (
              <div
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-2.5 py-1 font-mono text-xs font-semibold tabular-nums sm:px-3 sm:text-sm ${
                  secondsLeft <= 10
                    ? 'border-rose-500/50 bg-rose-950/50 text-rose-200'
                    : 'border-slate-700 bg-[#08101A] text-amber-300'
                }`}
              >
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                <span>{secondsLeft} sn</span>
              </div>
            )}

            {/* Secret role reminder pill (only visible to self) */}
            <div
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold sm:px-3 ${
                myRole === 'KACAK'
                  ? 'border-rose-500/40 bg-rose-950/40 text-rose-200'
                  : 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
              }`}
            >
              {myRole === 'KACAK' ? (
                <Skull className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Anchor className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{myRole === 'KACAK' ? 'Kaçak' : 'Mürettebat'}</span>
            </div>

            {state.livekitAvailable && state.settings.voiceEnabled && (
              <>
                {!voice.connected && (
                  <button
                    type="button"
                    disabled={voice.connecting}
                    onClick={voice.onJoinListen}
                    aria-label="Sesli odayı dinle"
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-700 bg-[#132234] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-[#1B2E45] disabled:opacity-50"
                  >
                    <Headphones className="h-4 w-4 text-sky-400" aria-hidden="true" />
                    <span className="hidden sm:inline">
                      {voice.connecting ? 'Bağlanıyor...' : 'Dinle'}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={isSecretVoiceMutePhase || voice.connecting}
                  onClick={voice.onToggleMic}
                  aria-label={voice.micActive ? 'Mikrofonu kapat' : 'Mikrofonu aç'}
                  className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                    isSecretVoiceMutePhase
                      ? 'border-slate-700 bg-slate-800 text-slate-400'
                      : voice.micActive
                        ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200'
                        : 'border-slate-700 bg-[#132234] text-slate-200'
                  }`}
                >
                  {voice.micActive && !isSecretVoiceMutePhase ? (
                    <Mic className="h-4 w-4" />
                  ) : (
                    <MicOff className="h-4 w-4" />
                  )}
                  <span>
                    {isSecretVoiceMutePhase
                      ? 'Oylamada Sessiz'
                      : voice.connecting
                        ? 'Bağlanıyor'
                        : voice.micActive
                          ? 'Açık'
                          : 'Mikrofon'}
                  </span>
                </button>
                {canUseKacakVoice && (
                  <button
                    type="button"
                    onClick={() =>
                      voice.onChangeChannel(voice.channel === 'KACAK' ? 'DECK' : 'KACAK')
                    }
                    className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold ${
                      voice.channel === 'KACAK'
                        ? 'border-rose-500/50 bg-rose-600/25 text-rose-200'
                        : 'border-slate-700 bg-[#132234] text-slate-300'
                    }`}
                  >
                    <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{voice.channel === 'KACAK' ? 'Kaçak Sesi' : 'Güverte Sesi'}</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={onOpenPrivacy}
              aria-label={t.actions.privacyAndVoice}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-700 bg-[#132234] text-slate-300 hover:text-white"
            >
              <Shield className="h-4 w-4" />
            </button>
          </div>
        </div>

        {voice.voiceError && <p className="mt-2 text-xs text-amber-300">{voice.voiceError}</p>}

        {/* 5-Mission Track (Color + Icon + Label for colorblind clarity) */}
        <div className="mt-4 grid grid-cols-5 gap-1.5 sm:gap-2">
          {[1, 2, 3, 4, 5].map((roundNum) => {
            const record = state.missions.find((m) => m.round === roundNum);
            const isCurrent = state.round === roundNum && !record;
            const size = getTeamSize(state.players.length, roundNum);

            let style = 'border-slate-800 bg-[#08101A] text-slate-400';
            let statusText = `${size} Kişi`;
            if (record?.outcome === 'SUCCESS') {
              style = 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200';
              statusText = 'Başarılı';
            } else if (record?.outcome === 'FAIL') {
              style = 'border-rose-500/50 bg-rose-950/40 text-rose-200';
              statusText = 'Sabotaj';
            } else if (record?.outcome === 'STORM') {
              style = 'border-amber-500/50 bg-amber-950/40 text-amber-200';
              statusText = 'Fırtına';
            } else if (isCurrent) {
              style = 'border-amber-400/70 bg-[#15263B] text-white';
            }

            return (
              <div
                key={roundNum}
                className={`flex min-w-0 flex-col items-center justify-center rounded-xl border px-1 py-2 text-center sm:rounded-2xl sm:px-2 sm:py-2.5 ${style}`}
              >
                <span className="font-mono text-[10px] font-semibold tabular-nums sm:text-[11px]">
                  #{roundNum}
                </span>
                <div className="my-1">
                  {record?.outcome === 'SUCCESS' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" aria-hidden="true" />
                  ) : record?.outcome === 'FAIL' ? (
                    <XCircle className="h-4 w-4 text-rose-400 sm:h-5 sm:w-5" aria-hidden="true" />
                  ) : record?.outcome === 'STORM' ? (
                    <CloudLightning className="h-4 w-4 text-amber-400 sm:h-5 sm:w-5" aria-hidden="true" />
                  ) : (
                    <span className="font-mono text-xs font-bold tabular-nums sm:text-sm">{size}</span>
                  )}
                </div>
                <span className="max-w-full truncate text-[10px] font-medium leading-tight sm:text-[11px]">
                  {statusText}
                </span>
              </div>
            );
          })}
        </div>

        {/* Storm Rejection Meter */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <CloudLightning className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            <span>
              Fırtına Sayacı:{' '}
              <strong className="font-mono tabular-nums text-white">
                {state.consecutiveRejections}/{MAX_CONSECUTIVE_REJECTIONS}
              </strong>{' '}
              <span className="hidden sm:inline">(3 ret olursa görev başarısız sayılır)</span>
            </span>
          </div>
          <div>
            Kaptan: <strong className="text-amber-300">{captain?.nickname}</strong>
          </div>
        </div>
      </div>

      {/* Active Crisis Card Banner */}
      {state.currentCrisisCard && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-[#152233] p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-[#08101A]">
            <CrisisIcon id={state.currentCrisisCard} />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-amber-300">
              <span>{t.crisis[state.currentCrisisCard].badge}</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-white">
                {t.crisis[state.currentCrisisCard].title}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              {t.crisis[state.currentCrisisCard].description}
            </p>
          </div>
        </div>
      )}

      {/* Last Team Vote Summary Banner */}
      {state.lastVoteResult && state.phase !== 'TEAM_VOTE' && (
        <div className="rounded-2xl border border-slate-800 bg-[#0B1522] px-4 py-3 text-xs text-slate-300">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-slate-200">
              Son Ekip Oylaması ({state.lastVoteResult.approved ? 'Kabul Edildi' : 'Reddedildi'})
            </span>
            <div className="flex flex-wrap gap-2">
              {state.players.map((p) => {
                const v = state.lastVoteResult?.votes[p.id];
                return (
                  <span key={p.id} className="inline-flex items-center gap-1 text-[11px]">
                    <span className="text-slate-400">{p.nickname}:</span>
                    <span className={v ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                      {v ? 'Kabul' : 'Ret'}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Phase Action Zone (Above the fold for immediate visibility) */}
      <div className="rounded-3xl border border-slate-700/80 bg-[#132234] p-4 sm:p-5 shadow-xl">
        {state.phase === 'TEAM_PROPOSAL' && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">
                {isCaptain ? 'Görev Ekibini Oluştur' : `${captain?.nickname} Ekip Seçiyor`}
              </h3>
              <p className="mt-1 text-xs text-slate-300">
                {isCaptain
                  ? `Aşağıdan tam olarak ${requiredTeamSize} oyuncu seçip oylamaya sun.`
                  : 'Kaptan ekip önerdiğinde kabul veya ret oyu vereceksin.'}
              </p>
            </div>
            {isCaptain && (
              <button
                type="button"
                disabled={selectedTeam.length !== requiredTeamSize}
                onClick={() => onProposeTeam(selectedTeam)}
                className="min-h-[48px] w-full shrink-0 rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-45 whitespace-nowrap sm:w-auto"
              >
                {t.actions.proposeTeam} ({selectedTeam.length}/{requiredTeamSize})
              </button>
            )}
          </div>
        )}

        {state.phase === 'TEAM_VOTE' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-white">Önerilen Ekibi Oyla</h3>
              <p className="mt-1 text-xs text-slate-300">
                Önerilen ekip:{' '}
                <strong className="text-amber-300">
                  {state.proposedTeamIds
                    .map((id) => state.players.find((p) => p.id === id)?.nickname)
                    .filter(Boolean)
                    .join(', ')}
                </strong>
              </p>
            </div>

            {state.me.myVote !== null ? (
              <div className="rounded-xl border border-slate-700 bg-[#08101A] px-4 py-3 text-sm text-slate-200">
                Oyun kaydedildi:{' '}
                <strong className={state.me.myVote ? 'text-emerald-400' : 'text-rose-400'}>
                  {state.me.myVote ? 'Ekibi Kabul Et' : 'Ekibi Reddet'}
                </strong>
                . Diğer oyuncular bekleniyor...
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => onVoteTeam(true)}
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white hover:bg-emerald-500"
                >
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  {t.actions.acceptTeam}
                </button>
                <button
                  type="button"
                  onClick={() => onVoteTeam(false)}
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-base font-semibold text-white hover:bg-rose-500"
                >
                  <XCircle className="h-5 w-5" aria-hidden="true" />
                  {t.actions.rejectTeam}
                </button>
              </div>
            )}
          </div>
        )}

        {state.phase === 'MISSION_EXECUTION' && (
          <div className="space-y-4">
            {!isInProposedTeam ? (
              <div>
                <h3 className="text-base font-semibold text-white">Görev İcra Ediliyor</h3>
                <p className="mt-1 text-xs text-slate-300">
                  Seçilen görev ekibi gizli kartlarını oynuyor. Telsizde tahminlerini paylaşabilirsin.
                </p>
              </div>
            ) : state.me.myPlayedCard ? (
              <div className="rounded-xl border border-slate-700 bg-[#08101A] px-4 py-3 text-sm text-slate-200">
                Kartın gizlice kaydedildi:{' '}
                <strong
                  className={
                    state.me.myPlayedCard === 'SABOTAJ' ? 'text-rose-400' : 'text-emerald-400'
                  }
                >
                  {state.me.myPlayedCard === 'SABOTAJ' ? 'Sabotaj Yap' : 'Yardım Et'}
                </strong>
                . Ekibin diğer üyeleri bekleniyor...
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-semibold text-white">Gizli Görev Kartını Oyna</h3>
                  <p className="mt-1 text-xs text-slate-300">
                    {myRole === 'KACAK'
                      ? 'Kaçak olarak güven kazanmak için Yardım Et oynayabilir veya görevi bozmak için Sabotaj Yap seçebilirsin.'
                      : 'Mürettebat üyesi olarak gemiyi limana yaklaştırmak için Yardım Et kartını oyna.'}
                  </p>
                </div>

                <div
                  className={`grid gap-3 sm:gap-4 ${
                    myRole === 'KACAK' ? 'grid-cols-1 min-[360px]:grid-cols-2' : 'grid-cols-1 max-w-xs'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onPlayMissionCard('YARDIM')}
                    className="group overflow-hidden rounded-2xl border border-emerald-500/50 bg-[#08101A] text-left hover:border-emerald-400 transition-colors"
                  >
                    <div className="aspect-[3/4] max-h-28 w-full overflow-hidden bg-emerald-950/40 sm:max-h-40">
                      <img
                        src={YARDIM_CARD_IMG}
                        alt="Yardım Et görev kartı"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{t.actions.playYardim}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Görevin başarıyla tamamlanmasına katkı ver.
                      </p>
                    </div>
                  </button>

                  {myRole === 'KACAK' && (
                    <button
                      type="button"
                      onClick={() => onPlayMissionCard('SABOTAJ')}
                      className="group overflow-hidden rounded-2xl border border-rose-500/50 bg-[#08101A] text-left hover:border-rose-400 transition-colors"
                    >
                      <div className="aspect-[3/4] max-h-28 w-full overflow-hidden bg-rose-950/40 sm:max-h-40">
                        <img
                          src={SABOTAJ_CARD_IMG}
                          alt="Sabotaj Yap görev kartı"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-3">
                        <div className="flex items-center gap-1.5 text-sm font-bold text-rose-300">
                          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>{t.actions.playSabotaj}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          Görevi gizlice başarısızlığa uğrat.
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {state.phase === 'MISSION_RESULT' && lastMission && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {lastMission.outcome === 'SUCCESS' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                ) : lastMission.outcome === 'STORM' ? (
                  <CloudLightning className="h-5 w-5 text-amber-400" aria-hidden="true" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-400" aria-hidden="true" />
                )}
                <h3 className="font-display text-xl font-bold text-white">
                  {lastMission.outcome === 'SUCCESS'
                    ? t.status.missionSuccess
                    : lastMission.outcome === 'STORM'
                      ? t.status.stormTriggered
                      : t.status.missionFail}
                </h3>
              </div>

              {lastMission.outcome === 'FAIL' && lastMission.sabotageCount === null ? (
                <p className="text-xs text-sky-300">{t.status.fogHiddenCount}</p>
              ) : lastMission.outcome !== 'STORM' ? (
                <p className="text-xs text-slate-300 tabular-nums">
                  Oynanan kartlar: {lastMission.yardimCount ?? 0} Yardım ·{' '}
                  {lastMission.sabotageCount ?? 0} Sabotaj (Kimin oynadığı açıklanmaz)
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onNextRound}
              className="min-h-[48px] shrink-0 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400"
            >
              {t.actions.nextRound}
            </button>
          </div>
        )}
      </div>

      {/* Crew Grid */}
      <div className="rounded-3xl border border-slate-800 bg-[#0F1B2B] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-white">Güverte Ekibi</h2>
          {state.phase === 'TEAM_PROPOSAL' && (
            <span className="text-xs text-amber-300 tabular-nums">
              {isCaptain
                ? `Ekip için ${requiredTeamSize} kişi seç (${selectedTeam.length}/${requiredTeamSize})`
                : `${captain?.nickname} ${requiredTeamSize} kişilik ekip seçiyor`}
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {state.players.map((p) => {
            const isCap = captain?.id === p.id;
            const isSelected =
              state.phase === 'TEAM_PROPOSAL'
                ? selectedTeam.includes(p.id)
                : state.proposedTeamIds.includes(p.id);
            const isMe = p.id === state.me.id;
            const isMuted = mutedPlayerIds.has(p.id);
            const isReported = reportedPlayerIds.has(p.id);

            const canSelect = isCaptain && state.phase === 'TEAM_PROPOSAL';

            return (
              <div
                key={p.id}
                className={`flex items-center justify-between gap-2 rounded-2xl border p-3 transition-colors ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/15'
                    : 'border-slate-800 bg-[#0B1522]'
                }`}
              >
                {canSelect ? (
                  <button
                    type="button"
                    onClick={() => toggleTeamMember(p.id)}
                    aria-pressed={isSelected}
                    className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <MaritimeAvatar avatar={p.avatar} colorIndex={p.colorIndex} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-white">
                          {p.nickname}
                        </span>
                        {isCap && (
                          <Navigation
                            className="h-3.5 w-3.5 shrink-0 text-amber-400"
                            aria-label="Kaptan"
                          />
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {isSelected ? 'Ekibe seçildi' : 'Seçmek için dokun'}
                      </div>
                    </div>
                    {isSelected && <Check className="h-5 w-5 shrink-0 text-amber-400" />}
                  </button>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <MaritimeAvatar avatar={p.avatar} colorIndex={p.colorIndex} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-white">
                          {p.nickname}
                        </span>
                        {isCap && (
                          <Navigation
                            className="h-3.5 w-3.5 shrink-0 text-amber-400"
                            aria-label="Kaptan"
                          />
                        )}
                        {isMe && <span className="text-xs text-amber-300">(Sen)</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        {!p.isConnected ? (
                          <span className="text-amber-400">Bağlantı koptu</span>
                        ) : voice.activeSpeakers.includes(p.id) ? (
                          <span className="font-medium text-emerald-400">Konuşuyor</span>
                        ) : isSelected ? (
                          <span className="text-amber-300 font-medium">Görev Ekibinde</span>
                        ) : state.phase === 'TEAM_VOTE' ? (
                          <span>{p.hasVoted ? 'Oy verdi' : 'Düşünüyor'}</span>
                        ) : (
                          <span>Hazır</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Per-player local mute & server report controls */}
                {!isMe && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleMute(p.id)}
                      aria-label={
                        isMuted ? `${p.nickname} sesini aç` : `${p.nickname} sustur`
                      }
                      title={isMuted ? t.actions.unmute : t.actions.mute}
                      className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border ${
                        isMuted
                          ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                          : 'border-slate-800 bg-[#08101A] text-slate-400 hover:text-white'
                      }`}
                    >
                      {isMuted ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={isReported}
                      onClick={() => onReportPlayer(p.id)}
                      aria-label={`${p.nickname} şikâyet et`}
                      title={isReported ? t.actions.reportSubmitted : t.actions.report}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-800 bg-[#08101A] text-slate-400 hover:text-rose-300 disabled:opacity-40"
                    >
                      <Flag className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
