import type { AvatarId } from './types';

export const NAUTICAL_NICKNAMES = [
  'Sisli Martı',
  'Paslı Pusula',
  'Fener Bekçisi',
  'Kuzey Yıldızı',
  'Demirli Tekne',
  'Tuzlu Halat',
  'Gümüş Çapa',
  'Gece Vardiya',
  'Derin Şamandıra',
  'Yalpalayan Dümen',
  'Uzak Dalga',
  'Buzlu Kürek',
  'Kırık İskele',
  'Rüzgar Gülü',
  'Sakin Koy',
  'Lodos Kuşu',
  'Alabora Çanı',
  'Körfez Fısıltısı',
  'Mercan Kayası',
  'Batık Fener',
] as const;

export const AVATAR_IDS: AvatarId[] = [
  'marti',
  'pusula',
  'fener',
  'capa',
  'dumen',
  'halat',
  'dalga',
  'samandira',
  'durbun',
  'cankurtaran',
];

export const AVATAR_LABELS: Record<AvatarId, string> = {
  marti: 'Martı',
  pusula: 'Pusula',
  fener: 'Deniz Feneri',
  capa: 'Çapa',
  dumen: 'Dümen',
  halat: 'Halat',
  dalga: 'Dalga',
  samandira: 'Şamandıra',
  durbun: 'Dürbün',
  cankurtaran: 'Cankurtaran Simidi',
};

export function generateRandomIdentity(existingNicknames: string[] = []): {
  nickname: string;
  avatar: AvatarId;
  colorIndex: number;
} {
  const taken = new Set(existingNicknames.map((n) => n.toLocaleLowerCase('tr')));
  const available = NAUTICAL_NICKNAMES.filter((n) => !taken.has(n.toLocaleLowerCase('tr')));
  const pool = available.length > 0 ? available : NAUTICAL_NICKNAMES;
  const nickname = pool[Math.floor(Math.random() * pool.length)];
  const avatar = AVATAR_IDS[Math.floor(Math.random() * AVATAR_IDS.length)];
  const colorIndex = Math.floor(Math.random() * 8);
  return { nickname, avatar, colorIndex };
}
