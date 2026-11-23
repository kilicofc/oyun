import { useState } from 'react';
import { Lock, Radio, Send } from 'lucide-react';
import { getDictionary } from '../game/i18n';
import type { ClientGameState } from '../game/types';
import { MaritimeAvatar } from './MaritimeAvatar';

export function ChatPanel({
  state,
  mutedPlayerIds,
  onSendChat,
}: {
  state: ClientGameState;
  mutedPlayerIds: Set<string>;
  onSendChat: (text: string, channel: 'PUBLIC' | 'KACAK', isQuickReaction?: boolean) => void;
}) {
  const t = getDictionary('tr');
  const [channel, setChannel] = useState<'PUBLIC' | 'KACAK'>('PUBLIC');
  const [draft, setDraft] = useState('');

  const canUseKacakChannel =
    state.me.role === 'KACAK' &&
    state.players.length >= 8 &&
    state.phase !== 'LOBBY' &&
    state.phase !== 'GAME_OVER';

  const activeChannel = canUseKacakChannel && channel === 'KACAK' ? 'KACAK' : 'PUBLIC';
  const rawMessages = activeChannel === 'KACAK' ? state.kacakMessages : state.messages;
  const visibleMessages = rawMessages.filter((m) => !mutedPlayerIds.has(m.senderId));
  const isLocked = activeChannel === 'PUBLIC' && state.me.isChatLockedByCrisis;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isLocked) return;
    onSendChat(text, activeChannel, false);
    setDraft('');
  };

  return (
    <section
      aria-label="Güverte Telsizi Sohbeti"
      className="flex h-[calc(100dvh-168px)] min-h-[320px] max-h-[580px] flex-col rounded-3xl border border-slate-800 bg-[#0F1B2B] lg:h-[620px] lg:max-h-none"
    >
      {/* Header + Optional Kaçak Radio Tab */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-3.5 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">Güverte Telsizi</h2>
        </div>

        {canUseKacakChannel && (
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#08101A] p-0.5">
            <button
              type="button"
              onClick={() => setChannel('PUBLIC')}
              className={`min-h-[38px] rounded-md px-2.5 text-xs font-medium transition-colors ${
                activeChannel === 'PUBLIC'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ortak
            </button>
            <button
              type="button"
              onClick={() => setChannel('KACAK')}
              className={`min-h-[38px] rounded-md px-2.5 text-xs font-medium transition-colors ${
                activeChannel === 'KACAK'
                  ? 'bg-rose-600 text-white'
                  : 'text-rose-300/80 hover:text-rose-200'
              }`}
            >
              Kaçak Telsizi
            </button>
          </div>
        )}
      </div>

      {/* Messages feed */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 sm:px-4">
        {visibleMessages.length === 0 ? (
          <p className="py-10 text-center text-xs text-slate-500">{t.status.emptyChat}</p>
        ) : (
          visibleMessages.map((m) => {
            const isMine = m.senderId === state.me.id;
            return (
              <div
                key={m.id}
                className={`flex items-start gap-2.5 ${isMine ? 'flex-row-reverse text-right' : ''}`}
              >
                <MaritimeAvatar
                  avatar={m.senderAvatar}
                  colorIndex={m.senderColorIndex}
                  size="sm"
                />
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-sm sm:max-w-[78%] ${
                    activeChannel === 'KACAK'
                      ? 'border border-rose-500/30 bg-rose-950/40 text-rose-100'
                      : isMine
                        ? 'bg-amber-500/15 border border-amber-500/30 text-amber-50'
                        : 'bg-[#132234] border border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-slate-400">
                    {m.senderNickname}
                  </div>
                  <p className="mt-0.5 break-words leading-snug">{m.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Reactions */}
      {!isLocked && activeChannel === 'PUBLIC' && (
        <div className="flex flex-nowrap gap-1.5 overflow-x-auto border-t border-slate-800/80 px-3 py-2 sm:flex-wrap sm:overflow-visible">
          {t.quickReactions.map((reaction) => (
            <button
              key={reaction}
              type="button"
              onClick={() => onSendChat(reaction, 'PUBLIC', true)}
              className="min-h-[38px] shrink-0 rounded-lg border border-slate-700 bg-[#132234] px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-amber-400/50 hover:text-amber-300"
            >
              {reaction}
            </button>
          ))}
        </div>
      )}

      {/* Input box (16px font on mobile prevents iOS Safari auto-zoom) */}
      {isLocked ? (
        <div className="flex items-center gap-2 border-t border-amber-500/30 bg-amber-950/30 px-4 py-3 text-xs text-amber-200">
          <Lock className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
          <span>{t.forms.chatLockedRadio}</span>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t border-slate-800 p-2.5 sm:p-3"
        >
          <input
            type="text"
            maxLength={240}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              activeChannel === 'KACAK' ? t.forms.kacakChatPlaceholder : t.forms.chatPlaceholder
            }
            aria-label="Telsiz mesajı"
            className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-slate-700 bg-[#08101A] px-3.5 text-base text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none sm:text-sm"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label={t.actions.send}
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl bg-amber-500 px-3.5 text-slate-950 hover:bg-amber-400 disabled:opacity-40"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      )}
    </section>
  );
}
