import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyStormRule,
  assignRoles,
  checkWinCondition,
  computeAwards,
  evaluateMissionOutcome,
  evaluateTeamVote,
  getKacakCount,
  getTeamSize,
  isPlayerMutedByRadioCrisis,
} from './rules';
import type { MissionRecord, PlayerPublicView, VoteRoundRecord } from './types';

test('getKacakCount distributes 1 Kaçak for 6-7 players and 2 for 8-10 players', () => {
  assert.equal(getKacakCount(6), 1);
  assert.equal(getKacakCount(7), 1);
  assert.equal(getKacakCount(8), 2);
  assert.equal(getKacakCount(9), 2);
  assert.equal(getKacakCount(10), 2);
  assert.throws(() => getKacakCount(5));
  assert.throws(() => getKacakCount(11));
});

test('getTeamSize returns exact mission sizes for 6-7 and 8-10 players', () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((r) => getTeamSize(6, r)),
    [2, 3, 3, 4, 4]
  );
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((r) => getTeamSize(7, r)),
    [2, 3, 3, 4, 4]
  );
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((r) => getTeamSize(8, r)),
    [3, 3, 4, 4, 5]
  );
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((r) => getTeamSize(10, r)),
    [3, 3, 4, 4, 5]
  );
});

test('assignRoles assigns exact Kaçak and Mürettebat counts', () => {
  const ids6 = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  const roles6 = assignRoles(ids6, () => 0.42);
  assert.equal(Object.values(roles6).filter((r) => r === 'KACAK').length, 1);
  assert.equal(Object.values(roles6).filter((r) => r === 'MURETTEBAT').length, 5);

  const ids9 = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'];
  const roles9 = assignRoles(ids9, () => 0.17);
  assert.equal(Object.values(roles9).filter((r) => r === 'KACAK').length, 2);
  assert.equal(Object.values(roles9).filter((r) => r === 'MURETTEBAT').length, 7);
});

test('evaluateTeamVote requires strict majority to approve', () => {
  // 6 players: 3-3 tie must reject
  const tie6 = evaluateTeamVote(
    { p1: true, p2: true, p3: true, p4: false, p5: false, p6: false },
    6
  );
  assert.equal(tie6.approved, false);
  assert.equal(tie6.acceptCount, 3);
  assert.equal(tie6.rejectCount, 3);

  // 6 players: 4-2 approves
  const pass6 = evaluateTeamVote(
    { p1: true, p2: true, p3: true, p4: true, p5: false, p6: false },
    6
  );
  assert.equal(pass6.approved, true);

  // 7 players: 4-3 approves
  const pass7 = evaluateTeamVote(
    { p1: true, p2: true, p3: true, p4: true, p5: false, p6: false, p7: false },
    7
  );
  assert.equal(pass7.approved, true);
});

test('evaluateMissionOutcome handles normal, Yoğun Sis, and Acil Onarım crisis cards', () => {
  const normalSuccess = evaluateMissionOutcome(['YARDIM', 'YARDIM', 'YARDIM'], 'ACIL_ONARIM');
  assert.equal(normalSuccess.outcome, 'SUCCESS');
  assert.equal(normalSuccess.visibleSabotageCount, 0);

  const normalFail = evaluateMissionOutcome(['YARDIM', 'SABOTAJ', 'YARDIM'], 'BOZUK_TELSIZ');
  assert.equal(normalFail.outcome, 'FAIL');
  assert.equal(normalFail.visibleSabotageCount, 1);
  assert.equal(normalFail.visibleYardimCount, 2);

  // Yoğun Sis hides sabotage count on failure
  const fogFail = evaluateMissionOutcome(['SABOTAJ', 'SABOTAJ', 'YARDIM'], 'YOGUN_SIS');
  assert.equal(fogFail.outcome, 'FAIL');
  assert.equal(fogFail.visibleSabotageCount, null);
  assert.equal(fogFail.visibleYardimCount, null);
  assert.equal(fogFail.actualSabotageCount, 2);

  // Acil Onarım fails if any card is not Yardım
  const emergencyFail = evaluateMissionOutcome(['YARDIM', 'SABOTAJ'], 'ACIL_ONARIM');
  assert.equal(emergencyFail.outcome, 'FAIL');
});

test('applyStormRule triggers failed mission on 3rd consecutive rejection and resets counter', () => {
  const r1 = applyStormRule(1, 0, 6);
  assert.equal(r1.stormTriggered, false);
  assert.equal(r1.nextRejections, 1);
  assert.equal(r1.nextCaptainIndex, 1);

  const r3 = applyStormRule(3, 5, 6);
  assert.equal(r3.stormTriggered, true);
  assert.equal(r3.nextRejections, 0);
  assert.equal(r3.nextCaptainIndex, 0);
});

