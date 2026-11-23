import type {
  CrisisCardId,
  MissionCard,
  MissionRecord,
  PlayerAward,
  PlayerPublicView,
  Role,
  VoteRoundRecord,
} from './types';

export const MIN_PLAYERS = 6;
export const MAX_PLAYERS = 10;
export const MAX_ROUNDS = 5;
export const MAX_CONSECUTIVE_REJECTIONS = 3;
export const RECONNECT_GRACE_MS = 2 * 60 * 1000; // 2 minutes
export const DEFAULT_TURN_SECONDS = 60;
export const MIN_TURN_SECONDS = 30;
export const MAX_TURN_SECONDS = 90;

export const CRISIS_CARDS: CrisisCardId[] = ['YOGUN_SIS', 'BOZUK_TELSIZ', 'ACIL_ONARIM'];

export function getKacakCount(playerCount: number): number {
  if (playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    throw new Error(`Oyuncu sayısı ${MIN_PLAYERS} ile ${MAX_PLAYERS} arasında olmalıdır.`);
  }
  return playerCount <= 7 ? 1 : 2;
}

export function getTeamSize(playerCount: number, round: number): number {
  if (playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    throw new Error(`Geçersiz oyuncu sayısı: ${playerCount}`);
  }
  if (round < 1 || round > MAX_ROUNDS) {
    throw new Error(`Geçersiz tur numarası: ${round}`);
  }
  const smallTable = [2, 3, 3, 4, 4];
  const largeTable = [3, 3, 4, 4, 5];
  return playerCount <= 7 ? smallTable[round - 1] : largeTable[round - 1];
}

