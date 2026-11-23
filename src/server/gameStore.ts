import crypto from 'node:crypto';
import {
  applyStormRule,
  assignRoles,
  buildCrisisDeck,
  checkWinCondition,
  computeAwards,
  DEFAULT_TURN_SECONDS,
  evaluateMissionOutcome,
  evaluateTeamVote,
  getTeamSize,
  isPlayerMutedByRadioCrisis,
  MAX_PLAYERS,
  MAX_TURN_SECONDS,
  MIN_PLAYERS,
  MIN_TURN_SECONDS,
  pickCrisisCard,
  RECONNECT_GRACE_MS,
} from '../game/rules';
import { AVATAR_IDS, generateRandomIdentity } from '../game/names';
import type {
  AvatarId,
  ChatMessage,
  ClientGameState,
  CrisisCardId,
  GamePhase,
  MissionCard,
  MissionRecord,
  PlayerAward,
  PlayerPublicView,
  PublicRoomSummary,
  ReportRecord,
  Role,
  RoomSettings,
  VoteRoundRecord,
} from '../game/types';
import { isLiveKitConfigured } from './livekit';
import type { PersistenceAdapter } from './persistence';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 7;
const ROOM_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const POST_GAME_CHAT_CLEANUP_MS = 3 * 60 * 1000; // 3 minutes after match ends
const MAX_CHAT_LENGTH = 240;
const CHAT_RATE_LIMIT_COUNT = 5;
const CHAT_RATE_LIMIT_WINDOW_MS = 10_000;

export interface ServerPlayer extends PlayerPublicView {
  tokenHash: string;
}

export interface ServerRoomState {
  code: string;
  phase: GamePhase;
  settings: RoomSettings;
  players: ServerPlayer[];
  round: number;
  attemptInRound: number;
  captainIndex: number;
  consecutiveRejections: number;
  crisisDeck: CrisisCardId[];
  currentCrisisCard: CrisisCardId | null;
  proposedTeamIds: string[];
  phaseEndsAt: number | null;
  roles: Record<string, Role>;
  currentVotes: Record<string, boolean>;
  currentMissionPlays: Record<string, MissionCard>;
  missions: MissionRecord[];
  lastVoteResult: VoteRoundRecord | null;
  voteHistory: VoteRoundRecord[];
  winner: Role | null;
  winReason: 'CREW_MISSIONS' | 'KACAK_MISSIONS' | 'STORM_LIMIT' | null;
  awards: PlayerAward[];
  messages: ChatMessage[];
  kacakMessages: ChatMessage[];
  reports: ReportRecord[];
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  chatPurgeAt: number | null;
}

export class GameError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function sanitizeText(raw: unknown, maxLen: number): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLen);
}

function isValidAvatar(val: unknown): val is AvatarId {
  return typeof val === 'string' && (AVATAR_IDS as string[]).includes(val);
}

export class GameStore {
  private rooms = new Map<string, ServerRoomState>();
  private chatRateLimits = new Map<string, number[]>();
  private onRoomUpdated?: (room: ServerRoomState) => void;
  private onPublicRoomsChanged?: () => void;
  private persistence: PersistenceAdapter;

  constructor(persistence: PersistenceAdapter, onRoomUpdated?: (room: ServerRoomState) => void) {
    this.persistence = persistence;
    this.onRoomUpdated = onRoomUpdated;
  }

  async init(): Promise<void> {
    const loaded = await this.persistence.loadAll();
    for (const [code, raw] of Object.entries(loaded)) {
      if (raw && typeof raw === 'object') {
        const room = raw as ServerRoomState;
        // Mark all players disconnected on server restart so they can reconnect cleanly
        for (const p of room.players) {
          p.isConnected = false;
          p.disconnectedAt = Date.now();
        }
        this.rooms.set(code, room);
      }
    }
  }

  setBroadcaster(cb: (room: ServerRoomState) => void): void {
    this.onRoomUpdated = cb;
  }

  setPublicRoomsBroadcaster(cb: () => void): void {
    this.onPublicRoomsChanged = cb;
  }

