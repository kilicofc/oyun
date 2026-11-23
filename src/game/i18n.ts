import type { CrisisCardId } from './types';

export type LocaleCode = 'tr';

export interface TranslationDictionary {
  appName: string;
  tagline: string;
  landingSubnote: string;
  actions: {
    createRoom: string;
    joinRoom: string;
    howToPlay: string;
    privacyAndVoice: string;
    startGame: string;
    ready: string;
    notReady: string;
    copyInvite: string;
    copied: string;
    kick: string;
    mute: string;
    unmute: string;
    report: string;
    reportSubmitted: string;
    leaveRoom: string;
    ackRole: string;
    proposeTeam: string;
    acceptTeam: string;
    rejectTeam: string;
    playYardim: string;
    playSabotaj: string;
    nextRound: string;
    playAgain: string;
    newRoom: string;
    shareResult: string;
    downloadCard: string;
    send: string;
    close: string;
    reconnect: string;
  };
  forms: {
    nicknameLabel: string;
    nicknamePlaceholder: string;
    randomizeIdentity: string;
    roomCodeLabel: string;
    roomCodePlaceholder: string;
    maxPlayersLabel: string;
    turnSecondsLabel: string;
    voiceToggleLabel: string;
    voiceUnavailableHint: string;
    avatarPickerLabel: string;
    chatPlaceholder: string;
    chatLockedRadio: string;
    kacakChatPlaceholder: string;
  };
  roles: {
    MURETTEBAT: {
      title: string;
      goal: string;
      summary: string;
      actionHint: string;
    };
    KACAK: {
      title: string;
      goal: string;
      summary: string;
      actionHint: string;
      partnerLabel: string;
      soloLabel: string;
    };
  };
  phases: {
    LOBBY: string;
    ROLE_REVEAL: string;
    TEAM_PROPOSAL: string;
    TEAM_VOTE: string;
    MISSION_EXECUTION: string;
    MISSION_RESULT: string;
    GAME_OVER: string;
  };
  crisis: Record<
    CrisisCardId,
    {
      title: string;
      badge: string;
      description: string;
    }
  >;
  quickReactions: string[];
  awards: Record<
    string,
    {
      title: string;
      description: string;
    }
  >;
  status: {
    waitingForPlayers: string;
    needSixPlayers: string;
    waitingForReady: string;
    captainSelecting: string;
    votingInProgress: string;
    missionInProgress: string;
    missionSuccess: string;
    missionFail: string;
    stormTriggered: string;
    fogHiddenCount: string;
    crewWon: string;
    kacakWon: string;
    disconnected: string;
    reconnecting: string;
    emptyChat: string;
    roomFull: string;
  };
  privacy: {
    title: string;
    bullets: string[];
    voiceTitle: string;
    voiceEnabledText: string;
    voiceDisabledText: string;
  };
}

