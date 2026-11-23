import type { ClientGameState } from './types';

export type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  tier: AchievementTier;
  icon: 'compass' | 'anchor' | 'ship' | 'mask' | 'fog' | 'star' | 'helm' | 'shield';
}

export interface LocalPlayerProfile {
  gamesPlayed: number;
  wins: number;
  crewWins: number;
  kacakWins: number;
  unlocked: Record<string, number>; // achievementId -> unlockedAt timestamp
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'FIRTINAYA_MEYDAN_OKUYAN',
    title: 'Fırtınaya Meydan Okuyan',
    description: 'Herhangi bir Son Sefer oyununda kazanan tarafta yer al.',
    tier: 'BRONZE',
    icon: 'ship',
  },
  {
    id: 'MURETTEBATIN_KURTARICISI',
    title: 'Mürettebatın Kurtarıcısı',
    description: 'Mürettebat rolüyle feribotu güvenli limana ulaştır.',
    tier: 'SILVER',
    icon: 'anchor',
  },
  {
    id: 'ILK_KACAKLIK',
    title: 'İlk Kaçaklık',
    description: 'Kaçak rolünü başarıyla tamamlayıp oyunu kazan.',
    tier: 'SILVER',
    icon: 'mask',
  },
  {
    id: 'EN_IYI_BLOFCU',
    title: 'En İyi Blöfçü',
    description: 'Kaçak olarak görev ekiplerine sız ve maç sonu "En İyi Blöfçü" unvanını al.',
    tier: 'GOLD',
    icon: 'star',
  },
  {
    id: 'SISLI_SABOTAJ',
    title: 'Sis Perdesi',
    description: 'Yoğun Sis kriz kartı aktifken Kaçak olarak bir görevin başarısız olmasını sağla.',
    tier: 'SILVER',
    icon: 'fog',
  },
  {
    id: 'TEMIZ_SEFER',
    title: 'Kusursuz Rota',
    description: 'Mürettebat olarak hiç başarısız görev olmadan (3-0) oyunu kazan.',
    tier: 'GOLD',
    icon: 'shield',
  },
  {
    id: 'GUVENILIR_TAYFA',
    title: 'Güvenilir Tayfa',
    description: 'Maç sonunda "Güvenilir Tayfa" unvanını kazan.',
    tier: 'BRONZE',
    icon: 'compass',
  },
  {
    id: 'USTA_KAPTAN',
    title: 'Usta Kaptan',
    description: 'Kaptan olarak önerdiğin ekip onaylanıp görevi başarıyla tamamlasın.',
    tier: 'BRONZE',
    icon: 'helm',
  },
];

const STORAGE_KEY = 'son_sefer_local_achievements_v1';

export function createEmptyProfile(): LocalPlayerProfile {
  return {
    gamesPlayed: 0,
    wins: 0,
    crewWins: 0,
    kacakWins: 0,
    unlocked: {},
  };
}

export function loadLocalProfile(): LocalPlayerProfile {
  if (typeof window === 'undefined') return createEmptyProfile();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyProfile();
    const parsed = JSON.parse(raw) as Partial<LocalPlayerProfile>;
    return {
      gamesPlayed: Number(parsed.gamesPlayed) || 0,
      wins: Number(parsed.wins) || 0,
      crewWins: Number(parsed.crewWins) || 0,
      kacakWins: Number(parsed.kacakWins) || 0,
      unlocked: parsed.unlocked && typeof parsed.unlocked === 'object' ? parsed.unlocked : {},
    };
  } catch {
    return createEmptyProfile();
  }
}

export function saveLocalProfile(profile: LocalPlayerProfile): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearLocalProfile(): LocalPlayerProfile {
  const empty = createEmptyProfile();
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
  return empty;
}

/**
 * Pure evaluation of which achievements are earned by `state.me.id` from a completed match.
 */
export function evaluateMatchAchievements(
  state: ClientGameState,
  currentProfile: LocalPlayerProfile,
  nowMs: number = Date.now()
): {
  nextProfile: LocalPlayerProfile;
  newlyUnlocked: AchievementDefinition[];
} {
  if (state.phase !== 'GAME_OVER' || !state.winner) {
    return { nextProfile: currentProfile, newlyUnlocked: [] };
  }

  const myId = state.me.id;
  const myRole = state.revealedRoles?.[myId] ?? state.me.role;
  if (!myRole) {
    return { nextProfile: currentProfile, newlyUnlocked: [] };
  }

  const didWin = myRole === state.winner;
  const earnedIds: string[] = [];

  if (didWin) {
    earnedIds.push('FIRTINAYA_MEYDAN_OKUYAN');
    if (myRole === 'MURETTEBAT') {
      earnedIds.push('MURETTEBATIN_KURTARICISI');
      const anyFail = state.missions.some((m) => m.outcome !== 'SUCCESS');
      if (!anyFail && state.missions.filter((m) => m.outcome === 'SUCCESS').length >= 3) {
        earnedIds.push('TEMIZ_SEFER');
      }
    } else if (myRole === 'KACAK') {
      earnedIds.push('ILK_KACAKLIK');
    }
  }

  // Title-based awards
  const myAwards = state.awards.filter((a) => a.playerId === myId);
  if (myAwards.some((a) => a.id === 'BEST_BLUFF')) {
    earnedIds.push('EN_IYI_BLOFCU');
  }
  if (myAwards.some((a) => a.id === 'LOYAL_SAILOR')) {
    earnedIds.push('GUVENILIR_TAYFA');
  }

  // Fog Sabotage: Kaçak participated in a failed Yoğun Sis mission
  if (
    myRole === 'KACAK' &&
    state.missions.some(
      (m) => m.crisisCard === 'YOGUN_SIS' && m.outcome === 'FAIL' && m.teamIds.includes(myId)
    )
  ) {
    earnedIds.push('SISLI_SABOTAJ');
  }

  // Usta Kaptan: Captain led a successful mission
  if (
    state.missions.some((m) => m.captainId === myId && m.outcome === 'SUCCESS')
  ) {
    earnedIds.push('USTA_KAPTAN');
  }

  const nextUnlocked = { ...currentProfile.unlocked };
  const newlyUnlocked: AchievementDefinition[] = [];

  for (const id of earnedIds) {
    if (!(id in nextUnlocked)) {
      nextUnlocked[id] = nowMs;
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) newlyUnlocked.push(def);
    }
  }

  const nextProfile: LocalPlayerProfile = {
    gamesPlayed: currentProfile.gamesPlayed + 1,
    wins: currentProfile.wins + (didWin ? 1 : 0),
    crewWins: currentProfile.crewWins + (didWin && myRole === 'MURETTEBAT' ? 1 : 0),
    kacakWins: currentProfile.kacakWins + (didWin && myRole === 'KACAK' ? 1 : 0),
    unlocked: nextUnlocked,
  };

  return { nextProfile, newlyUnlocked };
}