export function assignRoles(
  playerIds: string[],
  rng: () => number = Math.random
): Record<string, Role> {
  const kacakCount = getKacakCount(playerIds.length);
  const shuffled = [...playerIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const kacakSet = new Set(shuffled.slice(0, kacakCount));
  const roles: Record<string, Role> = {};
  for (const id of playerIds) {
    roles[id] = kacakSet.has(id) ? 'KACAK' : 'MURETTEBAT';
  }
  return roles;
}

export function evaluateTeamVote(
  votes: Record<string, boolean>,
  totalPlayers: number
): { approved: boolean; acceptCount: number; rejectCount: number } {
  let acceptCount = 0;
  let rejectCount = 0;
  for (const accepted of Object.values(votes)) {
    if (accepted) acceptCount++;
    else rejectCount++;
  }
  // Strict majority (> half of total active players) approves
  const approved = acceptCount > totalPlayers / 2;
  return { approved, acceptCount, rejectCount };
}

export function evaluateMissionOutcome(
  cards: MissionCard[],
  crisisCard: CrisisCardId
): {
  outcome: 'SUCCESS' | 'FAIL';
  visibleSabotageCount: number | null;
  visibleYardimCount: number | null;
  actualSabotageCount: number;
  actualYardimCount: number;
} {
  let actualSabotageCount = 0;
  let actualYardimCount = 0;
  for (const card of cards) {
    if (card === 'SABOTAJ') actualSabotageCount++;
    else actualYardimCount++;
  }

  // Acil Onarım explicitly requires every team member to play Yardım (same mathematical condition: 0 Sabotaj)
  const failed =
    crisisCard === 'ACIL_ONARIM'
      ? actualYardimCount !== cards.length || actualSabotageCount > 0
      : actualSabotageCount >= 1;

  const outcome = failed ? 'FAIL' : 'SUCCESS';

  if (outcome === 'FAIL' && crisisCard === 'YOGUN_SIS') {
    return {
      outcome,
      visibleSabotageCount: null,
      visibleYardimCount: null,
      actualSabotageCount,
      actualYardimCount,
    };
  }

  return {
    outcome,
    visibleSabotageCount: actualSabotageCount,
    visibleYardimCount: actualYardimCount,
    actualSabotageCount,
    actualYardimCount,
  };
}

export function applyStormRule(
  consecutiveRejections: number,
  currentCaptainIndex: number,
  playerCount: number
): {
  stormTriggered: boolean;
  nextRejections: number;
  nextCaptainIndex: number;
} {
  const nextCaptainIndex = (currentCaptainIndex + 1) % playerCount;
  if (consecutiveRejections >= MAX_CONSECUTIVE_REJECTIONS) {
    return {
      stormTriggered: true,
      nextRejections: 0,
      nextCaptainIndex,
    };
  }
  return {
    stormTriggered: false,
    nextRejections: consecutiveRejections,
    nextCaptainIndex,
  };
}

export function checkWinCondition(missions: MissionRecord[]): {
  winner: Role | null;
  reason: 'CREW_MISSIONS' | 'KACAK_MISSIONS' | 'STORM_LIMIT' | null;
} {
  let successCount = 0;
  let failCount = 0;
  let lastFailWasStorm = false;

  for (const mission of missions) {
    if (mission.outcome === 'SUCCESS') {
      successCount++;
    } else {
      failCount++;
      lastFailWasStorm = mission.outcome === 'STORM';
    }
  }

  if (successCount >= 3) {
    return { winner: 'MURETTEBAT', reason: 'CREW_MISSIONS' };
  }
  if (failCount >= 3) {
    return {
      winner: 'KACAK',
      reason: lastFailWasStorm ? 'STORM_LIMIT' : 'KACAK_MISSIONS',
    };
  }
  return { winner: null, reason: null };
}

export function pickCrisisCard(round: number, deckSeed?: CrisisCardId[]): CrisisCardId {
  if (deckSeed && deckSeed.length > 0) {
    return deckSeed[(round - 1) % deckSeed.length];
  }
  return CRISIS_CARDS[(round - 1) % CRISIS_CARDS.length];
}

export function buildCrisisDeck(rng: () => number = Math.random): CrisisCardId[] {
  const pool: CrisisCardId[] = [
    'YOGUN_SIS',
    'BOZUK_TELSIZ',
    'ACIL_ONARIM',
    'YOGUN_SIS',
    'BOZUK_TELSIZ',
  ];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

export function isPlayerMutedByRadioCrisis(
  crisisCard: CrisisCardId | null,
  phase: string,
  proposedTeamIds: string[],
  playerId: string
): boolean {
  if (crisisCard !== 'BOZUK_TELSIZ') return false;
  if (phase !== 'MISSION_EXECUTION') return false;
  return proposedTeamIds.includes(playerId);
}

export function computeAwards(params: {
  players: PlayerPublicView[];
  roles: Record<string, Role>;
  missions: MissionRecord[];
  voteHistory: VoteRoundRecord[];
}): PlayerAward[] {
  const { players, roles, missions, voteHistory } = params;
  if (players.length === 0) return [];

  const awards: PlayerAward[] = [];
  const playerMap = new Map(players.map((p) => [p.id, p]));

  // 1. En İyi Blöfçü (Kaçak who got onto the most teams)
  const kacakPlayers = players.filter((p) => roles[p.id] === 'KACAK');
  if (kacakPlayers.length > 0) {
    let bestBluffer = kacakPlayers[0];
    let maxInfiltrations = -1;
    for (const kp of kacakPlayers) {
      const count = missions.filter((m) => m.teamIds.includes(kp.id)).length;
      if (count > maxInfiltrations) {
        maxInfiltrations = count;
        bestBluffer = kp;
      }
    }
    awards.push({
      id: 'BEST_BLUFF',
      titleKey: 'BEST_BLUFF',
      descriptionKey: 'BEST_BLUFF',
      playerId: bestBluffer.id,
      playerNickname: bestBluffer.nickname,
      playerAvatar: bestBluffer.avatar,
      playerColorIndex: bestBluffer.colorIndex,
    });
  }

  // 2. En Şüpheli Kaptan (Captain with most rejected proposals)
  const rejectedByCaptain = new Map<string, number>();
  for (const v of voteHistory) {
    if (!v.approved) {
      rejectedByCaptain.set(v.captainId, (rejectedByCaptain.get(v.captainId) ?? 0) + 1);
    }
  }
  if (rejectedByCaptain.size > 0) {
    let topId = '';
    let topCount = -1;
    for (const [cid, count] of rejectedByCaptain.entries()) {
      if (count > topCount && playerMap.has(cid)) {
        topCount = count;
        topId = cid;
      }
    }
    const p = playerMap.get(topId);
    if (p) {
      awards.push({
        id: 'SUSPICIOUS_CAPTAIN',
        titleKey: 'SUSPICIOUS_CAPTAIN',
        descriptionKey: 'SUSPICIOUS_CAPTAIN',
        playerId: p.id,
        playerNickname: p.nickname,
        playerAvatar: p.avatar,
        playerColorIndex: p.colorIndex,
      });
    }
  }

  // 3. Yanlış Kişiyi Suçlayan (Crew member who rejected most approved clean teams)
  const crewPlayers = players.filter((p) => roles[p.id] === 'MURETTEBAT');
  if (crewPlayers.length > 0) {
    let topAccuser = crewPlayers[0];
    let maxRejects = -1;
    for (const cp of crewPlayers) {
      let rejects = 0;
      for (const v of voteHistory) {
        if (v.votes[cp.id] === false) {
          const hadKacak = v.proposedTeamIds.some((tid) => roles[tid] === 'KACAK');
          if (!hadKacak) rejects++;
        }
      }
      if (rejects > maxRejects) {
        maxRejects = rejects;
        topAccuser = cp;
      }
    }
    if (maxRejects > 0) {
      awards.push({
        id: 'WRONG_ACCUSER',
        titleKey: 'WRONG_ACCUSER',
        descriptionKey: 'WRONG_ACCUSER',
        playerId: topAccuser.id,
        playerNickname: topAccuser.nickname,
        playerAvatar: topAccuser.avatar,
        playerColorIndex: topAccuser.colorIndex,
      });
    }
  }

  // 4. Güvenilir Tayfa (Crew member in most successful missions)
  if (crewPlayers.length > 0) {
    let loyal = crewPlayers[0];
    let maxSuccess = -1;
    for (const cp of crewPlayers) {
      const count = missions.filter(
        (m) => m.outcome === 'SUCCESS' && m.teamIds.includes(cp.id)
      ).length;
      if (count > maxSuccess) {
        maxSuccess = count;
        loyal = cp;
      }
    }
    awards.push({
      id: 'LOYAL_SAILOR',
      titleKey: 'LOYAL_SAILOR',
      descriptionKey: 'LOYAL_SAILOR',
      playerId: loyal.id,
      playerNickname: loyal.nickname,
      playerAvatar: loyal.avatar,
      playerColorIndex: loyal.colorIndex,
    });
  }

  return awards;
}