export const tr: TranslationDictionary = {
  appName: 'Son Sefer',
  tagline:
    'Fırtınadaki feribotu limana ulaştır ya da mürettebatın arasında gizlenip seferleri sabote et.',
  landingSubnote:
    'Hesap, e-posta veya sosyal medya girişi gerekmez. Yalnızca bu maç için üretilen rastgele rumuzla oyna; sesli sohbet tamamen isteğe bağlıdır.',
  actions: {
    createRoom: 'Oda Kur',
    joinRoom: 'Odaya Katıl',
    howToPlay: 'Kurallar',
    privacyAndVoice: 'Gizlilik ve Ses Bilgisi',
    startGame: 'Seferi Başlat',
    ready: 'Hazırım',
    notReady: 'Hazır Değilim',
    copyInvite: 'Davet Linkini Kopyala',
    copied: 'Kopyalandı',
    kick: 'Çıkar',
    mute: 'Sustur',
    unmute: 'Sesi Aç',
    report: 'Şikâyet Et',
    reportSubmitted: 'Bildirildi',
    leaveRoom: 'Odadan Ayrıl',
    ackRole: 'Rolümü Gördüm, Hazırım',
    proposeTeam: 'Ekibi Öner',
    acceptTeam: 'Ekibi Kabul Et',
    rejectTeam: 'Ekibi Reddet',
    playYardim: 'Yardım Et',
    playSabotaj: 'Sabotaj Yap',
    nextRound: 'Sonraki Tura Geç',
    playAgain: 'Aynı Ekiple Yeniden Oyna',
    newRoom: 'Yeni Oda Kur',
    shareResult: 'Sonucu Kopyala',
    downloadCard: 'Sonuç Kartını İndir',
    send: 'Gönder',
    close: 'Kapat',
    reconnect: 'Yeniden Bağlan',
  },
  forms: {
    nicknameLabel: 'Maç Rumuzu',
    nicknamePlaceholder: 'Örn. Sisli Martı',
    randomizeIdentity: 'Rastgele Üret',
    roomCodeLabel: 'Oda Kodu',
    roomCodePlaceholder: 'Örn. F7K9M2',
    maxPlayersLabel: 'Oyuncu Limiti',
    turnSecondsLabel: 'Tur Süresi (sn)',
    voiceToggleLabel: 'Sesli Sohbet (LiveKit)',
    voiceUnavailableHint:
      'Sunucuda LiveKit anahtarları tanımlı olmadığı için sesli sohbet kapalıdır. Oyun yazılı sohbetle eksiksiz oynanabilir.',
    avatarPickerLabel: 'Denizci Amblemi',
    chatPlaceholder: 'Güverte telsizine mesaj yaz...',
    chatLockedRadio: 'Bozuk Telsiz krizi nedeniyle görev ekibi sonuç açıklanana kadar yazamaz.',
    kacakChatPlaceholder: 'Kaçak telsizinden fısılda...',
  },
  roles: {
    MURETTEBAT: {
      title: 'Mürettebat',
      goal: '3 görevi başarıyla tamamla ve feribotu güvenli limana ulaştır.',
      summary: 'Aranızdaki Kaçakları konuşmalardan, ekip önerilerinden ve oylamalardan çözmeye çalış.',
      actionHint: 'Göreve seçildiğinde yalnızca "Yardım Et" kartı oynayabilirsin.',
    },
    KACAK: {
      title: 'Kaçak',
      goal: '3 görevi başarısızlığa uğratarak feribotu fırtınada durdur.',
      summary:
        'Kimliğini gizle. Güven kazanmak için bazı görevlerde "Yardım Et" oynamak zorunda değilsin ama oynayabilirsin!',
      actionHint: 'Göreve seçildiğinde "Yardım Et" veya "Sabotaj Yap" kartlarından birini seçebilirsin.',
      partnerLabel: 'Diğer Kaçak',
      soloLabel: 'Bu seferde tek Kaçak sensin.',
    },
  },
  phases: {
    LOBBY: 'İskele Lobisi',
    ROLE_REVEAL: 'Gizli Rol Dağıtımı',
    TEAM_PROPOSAL: 'Ekip Önerisi',
    TEAM_VOTE: 'Ekip Oylaması',
    MISSION_EXECUTION: 'Görev İcrası',
    MISSION_RESULT: 'Görev Raporu',
    GAME_OVER: 'Sefer Sonu',
  },
  crisis: {
    YOGUN_SIS: {
      title: 'Yoğun Sis',
      badge: 'Kriz Kartı',
      description:
        'Bu turda görev başarısız olursa kaç adet Sabotaj kartı oynandığı gizlenir; yalnızca görevin başarısız olduğu açıklanır.',
    },
    BOZUK_TELSIZ: {
      title: 'Bozuk Telsiz',
      badge: 'Kriz Kartı',
      description:
        'Görev ekibine seçilen oyuncular, görev sonucu açıklanana kadar ortak yazılı sohbeti kullanamaz.',
    },
    ACIL_ONARIM: {
      title: 'Acil Onarım',
      badge: 'Kriz Kartı',
      description:
        'Fırtına hasarı ağır! Bu turun başarılı sayılması için ekipteki herkesin "Yardım Et" oynamış olması gerekir.',
    },
  },
  quickReactions: ['Şüpheli', 'Kanıtın var mı?', 'Bence kaptan yalan söylüyor'],
  awards: {
    BEST_BLUFF: {
      title: 'En İyi Blöfçü',
      description: 'Kaçak olarak en çok görev ekibine sızıp güven toplamayı başardı.',
    },
    SUSPICIOUS_CAPTAIN: {
      title: 'En Şüpheli Kaptan',
      description: 'Önerdiği ekipler en fazla ret oyu aldı.',
    },
    WRONG_ACCUSER: {
      title: 'Yanlış Kişiyi Suçlayan',
      description: 'Temiz mürettebatın yer aldığı başarılı ekiplerde bile en çok ret oyu verdi.',
    },
    LOYAL_SAILOR: {
      title: 'Güvenilir Tayfa',
      description: 'Mürettebat saflarında en yüksek başarılı görev katkısını sağladı.',
    },
    STORM_SURVIVOR: {
      title: 'Fırtına Kaptanı',
      description: 'En çalkantılı turlarda dümenin başında kaldı.',
    },
  },
  status: {
    waitingForPlayers: 'Mürettebatın iskeleye toplanması bekleniyor.',
    needSixPlayers: 'Seferin başlaması için en az 6 oyuncu gerekli.',
    waitingForReady: 'Oyunu başlatmak için tüm katılımcıların hazır olması gerekir.',
    captainSelecting: 'Kaptan görev ekibini seçiyor.',
    votingInProgress: 'Herkes önerilen ekibi gizlice oyluyor.',
    missionInProgress: 'Seçilen ekip görev kartlarını gizlice oynuyor.',
    missionSuccess: 'Görev Başarılı! Gemi rotasında ilerliyor.',
    missionFail: 'Görev Başarısız! Feribotta sabotaj tespit edildi.',
    stormTriggered: 'Art arda 3 ekip reddedildi! Fırtına vurdu ve bu görev başarısız sayıldı.',
    fogHiddenCount: 'Yoğun Sis nedeniyle oynanan Sabotaj kartı sayısı gizlendi.',
    crewWon: 'Mürettebat Kazandı! Feribot güvenli limana yanaştı.',
    kacakWon: 'Kaçaklar Kazandı! Fırtına ve sabotaj feribotu durdurdu.',
    disconnected: 'Bağlantı koptu. 2 dakika içinde yeniden bağlanabilirsin.',
    reconnecting: 'Sunucuya yeniden bağlanılıyor...',
    emptyChat: 'Henüz telsiz mesajı yok. Tartışmayı başlatabilirsin.',
    roomFull: 'Bu oda şu an dolu.',
  },
  privacy: {
    title: 'Anonimlik, Veri ve Ses Bilgisi',
    bullets: [
      'Hesap, e-posta, telefon numarası veya sosyal medya profili istenmez.',
      'Her maç için geçici bir oyuncu kimliği ve rastgele denizci rumuzu üretilir; maç sonrası kalıcı profil oluşturulmaz.',
      'Gizli roller ve oylar yalnızca sunucuda tutulur; başka oyuncuların istemcisine gönderilmez.',
      'Yazılı sohbet geçmişi maç bittiğinde temizlenir ve geçici oda kayıtları otomatik silinir.',
      'Bu uygulama reklam pikseli veya takip analitiği kullanmaz. Yine de sunucu bağlantısı ve barındırma altyapısı standart ağ isteklerini geçici olarak işleyebilir.',
    ],
    voiceTitle: 'Sesli Sohbet İşleyişi',
    voiceEnabledText:
      'Sesli sohbet açıksa ses akışı LiveKit üzerinden canlı iletilir. Ses kaydı veya otomatik ses-metin dökümü (transkripsiyon) yapılmaz. Mikrofon iznini reddedersen oyundan atılmazsın, yazılı sohbetle devam edersin.',
    voiceDisabledText:
      'Bu sunucuda LiveKit anahtarları tanımlanmadığı için sesli sohbet devre dışıdır. Ses kaydı veya mikrofon aktarımı yapılmaz; tüm oyun yazılı sohbetle oynanır.',
  },
};

export const translations: Record<LocaleCode, TranslationDictionary> = {
  tr,
};

export function getDictionary(locale: LocaleCode = 'tr'): TranslationDictionary {
  return translations[locale] ?? tr;
}
