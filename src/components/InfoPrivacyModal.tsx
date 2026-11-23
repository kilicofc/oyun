import { Shield, Volume2, VolumeX, X } from 'lucide-react';
import { getDictionary } from '../game/i18n';

export function InfoPrivacyModal({
  open,
  mode,
  livekitAvailable,
  onClose,
}: {
  open: boolean;
  mode: 'privacy' | 'rules';
  livekitAvailable: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  const t = getDictionary('tr');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
    >
      <div className="w-full max-w-xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-slate-700/70 bg-[#0F1B2B] p-4 text-slate-100 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4 sm:gap-4">
          <div className="flex items-center gap-2.5 text-amber-400">
            <Shield className="h-5 w-5 shrink-0" aria-hidden="true" />
            <h2 id="info-modal-title" className="font-display text-xl font-bold sm:text-2xl">
              {mode === 'privacy' ? t.privacy.title : 'Son Sefer — Oyun Kuralları'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.actions.close}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-700 bg-slate-800/70 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {mode === 'privacy' ? (
          <div className="mt-5 space-y-5 text-sm leading-relaxed text-slate-300">
            <ul className="space-y-2.5">
              {t.privacy.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-xl border border-slate-800 bg-[#132234] p-4">
              <div className="flex items-center gap-2 font-semibold text-slate-100">
                {livekitAvailable ? (
                  <Volume2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                ) : (
                  <VolumeX className="h-4 w-4 text-slate-400" aria-hidden="true" />
                )}
                <span>{t.privacy.voiceTitle}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                {livekitAvailable ? t.privacy.voiceEnabledText : t.privacy.voiceDisabledText}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-300">
            <div className="rounded-xl border border-slate-800 bg-[#132234] p-4">
              <h3 className="font-semibold text-amber-300">Takımlar ve Amaç (6–10 Oyuncu)</h3>
              <p className="mt-1 text-slate-300">
                6–7 oyuncuda 1 Kaçak, 8–10 oyuncuda 2 Kaçak bulunur. Mürettebat 3 görevi başarıyla
                tamamlarsa kazanır; Kaçaklar 3 görevi başarısızlığa uğratırsa kazanır.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#132234] p-4">
              <h3 className="font-semibold text-amber-300">Ekip Oylaması ve Fırtına Kuralı</h3>
              <p className="mt-1 text-slate-300">
                Her tur kaptan sıradaki oyuncuya geçer. Kaptan görev ekibini önerir ve herkes
                gizlice Kabul veya Ret oyu verir. Art arda 3 ekip önerisi reddedilirse Fırtına
                seferi vurur ve o görev doğrudan başarısız sayılır.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#132234] p-4">
              <h3 className="font-semibold text-amber-300">Görev Kartları ve Krizler</h3>
              <p className="mt-1 text-slate-300">
                Mürettebat yalnızca Yardım oynayabilir. Kaçaklar güven kazanmak için Yardım veya
                görevi bozmak için Sabotaj oynayabilir. Tek bir Sabotaj kartı görevi başarısız
                kılar. Her turun başında Yoğun Sis, Bozuk Telsiz veya Acil Onarım kriz kartı
                açılır.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400"
          >
            {t.actions.close}
          </button>
        </div>
      </div>
    </div>
  );
}
