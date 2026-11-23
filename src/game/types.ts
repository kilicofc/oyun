export type Role = 'MURETTEBAT' | 'KACAK';

export type GamePhase =
  | 'LOBBY'
  | 'ROLE_REVEAL'
  | 'TEAM_PROPOSAL'
  | 'TEAM_VOTE'
  | 'MISSION_EXECUTION'
  | 'MISSION_RESULT'
  | 'GAME_OVER';

export type CrisisCardId = 'YOGUN_SIS' | 'BOZUK_TELSIZ' | 'ACIL_ONARIM';

export type MissionCard = 'YARDIM' | 'SABOTAJ';

export type AvatarId =
  | 'marti'
  | 'pusula'
  | 'fener'
  | 'capa'
  | 'dumen'
  | 'halat'
  | 'dalga'
  | 'samandira'
  | 'durbun'
  | 'cankurtaran';

export interface PlayerPublicView {
  id: string;
  nickname: string;
  avatar: AvatarId;
  colorIndex: number;
  seatIndex: number;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
  disconnectedAt: number | null;
  hasAckedRole: boolean;
  hasVoted: boolean;
  hasPlayedCard: boolean;
}

export interface MissionRecord {
  round: number;
  teamSize: number;
  teamIds: string[];
  crisisCard: CrisisCardId;
  outcome: 'SUCCESS' | 'FAIL' | 'STORM';
  sabotageCount: number | null; // null if masked by Yoğun Sis or Storm
  yardimCount: number | null;
  captainId: string;
}

export interface VoteRoundRecord {
  round: number;
  attempt: number;
  captainId: string;
  proposedTeamIds: string[];
  votes: Record<string, boolean>; // playerId -> accept
  approved: boolean;
}

export interface ChatMessage {
  id: string;
  channel: 'PUBLIC' | 'KACAK';
  senderId: string;
  senderNickname: string;
  senderAvatar: AvatarId;
  senderColorIndex: number;
  text: string;
  createdAt: number;
  isQuickReaction?: boolean;
}

export interface PlayerAward {
  id: string;
  titleKey: string;
  descriptionKey: string;
  playerId: string;
  playerNickname: string;
  playerAvatar: AvatarId;
  playerColorIndex: number;
}

export interface RoomSettings {
  maxPlayers: number; // 6..10
  turnSeconds: number; // 30..90
  voiceEnabled: boolean;
  isPublic?: boolean;
}

export interface PublicRoomSummary {
  code: string;
  hostNickname: string;
  hostAvatar: AvatarId;
  hostColorIndex: number;
  playerCount: number;
  maxPlayers: number;
  turnSeconds: number;
  voiceEnabled: boolean;
  createdAt: number;
}

export interface ClientGameState {
  code: string;
  phase: GamePhase;
  settings: RoomSettings;
  players: PlayerPublicView[];
  round: number; // 1..5
  captainIndex: number;
  consecutiveRejections: number; // 0..2 (3 triggers storm)
  currentCrisisCard: CrisisCardId | null;
  proposedTeamIds: string[];
  phaseEndsAt: number | null;
  missions: MissionRecord[];
  lastVoteResult: VoteRoundRecord | null;
  voteHistory: VoteRoundRecord[];
  winner: Role | null;
  winReason: 'CREW_MISSIONS' | 'KACAK_MISSIONS' | 'STORM_LIMIT' | null;
  awards: PlayerAward[];
  // Strictly scoped to the requesting player:
  me: {
    id: string;
    role: Role | null;
    partnerIds: string[]; // only populated if KACAK
    myVote: boolean | null;
    myPlayedCard: MissionCard | null;
    isChatLockedByCrisis: boolean;
  };
  // Only populated when phase === 'GAME_OVER':
  revealedRoles: Record<string, Role> | null;
  messages: ChatMessage[];
  kacakMessages: ChatMessage[];
  livekitAvailable: boolean;
}

export interface ReportRecord {
  id: string;
  targetPlayerId: string;
  reporterPlayerId: string;
  reason: string;
  createdAt: number;
}
