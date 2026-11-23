import { useCallback, useEffect, useRef, useState } from 'react';
import { Award, MessageSquare, Ship, WifiOff } from 'lucide-react';
import {
  ACHIEVEMENTS,
  clearLocalProfile,
  evaluateMatchAchievements,
  loadLocalProfile,
  saveLocalProfile,
  type AchievementDefinition,
  type LocalPlayerProfile,
} from './game/achievements';
import { getDictionary } from './game/i18n';
import type {
  AvatarId,
  ClientGameState,
  MissionCard,
  PublicRoomSummary,
  RoomSettings,
} from './game/types';
import { AchievementsModal } from './components/AchievementsModal';
import { ChatPanel } from './components/ChatPanel';
import { CreateJoinPanel } from './components/CreateJoinPanel';
import { GameBoard } from './components/GameBoard';
import { InfoPrivacyModal } from './components/InfoPrivacyModal';
import { LobbyScreen } from './components/LobbyScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { RoleRevealModal } from './components/RoleRevealModal';
import { TitleScreen } from './components/TitleScreen';
import { useLiveKitVoice, type VoiceChannel } from './hooks/useLiveKitVoice';

type ScreenView = 'TITLE' | 'CREATE' | 'JOIN' | 'ROOM';

export default function App() {
  const t = getDictionary('tr');

  const [view, setView] = useState<ScreenView>(() => {
    if (typeof window === 'undefined') return 'TITLE';
    const params = new URLSearchParams(window.location.search);
    if (params.get('code')) return 'JOIN';
    if (params.get('autostart') === '1') return 'CREATE';
    return 'TITLE';
  });

  const [inviteCode] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('code')?.toUpperCase() ?? '';
  });

  const [livekitAvailable, setLivekitAvailable] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [publicRooms, setPublicRooms] = useState<PublicRoomSummary[]>([]);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [mobileTab, setMobileTab] = useState<'GAME' | 'CHAT'>('GAME');
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Modals
  const [infoModal, setInfoModal] = useState<'privacy' | 'rules' | null>(null);
  const [achievementsOpen, setAchievementsOpen] = useState(false);

  // Moderation & Voice local state
  const [mutedIds, setMutedIds] = useState<Set<string>>(() => new Set());
  const [reportedIds, setReportedIds] = useState<Set<string>>(() => new Set());
  const [voiceChannel, setVoiceChannel] = useState<VoiceChannel>('DECK');

  // Local browser-only achievements profile (never linked to a server account)
  const [profile, setProfile] = useState<LocalPlayerProfile>(() => loadLocalProfile());
  const [newlyUnlocked, setNewlyUnlocked] = useState<AchievementDefinition[]>([]);
  const processedMatchKeyRef = useRef<string>('');

  // Keep bearer session token strictly in React memory (never localStorage/sessionStorage)
  const sessionTokenRef = useRef<string>('');
  const roomCodeRef = useRef<string>('');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const unmountedRef = useRef(false);
  const hasWsPresenceRef = useRef(false);
  const hasWsRoomsRef = useRef(false);

  // Sync body state attribute for accessibility & verification
  useEffect(() => {
    if (view !== 'ROOM' || !gameState) {
      document.body.dataset.state = 'title';
    } else if (gameState.phase === 'GAME_OVER') {
      document.body.dataset.state = 'gameover';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [view, gameState]);

  // Fetch public server config & initial open rooms
  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        if (typeof data?.livekitAvailable === 'boolean') {
          setLivekitAvailable(data.livekitAvailable);
        }
        if (typeof data?.onlineCount === 'number' && !hasWsPresenceRef.current) {
          setOnlineCount(Math.max(1, data.onlineCount));
        }
        if (Array.isArray(data?.publicRooms) && !hasWsRoomsRef.current) {
          setPublicRooms(data.publicRooms);
        }
      })
      .catch(() => {});
  }, []);

  const refreshPublicRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.rooms)) {
        setPublicRooms(data.rooms);
      }
    } catch {
      // Ignore transient network errors
    }
  }, []);

  // Countdown tick synced to server phaseEndsAt
  useEffect(() => {
    if (!gameState?.phaseEndsAt) {
      setSecondsLeft(null);
      return;
    }
    const update = () => {
      const diff = Math.max(0, Math.ceil((gameState.phaseEndsAt! - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    update();
    const id = window.setInterval(update, 500);
    return () => window.clearInterval(id);
  }, [gameState?.phaseEndsAt]);

  // Evaluate local achievements once per completed match
  useEffect(() => {
    if (!gameState || gameState.phase !== 'GAME_OVER' || !gameState.winner) return;
    const matchKey = `${gameState.code}:${gameState.missions.length}:${gameState.winner}`;
    if (processedMatchKeyRef.current === matchKey) return;
    processedMatchKeyRef.current = matchKey;

    setProfile((prev) => {
      const { nextProfile, newlyUnlocked: unlockedNow } = evaluateMatchAchievements(
        gameState,
        prev
      );
      saveLocalProfile(nextProfile);
      setNewlyUnlocked(unlockedNow);
      return nextProfile;
    });
  }, [gameState]);

  const ensureSiteWebSocket = useCallback(() => {
    if (unmountedRef.current) return;
    const existing = wsRef.current;
    if (
      existing &&
      (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      if (roomCodeRef.current && sessionTokenRef.current) {
        ws.send(
          JSON.stringify({
            type: 'auth',
            code: roomCodeRef.current,
            token: sessionTokenRef.current,
          })
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg?.type === 'presence' && typeof msg.onlineCount === 'number') {
          hasWsPresenceRef.current = true;
          setOnlineCount(Math.max(1, msg.onlineCount));
        } else if (msg?.type === 'rooms' && Array.isArray(msg.rooms)) {
          hasWsRoomsRef.current = true;
          setPublicRooms(msg.rooms);
        } else if (msg?.type === 'state' && msg.state) {
          setGameState(msg.state);
          // If player was kicked from lobby, exit gracefully
          const stillInRoom = msg.state.players.some(
            (p: { id: string }) => p.id === msg.state.me.id
          );
          if (!stillInRoom) {
            sessionTokenRef.current = '';
            roomCodeRef.current = '';
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'leave_room' }));
            }
            setGameState(null);
            setView('TITLE');
            setError('Oda sahibi tarafından lobiden çıkarıldınız.');
          }
        } else if (msg?.type === 'error' && msg.error) {
          setError(msg.error);
        }
      } catch {
        // Ignore malformed socket frames
      }
    };

    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      setWsConnected(false);
      if (!unmountedRef.current) {
        reconnectTimerRef.current = window.setTimeout(() => {
          ensureSiteWebSocket();
        }, 1800);
      }
    };
  }, []);

  const authRoomSocket = useCallback(
    (code: string, token: string) => {
      const current = wsRef.current;
      if (current && current.readyState === WebSocket.OPEN) {
        current.send(JSON.stringify({ type: 'auth', code, token }));
      } else {
        ensureSiteWebSocket();
      }
    },
    [ensureSiteWebSocket]
  );

  useEffect(() => {
    unmountedRef.current = false;
    ensureSiteWebSocket();
    return () => {
      unmountedRef.current = true;
      roomCodeRef.current = '';
      sessionTokenRef.current = '';
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [ensureSiteWebSocket]);

  const handleCreateRoom = async (data: {
    nickname: string;
    avatar: AvatarId;
    colorIndex: number;
    maxPlayers: number;
    turnSeconds: number;
    voiceEnabled: boolean;
    isPublic: boolean;
  }) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Oda kurulamadı.');

      sessionTokenRef.current = json.sessionToken;
      roomCodeRef.current = json.code;
      setGameState(json.state);
      setView('ROOM');
      authRoomSocket(json.code, json.sessionToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Oda kurulamadı.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinRoom = async (data: {
    code: string;
    nickname: string;
    avatar: AvatarId;
    colorIndex: number;
  }) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(data.code)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: data.nickname,
          avatar: data.avatar,
          colorIndex: data.colorIndex,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Odaya katılınamadı.');

      sessionTokenRef.current = json.sessionToken;
      roomCodeRef.current = json.code;
      setGameState(json.state);
      setView('ROOM');
      authRoomSocket(json.code, json.sessionToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Odaya katılınamadı.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dispatchAction = async (action: string, payload?: Record<string, unknown>) => {
    if (!roomCodeRef.current || !sessionTokenRef.current) return;
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomCodeRef.current)}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionTokenRef.current}`,
        },
        body: JSON.stringify({ action, payload }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'İşlem gerçekleştirilemedi.');
        return;
      }
      if (json.state) {
        setGameState(json.state);
      }
    } catch {
      setError('Sunucuya bağlanılamadı.');
    }
  };

  const handleLeaveRoom = () => {
    roomCodeRef.current = '';
    sessionTokenRef.current = '';
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'leave_room' }));
    }
    setGameState(null);
    setNewlyUnlocked([]);
    setMutedIds(new Set());
    setReportedIds(new Set());
    setView('TITLE');
  };

  const handleToggleMute = (playerId: string) => {
    setMutedIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const handleReportPlayer = async (targetPlayerId: string) => {
    setReportedIds((prev) => new Set(prev).add(targetPlayerId));
    await dispatchAction('REPORT_PLAYER', {
      targetPlayerId,
      reason: 'Oyun içi rahatsız edici davranış bildirimi',
    });
  };

  const fetchVoiceToken = useCallback(async (channel: VoiceChannel) => {
    const res = await fetch('/api/voice/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionTokenRef.current}`,
      },
      body: JSON.stringify({ code: roomCodeRef.current, channel }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Sesli oda belirteci alınamadı.');
    }
    return {
      token: String(json.token),
      url: String(json.url),
      roomName: String(json.roomName),
    };
  }, []);

  const isVoiceMutedPhase = Boolean(
    gameState &&
      (gameState.phase === 'TEAM_VOTE' || gameState.phase === 'MISSION_EXECUTION') &&
      voiceChannel !== 'KACAK'
  );

  const voice = useLiveKitVoice({
    enabled: Boolean(
      view === 'ROOM' &&
        gameState &&
        gameState.livekitAvailable &&
        gameState.settings.voiceEnabled
    ),
    roomCode: gameState?.code ?? '',
    channel: voiceChannel,
    isMutedPhase: isVoiceMutedPhase,
    mutedPlayerIds: mutedIds,
    fetchToken: fetchVoiceToken,
  });

  const unlockedCount = Object.keys(profile.unlocked).length;

  return (
    <>
      {view === 'TITLE' && (
        <TitleScreen
          unlockedCount={unlockedCount}
          totalAchievements={ACHIEVEMENTS.length}
          onlineCount={onlineCount}
          openRoomsCount={publicRooms.length}
          onOpenCreate={() => {
            setError(null);
            setView('CREATE');
          }}
          onOpenJoin={() => {
            setError(null);
            refreshPublicRooms();
            setView('JOIN');
          }}
          onOpenRules={() => setInfoModal('rules')}
          onOpenPrivacy={() => setInfoModal('privacy')}
          onOpenAchievements={() => setAchievementsOpen(true)}
        />
      )}

      {(view === 'CREATE' || view === 'JOIN') && (
        <CreateJoinPanel
          initialMode={view === 'CREATE' ? 'create' : 'join'}
          initialRoomCode={inviteCode}
          livekitAvailable={livekitAvailable}
          onlineCount={onlineCount}
          publicRooms={publicRooms}
          isSubmitting={isSubmitting}
          error={error}
          onBack={() => {
            setError(null);
            setView('TITLE');
          }}
          onRefreshRooms={refreshPublicRooms}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      )}

      {view === 'ROOM' && gameState && (
        <div className="min-h-dvh bg-[#08101A] pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-8">
          {/* Compact Room Top Bar */}
          <header className="border-b border-slate-800/80 bg-[#0B1522] pt-[env(safe-area-inset-top)]">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <Ship className="h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
                <span className="truncate font-display text-base font-bold text-white sm:text-lg">
                  {t.appName}
                </span>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono text-xs font-semibold text-amber-300 tabular-nums sm:text-sm">
                  {gameState.code}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {!wsConnected && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-300">
                    <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">{t.status.reconnecting}</span>
                  </span>
                )}
                <span
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-300 tabular-nums"
                  title="Sitedeki anlık çevrimiçi sayısı"
                  aria-label={`Çevrimiçi sayısı: ${Math.max(1, onlineCount ?? 1)}`}
                >
                  <span
                    className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"
                    aria-hidden="true"
                  />
                  <span className="hidden sm:inline">Çevrimiçi:</span>
                  <span>{Math.max(1, onlineCount ?? 1)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setAchievementsOpen(true)}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-700 bg-[#132234] px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-[#1B2E45]"
                >
                  <Award className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Başarımlar</span>
                  <span className="tabular-nums">
                    ({unlockedCount}/{ACHIEVEMENTS.length})
                  </span>
                </button>
              </div>
            </div>
          </header>

          {error && (
            <div className="mx-auto max-w-7xl px-3 pt-3 sm:px-6 sm:pt-4">
              <div
                role="alert"
                className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-950/60 px-4 py-2.5 text-sm text-rose-200"
              >
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="min-h-[36px] shrink-0 text-xs font-semibold underline"
                >
                  Kapat
                </button>
              </div>
            </div>
          )}

          {/* Main Room Layout: 2-col on Desktop, Tabbed on Mobile */}
          <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-5">
            {gameState.phase === 'ROLE_REVEAL' ? (
              <RoleRevealModal
                state={gameState}
                secondsLeft={secondsLeft}
                onAcknowledge={() => dispatchAction('ACK_ROLE')}
              />
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
                <div className={mobileTab === 'CHAT' ? 'hidden lg:block' : 'block'}>
                  {gameState.phase === 'LOBBY' ? (
                    <LobbyScreen
                      state={gameState}
                      onToggleReady={() => dispatchAction('TOGGLE_READY')}
                      onUpdateSettings={(patch: Partial<RoomSettings>) =>
                        dispatchAction('UPDATE_SETTINGS', patch)
                      }
                      onKickPlayer={(targetPlayerId: string) =>
                        dispatchAction('KICK_PLAYER', { targetPlayerId })
                      }
                      onStartGame={() => dispatchAction('START_GAME')}
                      onLeave={handleLeaveRoom}
                      onOpenPrivacy={() => setInfoModal('privacy')}
                      voice={{
                        connected: voice.connected,
                        connecting: voice.connecting,
                        micActive: voice.micActive,
                        voiceError: voice.voiceError,
                        onToggleMic: voice.toggleMic,
                        onJoinListen: voice.joinAudioListener,
                      }}
                    />
                  ) : gameState.phase === 'GAME_OVER' ? (
                    <ResultsScreen
                      state={gameState}
                      newlyUnlocked={newlyUnlocked}
                      onPlayAgain={() => {
                        setNewlyUnlocked([]);
                        dispatchAction('PLAY_AGAIN');
                      }}
                      onNewRoom={handleLeaveRoom}
                      onOpenAchievements={() => setAchievementsOpen(true)}
                    />
                  ) : (
                    <GameBoard
                      state={gameState}
                      secondsLeft={secondsLeft}
                      mutedPlayerIds={mutedIds}
                      reportedPlayerIds={reportedIds}
                      onToggleMute={handleToggleMute}
                      onReportPlayer={handleReportPlayer}
                      onProposeTeam={(teamIds: string[]) =>
                        dispatchAction('PROPOSE_TEAM', { teamIds })
                      }
                      onVoteTeam={(accept: boolean) => dispatchAction('VOTE_TEAM', { accept })}
                      onPlayMissionCard={(card: MissionCard) =>
                        dispatchAction('PLAY_MISSION_CARD', { card })
                      }
                      onNextRound={() => dispatchAction('NEXT_ROUND')}
                      onOpenPrivacy={() => setInfoModal('privacy')}
                      voice={{
                        connected: voice.connected,
                        connecting: voice.connecting,
                        micActive: voice.micActive,
                        activeSpeakers: voice.activeSpeakers,
                        voiceError: voice.voiceError,
                        channel: voiceChannel,
                        onChangeChannel: setVoiceChannel,
                        onToggleMic: voice.toggleMic,
                        onJoinListen: voice.joinAudioListener,
                      }}
                    />
                  )}
                </div>

                <div className={mobileTab === 'GAME' ? 'hidden lg:block' : 'block'}>
                  <ChatPanel
                    state={gameState}
                    mutedPlayerIds={mutedIds}
                    onSendChat={(text, channel, isQuickReaction) =>
                      dispatchAction('SEND_CHAT', { text, channel, isQuickReaction })
                    }
                  />
                </div>
              </div>
            )}

            <footer className="mt-6 border-t border-slate-800/60 pt-4 text-center text-xs text-slate-500">
              Geliştiren: Muhammet Kılıç
            </footer>
          </main>

          {/* Mobile Bottom Switcher with safe-area inset */}
          {gameState.phase !== 'ROLE_REVEAL' && (
            <nav
              aria-label="Mobil Görünüm Seçici"
              className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-2 border-t border-slate-800 bg-[#0B1522]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
            >
              <button
                type="button"
                onClick={() => setMobileTab('GAME')}
                className={`flex min-h-[54px] items-center justify-center gap-2 text-sm font-semibold ${
                  mobileTab === 'GAME' ? 'text-amber-400' : 'text-slate-400'
                }`}
              >
                <Ship className="h-4 w-4" aria-hidden="true" />
                <span>Güverte</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('CHAT')}
                className={`flex min-h-[54px] items-center justify-center gap-2 text-sm font-semibold ${
                  mobileTab === 'CHAT' ? 'text-amber-400' : 'text-slate-400'
                }`}
              >
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                <span>Telsiz ({gameState.messages.length})</span>
              </button>
            </nav>
          )}
        </div>
      )}

      <InfoPrivacyModal
        open={infoModal !== null}
        mode={infoModal ?? 'privacy'}
        livekitAvailable={livekitAvailable}
        onClose={() => setInfoModal(null)}
      />

      <AchievementsModal
        open={achievementsOpen}
        profile={profile}
        onReset={() => setProfile(clearLocalProfile())}
        onClose={() => setAchievementsOpen(false)}
      />
    </>
  );
}
