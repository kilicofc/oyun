import {
  Anchor,
  Award,
  CloudFog,
  Compass,
  Drama,
  Navigation,
  ShieldCheck,
  Ship,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  ACHIEVEMENTS,
  type AchievementDefinition,
  type LocalPlayerProfile,
} from '../game/achievements';

function AchievementIcon({ icon }: { icon: AchievementDefinition['icon'] }) {
  const cls = 'h-5 w-5';
  switch (icon) {
    case 'ship':
      return <Ship className={cls} />;
    case 'anchor':
      return <Anchor className={cls} />;
    case 'mask':
      return <Drama className={cls} />;
    case 'star':
      return <Star className={cls} />;
    case 'fog':
      return <CloudFog className={cls} />;
    case 'shield':
      return <ShieldCheck className={cls} />;
    case 'helm':
      return <Navigation className={cls} />;
    case 'compass':
    default:
      return <Compass className={cls} />;
  }
}

const TIER_LABEL: Record<AchievementDefinition['tier'], string> = {
  BRONZE: 'Bronz',
  SILVER: 'Gümüş',
  GOLD: 'Altın',
};

export function AchievementsModal({
  open,
  profile,
  onReset,
  onClose,
}: {
  open: boolean;
  profile: LocalPlayerProfile;
  onReset: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const unlockedCount = Object.keys(profile.unlocked).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievements-modal-title"
    >
      <div className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-slate-700/70 bg-[#0F1B2B] p-4 text-slate-100 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-amber-400">
              <Award className="h-5 w-5 shrink-0" aria-hidden="true" />
              <h2 id="achievements-modal-title" className="font-display text-xl font-bold sm:text-2xl">
                Denizci Seyir Defteri
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Başarımlar ve unvanlar yalnızca bu tarayıcıda tutulur; sunucuda hesap veya profil takibi yapılmaz.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Seyir defterini kapat"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-700 bg-slate-800/70 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Local summary stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-[#132234] p-3">
            <div className="text-xs text-slate-400">Toplam Sefer</div>
            <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-white">
              {profile.gamesPlayed}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#132234] p-3">
            <div className="text-xs text-slate-400">Galibiyet</div>
            <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-emerald-400">
              {profile.wins}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#132234] p-3">
            <div className="text-xs text-slate-400">Mürettebat / Kaçak</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-200">
              {profile.crewWins} / {profile.kacakWins}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#132234] p-3">
            <div className="text-xs text-slate-400">Açılan Rozet</div>
            <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-amber-400">
              {unlockedCount}/{ACHIEVEMENTS.length}
            </div>
          </div>
        </div>

        {/* Achievement list */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ACHIEVEMENTS.map((ach) => {
            const unlockedAt = profile.unlocked[ach.id];
            const isUnlocked = Boolean(unlockedAt);
            return (
              <div
                key={ach.id}
                className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
                  isUnlocked
                    ? 'border-amber-500/40 bg-[#15263B]'
                    : 'border-slate-800/80 bg-[#0B1522] opacity-70'
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                    isUnlocked
                      ? 'border-amber-400/40 bg-amber-500/15 text-amber-300'
                      : 'border-slate-700 bg-slate-800/70 text-slate-500'
                  }`}
                >
                  <AchievementIcon icon={ach.icon} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-100">{ach.title}</h3>
                    <span className="text-xs font-medium text-slate-400 whitespace-nowrap shrink-0">
                      {TIER_LABEL[ach.tier]} · {isUnlocked ? 'Açıldı' : 'Kilitli'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{ach.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-2 text-xs font-medium text-rose-300 hover:bg-rose-900/40"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Yerel İlerlemeyi Sıfırla
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
