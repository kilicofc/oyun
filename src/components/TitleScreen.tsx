import { Anchor, Award, BookOpen, Compass, ShieldCheck, Users } from 'lucide-react';
import { getDictionary } from '../game/i18n';

const HERO_ART_URL = '/src/assets/images/ferry_storm_hero_1795464715692.jpg';

export function TitleScreen({
  unlockedCount,
  totalAchievements,
  onOpenCreate,
  onOpenJoin,
  onOpenRules,
  onOpenPrivacy,
  onOpenAchievements,
}: {
  unlockedCount: number;
  totalAchievements: number;
  onOpenCreate: () => void;
  onOpenJoin: () => void;
  onOpenRules: () => void;
  onOpenPrivacy: () => void;
  onOpenAchievements: () => void;
}) {
  const t = getDictionary('tr');

  return (
    <div className="min-h-dvh flex flex-col bg-[#08101A]">
      {/* Minimal 3-zone top bar */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-1.5 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:gap-8 sm:px-6 sm:py-3.5">
        <span className="font-display text-base font-bold tracking-tight text-amber-400 whitespace-nowrap shrink-0 sm:text-xl">
          {t.appName}
        </span>

        <nav className="flex items-center gap-2.5 text-xs font-medium text-slate-300 sm:gap-5 sm:text-sm">
          <button
            type="button"
            onClick={onOpenRules}
            className="min-h-[44px] whitespace-nowrap shrink-0 px-1 hover:text-white transition-colors"
          >
            <span className="min-[380px]:hidden">Kurallar</span>
            <span className="hidden min-[380px]:inline">{t.actions.howToPlay}</span>
          </button>
          <button
            type="button"
            onClick={onOpenAchievements}
            className="min-h-[44px] whitespace-nowrap shrink-0 px-1 hover:text-amber-300 transition-colors"
          >
            <span className="sm:hidden">Rozetler</span>
            <span className="hidden sm:inline">
              Başarımlar ({unlockedCount}/{totalAchievements})
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="hidden md:inline-flex min-h-[44px] items-center whitespace-nowrap shrink-0 hover:text-white transition-colors"
          >
            {t.actions.privacyAndVoice}
          </button>
        </nav>

        <button
          type="button"
          onClick={onOpenCreate}
          data-start="true"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 sm:px-5 sm:text-sm"
        >
          {t.actions.createRoom}
        </button>
      </header>

      {/* Main Hero Stage */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-3 py-4 sm:px-6 sm:py-6 lg:py-10">
        <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-[#0D1826] shadow-2xl">
          {/* Atmospheric ferry artwork with left negative space scrim */}
          <div className="relative flex min-h-[380px] items-center sm:min-h-[460px] lg:min-h-[540px]">
            <img
              src={HERO_ART_URL}
              alt="Fırtınalı gecede ilerleyen ışıklandırılmış feribot ve deniz feneri"
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover object-right opacity-85"
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-[#08101A] via-[#08101A]/90 to-[#08101A]/30"
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#08101A] via-transparent to-transparent lg:hidden"
              aria-hidden="true"
            />

            <div className="relative z-10 max-w-xl p-5 sm:p-10 lg:p-14">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-amber-300/90">
                <span>6–10 Oyuncu</span>
                <span aria-hidden="true">·</span>
                <span>8–12 Dakika</span>
                <span aria-hidden="true">·</span>
                <span>Tarayıcı Parti Oyunu</span>
              </div>

              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                {t.appName}
              </h1>

              <p className="mt-3 text-sm leading-relaxed text-slate-200 sm:mt-4 sm:text-lg">
                {t.tagline}
              </p>

              <p className="mt-2.5 text-xs leading-relaxed text-slate-400 sm:mt-3 sm:text-sm">
                {t.landingSubnote}
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={onOpenCreate}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-base font-semibold text-slate-950 hover:bg-amber-400 transition-colors"
                >
                  <Anchor className="h-5 w-5" aria-hidden="true" />
                  {t.actions.createRoom}
                </button>
                <button
                  type="button"
                  onClick={onOpenJoin}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-600/80 bg-[#132234]/90 px-6 py-3 text-base font-semibold text-white hover:bg-[#1B2E45] transition-colors"
                >
                  <Compass className="h-5 w-5 text-amber-400" aria-hidden="true" />
                  {t.actions.joinRoom}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3 concise value pillars below hero */}
        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800/80 bg-[#0F1B2B] p-5">
            <div className="flex items-center gap-2.5 text-amber-400">
              <Users className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-base font-semibold text-slate-100">Anonim ve Anında Katılım</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Kayıt veya sosyal medya girişi olmadan davet linkiyle odaya gir, rastgele denizci
              rumuzunu al ve oyna.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-[#0F1B2B] p-5">
            <div className="flex items-center gap-2.5 text-emerald-400">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-base font-semibold text-slate-100">Sunucu Korumalı Gizli Roller</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Gizli roller, görev kartları ve oylar yalnızca sunucuda doğrulanır; maç bitene kadar
              diğer oyunculara gönderilmez.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-[#0F1B2B] p-5">
            <div className="flex items-center gap-2.5 text-sky-400">
              <Award className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-base font-semibold text-slate-100">Kriz Kartları ve Başarımlar</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Yoğun Sis, Bozuk Telsiz ve Acil Onarım krizleriyle her tur yön değiştirirken yerel
              seyir defterinde rozetler aç.
            </p>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-3 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-xs text-slate-500 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>Son Sefer · Yazılı sohbetle baştan sona oynanabilir</span>
          <span aria-hidden="true">·</span>
          <span className="text-slate-400">Geliştiren: Muhammet Kılıç</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onOpenRules}
            className="inline-flex min-h-[44px] items-center gap-1 hover:text-slate-300"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            {t.actions.howToPlay}
          </button>
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="inline-flex min-h-[44px] items-center hover:text-slate-300"
          >
            {t.actions.privacyAndVoice}
          </button>
        </div>
      </footer>
    </div>
  );
}