  private generateRoomCode(): string {
    for (let attempt = 0; attempt < 20; attempt++) {
      let code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += ROOM_CODE_ALPHABET[crypto.randomInt(0, ROOM_CODE_ALPHABET.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
    throw new GameError('Oda kodu üretilemedi, tekrar deneyin.', 500);
  }

  private async persistAndNotify(room: ServerRoomState): Promise<void> {
    room.updatedAt = Date.now();
    room.expiresAt = Date.now() + ROOM_TTL_MS;
    await this.persistence.saveRoom(room.code, room, room.expiresAt);
    this.onRoomUpdated?.(room);
    this.onPublicRoomsChanged?.();
  }

  listPublicRooms(): PublicRoomSummary[] {
    const now = Date.now();
    const list: PublicRoomSummary[] = [];
    for (const room of this.rooms.values()) {
      if (room.expiresAt <= now) continue;
      if (room.phase !== 'LOBBY') continue;
      if (room.settings.isPublic === false) continue;
      if (room.players.length >= room.settings.maxPlayers) continue;
      if (!room.players.some((p) => p.isConnected)) continue;

      const host = room.players.find((p) => p.isHost) ?? room.players[0];
      if (!host) continue;

      list.push({
        code: room.code,
        hostNickname: host.nickname,
        hostAvatar: host.avatar,
        hostColorIndex: host.colorIndex,
        playerCount: room.players.length,
        maxPlayers: room.settings.maxPlayers,
        turnSeconds: room.settings.turnSeconds,
        voiceEnabled: room.settings.voiceEnabled && isLiveKitConfigured(),
        createdAt: room.createdAt,
      });
    }
    list.sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }

  getRoom(code: string): ServerRoomState | undefined {
    return this.rooms.get(code.toUpperCase().trim());
  }

  authenticatePlayer(code: string, token: string): { room: ServerRoomState; player: ServerPlayer } {
    const room = this.getRoom(code);
    if (!room) {
      throw new GameError('Oda bulunamadı veya süresi doldu.', 404);
    }
    if (!token || typeof token !== 'string') {
      throw new GameError('Geçersiz oturum belirteci.', 401);
    }
    const tokenHash = hashToken(token);
    const player = room.players.find((p) => p.tokenHash === tokenHash);
    if (!player) {
      throw new GameError('Bu odaya ait geçerli bir oyuncu oturumu bulunamadı.', 401);
    }
    return { room, player };
  }

  async createRoom(input: {
    nickname?: string;
    avatar?: AvatarId;
    colorIndex?: number;
    maxPlayers?: number;
    turnSeconds?: number;
    voiceEnabled?: boolean;
    isPublic?: boolean;
  }): Promise<{ code: string; playerId: string; sessionToken: string; state: ClientGameState }> {
    const code = this.generateRoomCode();
    const fallbackIdentity = generateRandomIdentity();
    const nickname = sanitizeText(input.nickname, 24) || fallbackIdentity.nickname;
    const avatar = isValidAvatar(input.avatar) ? input.avatar : fallbackIdentity.avatar;
    const colorIndex =
      typeof input.colorIndex === 'number' && input.colorIndex >= 0 && input.colorIndex < 8
        ? Math.floor(input.colorIndex)
        : fallbackIdentity.colorIndex;

    const maxPlayers = Math.min(
      MAX_PLAYERS,
      Math.max(MIN_PLAYERS, Number(input.maxPlayers) || 8)
    );
    const turnSeconds = Math.min(
      MAX_TURN_SECONDS,
      Math.max(MIN_TURN_SECONDS, Number(input.turnSeconds) || DEFAULT_TURN_SECONDS)
    );
    const voiceEnabled = Boolean(input.voiceEnabled) && isLiveKitConfigured();
    const isPublic = input.isPublic !== false;

    const playerId = crypto.randomUUID();
    const sessionToken = crypto.randomBytes(32).toString('hex');

    const host: ServerPlayer = {
      id: playerId,
      nickname,
      avatar,
      colorIndex,
      seatIndex: 0,
      isHost: true,
      isReady: true,
      isConnected: true,
      disconnectedAt: null,
      hasAckedRole: false,
      hasVoted: false,
      hasPlayedCard: false,
      tokenHash: hashToken(sessionToken),
    };

    const now = Date.now();
    const room: ServerRoomState = {
      code,
      phase: 'LOBBY',
      settings: { maxPlayers, turnSeconds, voiceEnabled, isPublic },
      players: [host],
      round: 0,
      attemptInRound: 1,
      captainIndex: 0,
      consecutiveRejections: 0,
      crisisDeck: buildCrisisDeck(),
      currentCrisisCard: null,
      proposedTeamIds: [],
      phaseEndsAt: null,
      roles: {},
      currentVotes: {},
      currentMissionPlays: {},
      missions: [],
      lastVoteResult: null,
      voteHistory: [],
      winner: null,
      winReason: null,
      awards: [],
      messages: [],
      kacakMessages: [],
      reports: [],
      createdAt: now,
      updatedAt: now,
      expiresAt: now + ROOM_TTL_MS,
      chatPurgeAt: null,
    };

    this.rooms.set(code, room);
    await this.persistAndNotify(room);
    return {
      code,
      playerId,
      sessionToken,
      state: this.buildClientPayload(room, playerId),
    };
  }

  async joinRoom(
    rawCode: string,
    input: {
      nickname?: string;
      avatar?: AvatarId;
      colorIndex?: number;
      reconnectToken?: string;
    }
  ): Promise<{ code: string; playerId: string; sessionToken: string; state: ClientGameState }> {
    const code = sanitizeText(rawCode, 12).toUpperCase();
    const room = this.rooms.get(code);
    if (!room) {
      throw new GameError('Oda bulunamadı veya sefer sona erdi.', 404);
    }

    // Check reconnect token first (works during active game within 2 min grace)
    if (input.reconnectToken && typeof input.reconnectToken === 'string') {
      const tokenHash = hashToken(input.reconnectToken);
      const existing = room.players.find((p) => p.tokenHash === tokenHash);
      if (existing) {
        const now = Date.now();
        if (
          !existing.isConnected &&
          existing.disconnectedAt &&
          now - existing.disconnectedAt > RECONNECT_GRACE_MS
        ) {
          throw new GameError('Yeniden bağlanma süresi (2 dakika) dolmuş.', 403);
        }
        existing.isConnected = true;
        existing.disconnectedAt = null;
        await this.persistAndNotify(room);
        return {
          code,
          playerId: existing.id,
          sessionToken: input.reconnectToken,
          state: this.buildClientPayload(room, existing.id),
        };
      }
    }

    if (room.phase !== 'LOBBY') {
      throw new GameError('Bu sefer zaten başlamış. Yalnızca ayrılan oyuncular geri dönebilir.', 403);
    }

    if (room.players.length >= room.settings.maxPlayers) {
      throw new GameError('Bu oda şu an dolu.', 409);
    }

    const existingNicknames = room.players.map((p) => p.nickname);
    const fallbackIdentity = generateRandomIdentity(existingNicknames);
    let nickname = sanitizeText(input.nickname, 24) || fallbackIdentity.nickname;
    // Prevent duplicate nicknames in same match
    if (existingNicknames.some((n) => n.toLocaleLowerCase('tr') === nickname.toLocaleLowerCase('tr'))) {
      nickname = `${nickname.slice(0, 20)} ${room.players.length + 1}`;
    }

    const avatar = isValidAvatar(input.avatar) ? input.avatar : fallbackIdentity.avatar;
    const colorIndex =
      typeof input.colorIndex === 'number' && input.colorIndex >= 0 && input.colorIndex < 8
        ? Math.floor(input.colorIndex)
        : fallbackIdentity.colorIndex;

    const playerId = crypto.randomUUID();
    const sessionToken = crypto.randomBytes(32).toString('hex');

    const newPlayer: ServerPlayer = {
      id: playerId,
      nickname,
      avatar,
      colorIndex,
      seatIndex: room.players.length,
      isHost: false,
      isReady: false,
      isConnected: true,
      disconnectedAt: null,
      hasAckedRole: false,
      hasVoted: false,
      hasPlayedCard: false,
      tokenHash: hashToken(sessionToken),
    };

    room.players.push(newPlayer);
    await this.persistAndNotify(room);

    return {
      code,
      playerId,
      sessionToken,
      state: this.buildClientPayload(room, playerId),
    };
  }

  async markConnection(code: string, playerId: string, connected: boolean): Promise<void> {
    const room = this.rooms.get(code);
    if (!room) return;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;
    if (player.isConnected === connected) return;
    player.isConnected = connected;
    player.disconnectedAt = connected ? null : Date.now();
    await this.persistAndNotify(room);
  }

  async toggleReady(code: string, playerId: string): Promise<ClientGameState> {
    const room = this.getValidatedRoom(code, 'LOBBY');
    const player = this.getPlayer(room, playerId);
    player.isReady = !player.isReady;
    await this.persistAndNotify(room);
    return this.buildClientPayload(room, playerId);
  }

  async updateSettings(
    code: string,
    playerId: string,
    patch: Partial<RoomSettings>
  ): Promise<ClientGameState> {
    const room = this.getValidatedRoom(code, 'LOBBY');
    const player = this.getPlayer(room, playerId);
    if (!player.isHost) {
      throw new GameError('Yalnızca oda sahibi ayarları değiştirebilir.', 403);
    }

    if (patch.maxPlayers !== undefined) {
      const nextMax = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Number(patch.maxPlayers)));
      if (nextMax < room.players.length) {
        throw new GameError('Oyuncu limiti mevcut katılımcı sayısından az olamaz.', 400);
      }
      room.settings.maxPlayers = nextMax;
    }
    if (patch.turnSeconds !== undefined) {
      room.settings.turnSeconds = Math.min(
        MAX_TURN_SECONDS,
        Math.max(MIN_TURN_SECONDS, Number(patch.turnSeconds))
      );
    }
    if (patch.voiceEnabled !== undefined) {
      room.settings.voiceEnabled = Boolean(patch.voiceEnabled) && isLiveKitConfigured();
    }
    if (patch.isPublic !== undefined) {
      room.settings.isPublic = Boolean(patch.isPublic);
    }

    await this.persistAndNotify(room);
    return this.buildClientPayload(room, playerId);
  }

  async leaveRoom(code: string, playerId: string): Promise<void> {
    const room = this.rooms.get(code.toUpperCase().trim());
    if (!room) return;
    if (room.phase !== 'LOBBY') {
      await this.markConnection(room.code, playerId, false);
      return;
    }

    const idx = room.players.findIndex((p) => p.id === playerId);
    if (idx === -1) return;
    const wasHost = room.players[idx].isHost;
    room.players.splice(idx, 1);

    if (room.players.length === 0) {
      this.rooms.delete(room.code);
      await this.persistence.deleteRoom(room.code);
      this.onPublicRoomsChanged?.();
      return;
    }

    room.players.forEach((p, i) => {
      p.seatIndex = i;
    });
    if (wasHost) {
      room.players[0].isHost = true;
      room.players[0].isReady = true;
    }
    await this.persistAndNotify(room);
  }

  async kickPlayer(code: string, hostId: string, targetPlayerId: string): Promise<ClientGameState> {
    const room = this.getValidatedRoom(code, 'LOBBY');
    const host = this.getPlayer(room, hostId);
    if (!host.isHost) {
      throw new GameError('Yalnızca oda sahibi oyuncu çıkarabilir.', 403);
    }
    if (hostId === targetPlayerId) {
      throw new GameError('Oda sahibi kendini çıkaramaz.', 400);
    }
    const idx = room.players.findIndex((p) => p.id === targetPlayerId);
    if (idx === -1) {
      throw new GameError('Oyuncu bulunamadı.', 404);
    }
    room.players.splice(idx, 1);
    room.players.forEach((p, i) => {
      p.seatIndex = i;
    });
    await this.persistAndNotify(room);
    return this.buildClientPayload(room, hostId);
  }

  async startGame(code: string, hostId: string): Promise<ClientGameState> {
    const room = this.getValidatedRoom(code, 'LOBBY');
    const host = this.getPlayer(room, hostId);
    if (!host.isHost) {
      throw new GameError('Yalnızca oda sahibi seferi başlatabilir.', 403);
    }
    if (room.players.length < MIN_PLAYERS) {
      throw new GameError(`Oyunu başlatmak için en az ${MIN_PLAYERS} oyuncu gerekir.`, 400);
    }
    if (room.players.length > MAX_PLAYERS) {
      throw new GameError(`En fazla ${MAX_PLAYERS} oyuncu katılabilir.`, 400);
    }
    const notReady = room.players.filter((p) => !p.isReady);
    if (notReady.length > 0) {
      throw new GameError('Oyunun başlaması için tüm oyuncuların hazır olması gerekir.', 400);
    }

    const playerIds = room.players.map((p) => p.id);
    room.roles = assignRoles(playerIds, () => crypto.randomInt(0, 1_000_000) / 1_000_000);
    room.phase = 'ROLE_REVEAL';
    room.round = 1;
    room.attemptInRound = 1;
    room.captainIndex = crypto.randomInt(0, room.players.length);
    room.consecutiveRejections = 0;
    room.crisisDeck = buildCrisisDeck(() => crypto.randomInt(0, 1_000_000) / 1_000_000);
    room.currentCrisisCard = pickCrisisCard(1, room.crisisDeck);
    room.proposedTeamIds = [];
    room.currentVotes = {};
    room.currentMissionPlays = {};
    room.missions = [];
    room.lastVoteResult = null;
    room.voteHistory = [];
    room.winner = null;
    room.winReason = null;
    room.awards = [];
    room.chatPurgeAt = null;
    room.phaseEndsAt = Date.now() + 25_000;
    room.players.forEach((p) => {
      p.hasAckedRole = false;
      p.hasVoted = false;
      p.hasPlayedCard = false;
    });

    await this.persistAndNotify(room);
    return this.buildClientPayload(room, hostId);
  }

  async acknowledgeRole(code: string, playerId: string): Promise<ClientGameState> {
    const room = this.getValidatedRoom(code, 'ROLE_REVEAL');
    const player = this.getPlayer(room, playerId);
    player.hasAckedRole = true;

    if (room.players.every((p) => p.hasAckedRole)) {
      this.enterTeamProposal(room);
    }

    await this.persistAndNotify(room);
    return this.buildClientPayload(room, playerId);
  }

  private enterTeamProposal(room: ServerRoomState): void {
    room.phase = 'TEAM_PROPOSAL';
    room.proposedTeamIds = [];
    room.currentVotes = {};
    room.currentMissionPlays = {};
    room.players.forEach((p) => {
      p.hasVoted = false;
      p.hasPlayedCard = false;
    });
    room.currentCrisisCard = pickCrisisCard(room.round, room.crisisDeck);
    room.phaseEndsAt = Date.now() + room.settings.turnSeconds * 1000;
  }

  async proposeTeam(code: string, captainId: string, teamIds: unknown): Promise<ClientGameState> {
    const room = this.getValidatedRoom(code, 'TEAM_PROPOSAL');
    const captain = room.players[room.captainIndex];
    if (!captain || captain.id !== captainId) {
      throw new GameError('Yalnızca aktif kaptan görev ekibi önerebilir.', 403);
    }
    if (!Array.isArray(teamIds)) {
      throw new GameError('Geçersiz ekip seçimi.', 400);
    }

    const requiredSize = getTeamSize(room.players.length, room.round);
    const uniqueIds = Array.from(new Set(teamIds.filter((x): x is string => typeof x === 'string')));
    const validIdSet = new Set(room.players.map((p) => p.id));
    if (uniqueIds.length !== requiredSize || uniqueIds.some((id) => !validIdSet.has(id))) {
      throw new GameError(`Bu tur için tam olarak ${requiredSize} farklı oyuncu seçmelisiniz.`, 400);
    }

    room.proposedTeamIds = uniqueIds;
    room.phase = 'TEAM_VOTE';
    room.currentVotes = {};
    room.players.forEach((p) => {
      p.hasVoted = false;
    });
    room.phaseEndsAt = Date.now() + room.settings.turnSeconds * 1000;

    await this.persistAndNotify(room);
    return this.buildClientPayload(room, captainId);
  }

  async voteTeam(code: string, playerId: string, accept: unknown): Promise<ClientGameState> {
    const room = this.getValidatedRoom(code, 'TEAM_VOTE');
    const player = this.getPlayer(room, playerId);
    if (typeof accept !== 'boolean') {
      throw new GameError('Geçersiz oy seçimi.', 400);
    }
    if (player.hasVoted || playerId in room.currentVotes) {
      throw new GameError('Bu oylamada zaten oy kullandınız.', 409);
    }

    room.currentVotes[playerId] = accept;
    player.hasVoted = true;

    if (Object.keys(room.currentVotes).length >= room.players.length) {
      this.resolveTeamVote(room);
    }

    await this.persistAndNotify(room);
    return this.buildClientPayload(room, playerId);
  }

  private resolveTeamVote(room: ServerRoomState): void {
    // Fill missing votes (e.g., on timeout) as false (reject)
    for (const p of room.players) {
      if (!(p.id in room.currentVotes)) {
        room.currentVotes[p.id] = false;
      }
    }

    const evaluation = evaluateTeamVote(room.currentVotes, room.players.length);
    const captain = room.players[room.captainIndex];
    const voteRecord: VoteRoundRecord = {
      round: room.round,
      attempt: room.attemptInRound,
      captainId: captain.id,
      proposedTeamIds: [...room.proposedTeamIds],
      votes: { ...room.currentVotes },
      approved: evaluation.approved,
    };
    room.lastVoteResult = voteRecord;
    room.voteHistory.push(voteRecord);

    if (evaluation.approved) {
      room.consecutiveRejections = 0;
      room.phase = 'MISSION_EXECUTION';
      room.currentMissionPlays = {};
      room.players.forEach((p) => {
        p.hasPlayedCard = false;
      });
      room.phaseEndsAt = Date.now() + room.settings.turnSeconds * 1000;
      return;
    }

    // Rejected
    const nextRejections = room.consecutiveRejections + 1;
    const storm = applyStormRule(nextRejections, room.captainIndex, room.players.length);
    room.captainIndex = storm.nextCaptainIndex;
    room.consecutiveRejections = storm.nextRejections;

    if (storm.stormTriggered) {
      const crisisCard = room.currentCrisisCard ?? pickCrisisCard(room.round, room.crisisDeck);
      const teamSize = getTeamSize(room.players.length, room.round);
      room.missions.push({
        round: room.round,
        teamSize,
        teamIds: [...room.proposedTeamIds],
        crisisCard,
        outcome: 'STORM',
        sabotageCount: null,
        yardimCount: null,
        captainId: captain.id,
      });

      const winCheck = checkWinCondition(room.missions);
      if (winCheck.winner) {
        this.finishGame(room, winCheck.winner, winCheck.reason!);
        return;
      }

      room.phase = 'MISSION_RESULT';
      room.phaseEndsAt = Date.now() + 12_000;
      return;
    }

    room.attemptInRound += 1;
    room.phase = 'TEAM_PROPOSAL';
    room.proposedTeamIds = [];
    room.currentVotes = {};
    room.players.forEach((p) => {
      p.hasVoted = false;
    });
    room.phaseEndsAt = Date.now() + room.settings.turnSeconds * 1000;
  }

  async playMissionCard(code: string, playerId: string, card: unknown): Promise<ClientGameState> {
    const room = this.getValidatedRoom(code, 'MISSION_EXECUTION');
    const player = this.getPlayer(room, playerId);
    if (!room.proposedTeamIds.includes(playerId)) {
      throw new GameError('Bu görev ekibinde yer almıyorsunuz.', 403);
    }
    if (card !== 'YARDIM' && card !== 'SABOTAJ') {
      throw new GameError('Geçersiz görev kartı.', 400);
    }
    const role = room.roles[playerId];
    if (role !== 'KACAK' && card === 'SABOTAJ') {
      throw new GameError('Mürettebat üyeleri yalnızca "Yardım Et" kartı oynayabilir.', 403);
    }
    if (player.hasPlayedCard || playerId in room.currentMissionPlays) {
      throw new GameError('Bu görevde kartınızı zaten oynadınız.', 409);
    }

    room.currentMissionPlays[playerId] = card;
    player.hasPlayedCard = true;

    if (Object.keys(room.currentMissionPlays).length >= room.proposedTeamIds.length) {
      this.resolveMission(room);
    }

    await this.persistAndNotify(room);
    return this.buildClientPayload(room, playerId);
  }

  private resolveMission(room: ServerRoomState): void {
    // Default Yardım if a team member timed out
    for (const id of room.proposedTeamIds) {
      if (!(id in room.currentMissionPlays)) {
        room.currentMissionPlays[id] = 'YARDIM';
      }
    }

    const cards = room.proposedTeamIds.map((id) => room.currentMissionPlays[id]);
    const crisisCard = room.currentCrisisCard ?? pickCrisisCard(room.round, room.crisisDeck);
    const result = evaluateMissionOutcome(cards, crisisCard);
    const captain = room.players[room.captainIndex];

    room.missions.push({
      round: room.round,
      teamSize: room.proposedTeamIds.length,
      teamIds: [...room.proposedTeamIds],
      crisisCard,
      outcome: result.outcome,
      sabotageCount: result.visibleSabotageCount,
      yardimCount: result.visibleYardimCount,
      captainId: captain.id,
    });

    const winCheck = checkWinCondition(room.missions);
    if (winCheck.winner) {
      this.finishGame(room, winCheck.winner, winCheck.reason!);
      return;
    }

    room.phase = 'MISSION_RESULT';
    room.phaseEndsAt = Date.now() + 12_000;
  }

  async advanceFromResult(code: string, playerId: string): Promise<ClientGameState> {
    const room = this.getValidatedRoom(code, 'MISSION_RESULT');
    this.getPlayer(room, playerId);
    const lastMission = room.missions[room.missions.length - 1];
    const wasStorm = lastMission?.outcome === 'STORM';

    room.round += 1;
    room.attemptInRound = 1;
    if (!wasStorm) {
      room.captainIndex = (room.captainIndex + 1) % room.players.length;
    }
    this.enterTeamProposal(room);

    await this.persistAndNotify(room);
    return this.buildClientPayload(room, playerId);
  }

  private finishGame(
    room: ServerRoomState,
    winner: Role,
    reason: 'CREW_MISSIONS' | 'KACAK_MISSIONS' | 'STORM_LIMIT'
  ): void {
    room.phase = 'GAME_OVER';
    room.winner = winner;
    room.winReason = reason;
    room.phaseEndsAt = null;
    room.awards = computeAwards({
      players: room.players,
      roles: room.roles,
      missions: room.missions,
      voteHistory: room.voteHistory,
    });
    // Schedule chat minimization cleanup shortly after game over
    room.chatPurgeAt = Date.now() + POST_GAME_CHAT_CLEANUP_MS;
  }

  async playAgain(code: string, playerId: string): Promise<ClientGameState> {
    const room = this.getValidatedRoom(code, 'GAME_OVER');
    const player = this.getPlayer(room, playerId);
    if (!player.isHost) {
      throw new GameError('Yalnızca oda sahibi aynı ekiple yeni maç başlatabilir.', 403);
    }

    // Clear previous match chat & temporary secret state immediately
    room.phase = 'LOBBY';
    room.round = 0;
    room.attemptInRound = 1;
    room.consecutiveRejections = 0;
    room.currentCrisisCard = null;
    room.proposedTeamIds = [];
    room.phaseEndsAt = null;
    room.roles = {};
    room.currentVotes = {};
    room.currentMissionPlays = {};
    room.missions = [];
    room.lastVoteResult = null;
    room.voteHistory = [];
    room.winner = null;
    room.winReason = null;
    room.awards = [];
    room.messages = [];
    room.kacakMessages = [];
    room.chatPurgeAt = null;
    room.players.forEach((p) => {
      p.isReady = p.isHost;
      p.hasAckedRole = false;
      p.hasVoted = false;
      p.hasPlayedCard = false;
    });

    await this.persistAndNotify(room);
    return this.buildClientPayload(room, playerId);
  }

  async sendChat(
    code: string,
    playerId: string,
    input: { text: unknown; channel?: unknown; isQuickReaction?: unknown }
  ): Promise<ClientGameState> {
    const room = this.rooms.get(code.toUpperCase().trim());
    if (!room) throw new GameError('Oda bulunamadı.', 404);
    const player = this.getPlayer(room, playerId);

    const channel = input.channel === 'KACAK' ? 'KACAK' : 'PUBLIC';
    if (channel === 'KACAK') {
      if (room.roles[playerId] !== 'KACAK') {
        throw new GameError('Kaçak telsizine yalnızca Kaçaklar erişebilir.', 403);
      }
      const kacakCount = Object.values(room.roles).filter((r) => r === 'KACAK').length;
      if (kacakCount < 2) {
        throw new GameError('Kaçak telsizi yalnızca 2 Kaçak olduğunda kullanılabilir.', 400);
      }
    }

    if (
      channel === 'PUBLIC' &&
      isPlayerMutedByRadioCrisis(room.currentCrisisCard, room.phase, room.proposedTeamIds, playerId)
    ) {
      throw new GameError('Bozuk Telsiz krizi nedeniyle görev bitene kadar ortak sohbete yazamazsın.', 403);
    }

    const text = sanitizeText(input.text, MAX_CHAT_LENGTH);
    if (!text) {
      throw new GameError('Boş mesaj gönderilemez.', 400);
    }

    // Rate limiting
    const now = Date.now();
    const rateKey = `${code}:${playerId}`;
    const timestamps = (this.chatRateLimits.get(rateKey) ?? []).filter(
      (t) => now - t < CHAT_RATE_LIMIT_WINDOW_MS
    );
    if (timestamps.length >= CHAT_RATE_LIMIT_COUNT) {
      throw new GameError('Çok hızlı mesaj gönderiyorsunuz. Birkaç saniye bekleyin.', 429);
    }
    timestamps.push(now);
    this.chatRateLimits.set(rateKey, timestamps);

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      channel,
      senderId: player.id,
      senderNickname: player.nickname,
      senderAvatar: player.avatar,
      senderColorIndex: player.colorIndex,
      text,
      createdAt: now,
      isQuickReaction: Boolean(input.isQuickReaction),
    };

    if (channel === 'KACAK') {
      room.kacakMessages.push(msg);
      if (room.kacakMessages.length > 80) room.kacakMessages.shift();
    } else {
      room.messages.push(msg);
      if (room.messages.length > 120) room.messages.shift();
    }

    await this.persistAndNotify(room);
    return this.buildClientPayload(room, playerId);
  }

