import type { AvatarId } from '../game/types';

const PALETTES = [
  { bg: 'bg-amber-950/70', border: 'border-amber-500/50', text: 'text-amber-300' },
  { bg: 'bg-sky-950/70', border: 'border-sky-500/50', text: 'text-sky-300' },
  { bg: 'bg-emerald-950/70', border: 'border-emerald-500/50', text: 'text-emerald-300' },
  { bg: 'bg-rose-950/70', border: 'border-rose-500/50', text: 'text-rose-300' },
  { bg: 'bg-indigo-950/70', border: 'border-indigo-500/50', text: 'text-indigo-300' },
  { bg: 'bg-teal-950/70', border: 'border-teal-500/50', text: 'text-teal-300' },
  { bg: 'bg-orange-950/70', border: 'border-orange-500/50', text: 'text-orange-300' },
  { bg: 'bg-cyan-950/70', border: 'border-cyan-500/50', text: 'text-cyan-300' },
];

function AvatarSvg({ avatar }: { avatar: AvatarId }) {
  switch (avatar) {
    case 'marti':
      return (
        <path
          d="M3 14c3-5 7-6 9-2 2-4 6-3 9 2-3-2-6-2-9 1-3-3-6-3-9-1Z"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case 'pusula':
      return (
        <>
          <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
          <polygon points="15.5,8.5 13.2,13.2 8.5,15.5 10.8,10.8" strokeWidth="1.6" />
        </>
      );
    case 'fener':
      return (
        <>
          <path d="M9 21h6M10 21l1-11h2l1 11M9 10h6M10 10V7a2 2 0 0 1 4 0v3" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M5 6l2 1M19 6l-2 1M12 3v1" strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case 'capa':
      return (
        <>
          <circle cx="12" cy="5" r="2" strokeWidth="1.8" />
          <path d="M12 7v13M8 10h8M5 14a7 7 0 0 0 14 0" strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case 'dumen':
      return (
        <>
          <circle cx="12" cy="12" r="6.5" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="2" strokeWidth="1.8" />
          <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1" strokeWidth="1.7" strokeLinecap="round" />
        </>
      );
    case 'halat':
      return (
        <>
          <ellipse cx="12" cy="12" rx="7" ry="4.5" transform="rotate(-35 12 12)" strokeWidth="1.8" />
          <ellipse cx="12" cy="12" rx="3.2" ry="1.8" transform="rotate(-35 12 12)" strokeWidth="1.6" />
        </>
      );
    case 'dalga':
      return (
        <>
          <path d="M2 12c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5 0" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M2 17c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0 3.5-1.5 5 0" strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case 'samandira':
      return (
        <>
          <path d="M7 19h10M9 19l2-10h2l2 10M12 5v4" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="4.5" r="1.5" strokeWidth="1.6" />
        </>
      );
    case 'durbun':
      return (
        <path
          d="M4 15l13-7 3 4-13 7-3-4Zm7-3.8 2.2 3.2"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case 'cankurtaran':
    default:
      return (
        <>
          <circle cx="12" cy="12" r="8.5" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="4" strokeWidth="1.8" />
          <path d="M12 3.5v4.5M12 16v4.5M3.5 12H8M16 12h4.5" strokeWidth="1.8" />
        </>
      );
  }
}

export function MaritimeAvatar({
  avatar,
  colorIndex,
  size = 'md',
}: {
  avatar: AvatarId;
  colorIndex: number;
  size?: 'sm' | 'md' | 'lg';
}) {
  const palette = PALETTES[Math.abs(colorIndex) % PALETTES.length];
  const sizeClass =
    size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-14 w-14' : 'h-10 w-10';
  const iconClass =
    size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-7 w-7' : 'h-5 w-5';

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center rounded-full border ${palette.bg} ${palette.border} ${palette.text} ${sizeClass}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={iconClass}>
        <AvatarSvg avatar={avatar} />
      </svg>
    </div>
  );
}
