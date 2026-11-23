import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProfile, evaluateMatchAchievements } from './achievements';
import type { ClientGameState } from './types';

function makeFinishedState(overrides: Partial<ClientGameState> = {}): ClientGameState {
  return {
    code: 'F7K9M2A',
    phase: 'GAME_OVER',
    settings: { maxPlayers: 6, turnSeconds: 60, voiceEnabled: false },
    players: [
      {
        id: 'p1',
        nickname: 'Sisli Martı',
        avatar: 'marti',
        colorIndex: 0,
        seatIndex: 0,
        isHost: true,
        isReady: true,
        isConnected: true,
        disconnectedAt: null,
        hasAckedRole: true,
        hasVoted: false,
        hasPlayedCard: false,
      },
    ],
    round: 3,
    captainIndex: 0,
    consecutiveRejections: 0,
    currentCrisisCard: 'YOGUN_SIS',
    proposedTeamIds: [],
    phaseEndsAt: null,
    missions: [
      {
        round: 1,
        teamSize: 2,
        teamIds: ['p1', 'p2'],
        crisisCard: 'YOGUN_SIS',
        outcome: 'SUCCESS',
        sabotageCount: 0,
        yardimCount: 2,
        captainId: 'p1',
      },
      {
        round: 2,
        teamSize: 3,
        teamIds: ['p1', 'p2', 'p3'],
        crisisCard: 'ACIL_ONARIM',
        outcome: 'SUCCESS',
        sabotageCount: 0,
        yardimCount: 3,
        captainId: 'p2',
      },
      {
        round: 3,
        teamSize: 3,
        teamIds: ['p2', 'p3', 'p4'],
        crisisCard: 'BOZUK_TELSIZ',
        outcome: 'SUCCESS',
        sabotageCount: 0,
        yardimCount: 3,
        captainId: 'p3',
      },
    ],
    lastVoteResult: null,
    voteHistory: [],
    winner: 'MURETTEBAT',
    winReason: 'CREW_MISSIONS',
    awards: [
      {
        id: 'LOYAL_SAILOR',
        titleKey: 'LOYAL_SAILOR',
        descriptionKey: 'LOYAL_SAILOR',
        playerId: 'p1',
        playerNickname: 'Sisli Martı',
        playerAvatar: 'marti',
        playerColorIndex: 0,
      },
    ],
    me: {
      id: 'p1',
      role: 'MURETTEBAT',
      partnerIds: [],
      myVote: null,
      myPlayedCard: null,
      isChatLockedByCrisis: false,
    },
    revealedRoles: { p1: 'MURETTEBAT' },
    messages: [],
    kacakMessages: [],
    livekitAvailable: false,
    ...overrides,
  };
}

test('evaluateMatchAchievements unlocks Crew victory, clean sweep, captain, and award badges', () => {
  const initial = createEmptyProfile();
  const state = makeFinishedState();
  const { nextProfile, newlyUnlocked } = evaluateMatchAchievements(state, initial, 1000);

  assert.equal(nextProfile.gamesPlayed, 1);
  assert.equal(nextProfile.wins, 1);
  assert.equal(nextProfile.crewWins, 1);
  assert.ok('FIRTINAYA_MEYDAN_OKUYAN' in nextProfile.unlocked);
  assert.ok('MURETTEBATIN_KURTARICISI' in nextProfile.unlocked);
  assert.ok('TEMIZ_SEFER' in nextProfile.unlocked);
  assert.ok('GUVENILIR_TAYFA' in nextProfile.unlocked);
  assert.ok('USTA_KAPTAN' in nextProfile.unlocked);
  assert.equal(newlyUnlocked.length, 5);
});

test('evaluateMatchAchievements unlocks Kaçak victory, Best Bluff, and Fog Sabotage badges', () => {
  const initial = createEmptyProfile();
  const state = makeFinishedState({
    winner: 'KACAK',
    winReason: 'KACAK_MISSIONS',
    missions: [
      {
        round: 1,
        teamSize: 2,
        teamIds: ['p1', 'p2'],
        crisisCard: 'YOGUN_SIS',
        outcome: 'FAIL',
        sabotageCount: null,
        yardimCount: null,
        captainId: 'p2',
      },
    ],
    awards: [
      {
        id: 'BEST_BLUFF',
        titleKey: 'BEST_BLUFF',
        descriptionKey: 'BEST_BLUFF',
        playerId: 'p1',
        playerNickname: 'Sisli Martı',
        playerAvatar: 'marti',
        playerColorIndex: 0,
      },
    ],
    me: {
      id: 'p1',
      role: 'KACAK',
      partnerIds: [],
      myVote: null,
      myPlayedCard: null,
      isChatLockedByCrisis: false,
    },
    revealedRoles: { p1: 'KACAK' },
  });

  const { nextProfile } = evaluateMatchAchievements(state, initial, 2000);
  assert.equal(nextProfile.kacakWins, 1);
  assert.ok('ILK_KACAKLIK' in nextProfile.unlocked);
  assert.ok('EN_IYI_BLOFCU' in nextProfile.unlocked);
  assert.ok('SISLI_SABOTAJ' in nextProfile.unlocked);
});