  async reportPlayer(
    code: string,
    reporterId: string,
    targetPlayerId: unknown,
    reason: unknown
  ): Promise<void> {
    const room = this.rooms.get(code.toUpperCase().trim());
    if (!room) throw new GameError('Oda bulunamadı.', 404);
    this.getPlayer(room, reporterId);
    if (typeof targetPlayerId !== 'string' || !room.players.some((p) => p.id === targetPlayerId)) {
      throw new GameError('Şikâyet edilecek oyuncu bulunamadı.', 404);
    }
    if (reporterId === targetPlayerId) {
      throw new GameError('Kendinizi şikâyet edemezsiniz.', 400);
    }

    const cleanReason = sanitizeText(reason, 180) || 'Rahatsız edici davranış';
    room.reports.push({
      id: crypto.randomUUID(),
      targetPlayerId,
      reporterPlayerId: reporterId,
      reason: cleanReason,
      createdAt: Date.now(),
    });
    await this.persistAndNotify(room);
  }

  /**
   * Advances phase timers & purges expired chat/rooms.
   */
  async tick(): Promise<void> {
    const now = Date.now();
    for (const [code, room] of this.rooms.entries()) {
      if (room.expiresAt <= now) {
        this.rooms.delete(code);
        await this.persistence.deleteRoom(code);
        continue;
      }

      let changed = false;

      if (room.chatPurgeAt && now >= room.chatPurgeAt) {
        if (room.messages.length > 0 || room.kacakMessages.length > 0) {
          room.messages = [];
          room.kacakMessages = [];
          changed = true;
        }
        room.chatPurgeAt = null;
      }

      if (room.phaseEndsAt && now >= room.phaseEndsAt) {
        if (room.phase === 'ROLE_REVEAL') {
          room.players.forEach((p) => {
            p.hasAckedRole = true;
          });
          this.enterTeamProposal(room);
          changed = true;
        } else if (room.phase === 'TEAM_PROPOSAL') {
          // Auto-select valid team if captain timed out so game never stalls
          const size = getTeamSize(room.players.length, room.round);
          room.proposedTeamIds = room.players.slice(0, size).map((p) => p.id);
          room.phase = 'TEAM_VOTE';
          room.currentVotes = {};
          room.players.forEach((p) => {
            p.hasVoted = false;
          });
          room.phaseEndsAt = now + room.settings.turnSeconds * 1000;
          changed = true;
        } else if (room.phase === 'TEAM_VOTE') {
          this.resolveTeamVote(room);
          changed = true;
        } else if (room.phase === 'MISSION_EXECUTION') {
          this.resolveMission(room);
          changed = true;
        } else if (room.phase === 'MISSION_RESULT') {
          const lastMission = room.missions[room.missions.length - 1];
          const wasStorm = lastMission?.outcome === 'STORM';
          room.round += 1;
          room.attemptInRound = 1;
          if (!wasStorm) {
            room.captainIndex = (room.captainIndex + 1) % room.players.length;
          }
          this.enterTeamProposal(room);
          changed = true;
        }
      }

      if (changed) {
        await this.persistAndNotify(room);
      }
    }

    await this.persistence.cleanupExpired(now);
  }