test('checkWinCondition detects 3 Crew successes or 3 failures (including Storm)', () => {
  const baseMission = (
    round: number,
    outcome: 'SUCCESS' | 'FAIL' | 'STORM'
  ): MissionRecord => ({
    round,
    teamSize: 2,
    teamIds: ['p1', 'p2'],
    crisisCard: 'YOGUN_SIS',
    outcome,
    sabotageCount: null,
    yardimCount: null,
    captainId: 'p1',
  });

  assert.deepEqual(checkWinCondition([baseMission(1, 'SUCCESS'), baseMission(2, 'FAIL')]), {
    winner: null,
    reason: null,
  });

  assert.deepEqual(
    checkWinCondition([
      baseMission(1, 'SUCCESS'),
      baseMission(2, 'FAIL'),
      baseMission(3, 'SUCCESS'),
      baseMission(4, 'SUCCESS'),
    ]),
    { winner: 'MURETTEBAT', reason: 'CREW_MISSIONS' }
  );

  assert.deepEqual(
    checkWinCondition([
      baseMission(1, 'FAIL'),
      baseMission(2, 'SUCCESS'),
      baseMission(3, 'FAIL'),
      baseMission(4, 'STORM'),
    ]),
    { winner: 'KACAK', reason: 'STORM_LIMIT' }
  );
});

test('isPlayerMutedByRadioCrisis blocks only mission team members during MISSION_EXECUTION', () => {
  assert.equal(
    isPlayerMutedByRadioCrisis('BOZUK_TELSIZ', 'MISSION_EXECUTION', ['p1', 'p2'], 'p1'),
    true
  );
  assert.equal(
    isPlayerMutedByRadioCrisis('BOZUK_TELSIZ', 'MISSION_EXECUTION', ['p1', 'p2'], 'p3'),
    false
  );
  assert.equal(
    isPlayerMutedByRadioCrisis('BOZUK_TELSIZ', 'MISSION_RESULT', ['p1', 'p2'], 'p1'),
    false
  );
});

test('computeAwards produces non-empty post-game awards', () => {
  const players: PlayerPublicView[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map((id, idx) => ({
    id,
    nickname: `Denizci ${idx + 1}`,
    avatar: 'marti',
    colorIndex: idx,
    seatIndex: idx,
    isHost: idx === 0,
    isReady: true,
    isConnected: true,
    disconnectedAt: null,
    hasAckedRole: true,
    hasVoted: false,
    hasPlayedCard: false,
  }));

  const roles = {
    p1: 'KACAK',
    p2: 'MURETTEBAT',
    p3: 'MURETTEBAT',
    p4: 'MURETTEBAT',
    p5: 'MURETTEBAT',
    p6: 'MURETTEBAT',
  } as const;

  const missions: MissionRecord[] = [
    {
      round: 1,
      teamSize: 2,
      teamIds: ['p1', 'p2'],
      crisisCard: 'YOGUN_SIS',
      outcome: 'FAIL',
      sabotageCount: null,
      yardimCount: null,
      captainId: 'p1',
    },
    {
      round: 2,
      teamSize: 3,
      teamIds: ['p2', 'p3', 'p4'],
      crisisCard: 'ACIL_ONARIM',
      outcome: 'SUCCESS',
      sabotageCount: 0,
      yardimCount: 3,
      captainId: 'p2',
    },
  ];

  const voteHistory: VoteRoundRecord[] = [
    {
      round: 1,
      attempt: 1,
      captainId: 'p3',
      proposedTeamIds: ['p3', 'p4'],
      votes: { p1: false, p2: false, p3: true, p4: true, p5: false, p6: false },
      approved: false,
    },
  ];

  const awards = computeAwards({
    players,
    roles: { ...roles },
    missions,
    voteHistory,
  });

  assert.ok(awards.some((a) => a.id === 'BEST_BLUFF' && a.playerId === 'p1'));
  assert.ok(awards.some((a) => a.id === 'SUSPICIOUS_CAPTAIN' && a.playerId === 'p3'));
  assert.ok(awards.some((a) => a.id === 'WRONG_ACCUSER' && a.playerId === 'p2'));
  assert.ok(awards.some((a) => a.id === 'LOYAL_SAILOR' && a.playerId === 'p2'));
});