  /**
   * Projects server state for a specific authenticated player.
   * Secret roles, other players' votes (before reveal), and secret mission plays NEVER leak.
   */
  buildClientPayload(room: ServerRoomState, requestingPlayerId: string): ClientGameState {
    const myRole = room.roles[requestingPlayerId] ?? null;
    const partnerIds =
      myRole === 'KACAK'
        ? Object.entries(room.roles)
            .filter(([id, role]) => role === 'KACAK' && id !== requestingPlayerId)
            .map(([id]) => id)
        : [];

    const publicPlayers: PlayerPublicView[] = room.players.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      colorIndex: p.colorIndex,
      seatIndex: p.seatIndex,
      isHost: p.isHost,
      isReady: p.isReady,
      isConnected: p.isConnected,
      disconnectedAt: p.disconnectedAt,
      hasAckedRole: p.hasAckedRole,
      hasVoted: p.hasVoted,
      hasPlayedCard: p.hasPlayedCard,
    }));

    return {
      code: room.code,
      phase: room.phase,
      settings: { ...room.settings },
      players: publicPlayers,
      round: room.round,
      captainIndex: room.captainIndex,
      consecutiveRejections: room.consecutiveRejections,
      currentCrisisCard: room.currentCrisisCard,
      proposedTeamIds: [...room.proposedTeamIds],
      phaseEndsAt: room.phaseEndsAt,
      missions: room.missions.map((m) => ({ ...m, teamIds: [...m.teamIds] })),
      lastVoteResult: room.lastVoteResult
        ? {
            ...room.lastVoteResult,
            proposedTeamIds: [...room.lastVoteResult.proposedTeamIds],
            votes: { ...room.lastVoteResult.votes },
          }
        : null,
      voteHistory: room.voteHistory.map((v) => ({
        ...v,
        proposedTeamIds: [...v.proposedTeamIds],
        votes: { ...v.votes },
      })),
      winner: room.winner,
      winReason: room.winReason,
      awards: room.awards,
      me: {
        id: requestingPlayerId,
        role: myRole,
        partnerIds,
        myVote:
          requestingPlayerId in room.currentVotes ? room.currentVotes[requestingPlayerId] : null,
        myPlayedCard:
          requestingPlayerId in room.currentMissionPlays
            ? room.currentMissionPlays[requestingPlayerId]
            : null,
        isChatLockedByCrisis: isPlayerMutedByRadioCrisis(
          room.currentCrisisCard,
          room.phase,
          room.proposedTeamIds,
          requestingPlayerId
        ),
      },
      revealedRoles: room.phase === 'GAME_OVER' ? { ...room.roles } : null,
      messages: [...room.messages],
      kacakMessages: myRole === 'KACAK' ? [...room.kacakMessages] : [],
      livekitAvailable: isLiveKitConfigured(),
    };
  }

  private getValidatedRoom(code: string, expectedPhase: GamePhase): ServerRoomState {
    const room = this.rooms.get(code.toUpperCase().trim());
    if (!room) {
      throw new GameError('Oda bulunamadı.', 404);
    }
    if (room.phase !== expectedPhase) {
      throw new GameError('Bu işlem oyunun mevcut aşamasında yapılamaz.', 409);
    }
    return room;
  }

  private getPlayer(room: ServerRoomState, playerId: string): ServerPlayer {
    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      throw new GameError('Oyuncu bu odada değil.', 404);
    }
    return player;
  }
}
