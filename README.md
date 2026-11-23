# Son Sefer

Fırtınada kalan bir feribotta geçen, 6–10 kişilik, gizli roller ve sosyal çıkarım üzerine kurulu online parti oyunu.

## Özellikler ve Varsayımlar

- **Anonim Oyun:** Hesap, e-posta, telefon veya sosyal medya girişi istenmez. Her maç için geçici oyuncu kimliği, rastgele denizci rumuzu ("Sisli Martı", "Paslı Pusula" vb.) ve amblem üretilir.
- **Başarımlar (Denizci Seyir Defteri):** Oyuncuların motive olması için kazanılan rozetler ve maç istatistikleri yalnızca tarayıcıda (`localStorage`) saklanır; sunucuda hesap veya çapraz maç takibi oluşturulmaz.
- **Sunucu Doğrulamalı Gizli Roller:** Roller, ekip oyları ve görev kartları yalnızca sunucuda doğrulanır ve istemciye başka oyuncuların gizli bilgisi gönderilmez.
- **Kriz Kartları:** Yoğun Sis, Bozuk Telsiz ve Acil Onarım krizleri her tur başında duyurulur ve sunucu tarafında uygulanır.
- **İsteğe Bağlı Sesli Sohbet (LiveKit):** `LIVEKIT_URL`, `LIVEKIT_API_KEY` ve `LIVEKIT_API_SECRET` tanımlı değilse sesli sohbet güvenli biçimde devre dışı bırakılır ve oyun baştan sona yazılı sohbetle oynanır.
- **Mimari Notu:** AI Studio çalışma ortamı gereği uygulama Express + WebSocket + React (Vite) tam yığın sunucusu (`server.ts`) olarak yapılandırılmıştır. Paylaşılan kalıcı durum için `SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` tanımlandığında Supabase Postgres adaptörü otomatik devreye girer; tanımlı değilse yerel atomik JSON dosya deposu (`.data/rooms.json`) kullanılır. Çoklu serverless kopyalı Vercel/bulut dağıtımlarında Supabase Postgres kullanımı önerilir.

## Yerel Kurulum

```bash
npm install
cp .env.example .env
npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde açılır.

## Environment Variable'lar (`.env.example`)

- `APP_URL`: Davet linkleri için uygulamanın genel adresi (`http://localhost:3000`).
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: İsteğe bağlı paylaşılan Postgres kalıcılığı için (Service Role anahtarı yalnızca sunucuda okunur).
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`: İsteğe bağlı LiveKit sesli odalar için (API secret yalnızca sunucuda JWT imzalamak için kullanılır; ses kaydı veya transkripsiyon yapılmaz).

## Supabase Kurulumu ve Migration

1. Supabase projesi oluşturun.
2. `supabase/migrations/001_init.sql` dosyasını Supabase SQL Editor üzerinden veya CLI ile (`supabase db push`) çalıştırın.
3. Bu migration; `game_rooms`, `room_players`, `secret_roles`, `secret_actions`, `room_messages`, `room_reports` tablolarını, indeksleri, `anon` erişimini kapatan sıkı RLS politikalarını ve süresi dolan odaları temizleyen `cleanup_expired_rooms()` RPC fonksiyonunu oluşturur.
4. `SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` değişkenlerini sunucu ortamına ekleyin.

## LiveKit Kurulumu (İsteğe Bağlı)

1. LiveKit Cloud veya kendi LiveKit sunucunuzdan `LIVEKIT_URL`, `LIVEKIT_API_KEY` ve `LIVEKIT_API_SECRET` alın.
2. Bu değişkenleri sunucu `.env` / sırlar paneline ekleyin.
3. `/api/voice/token` uç noktası yalnızca oturum belirtecini doğruladıktan sonra kısa ömürlü JWT erişim belirteci üretir; oylama ve görev icrası aşamalarında yayın iznini kapatır.

## Test Komutları

Birim testleri (oyun kuralları + başarımlar):

```bash
npm test
```

Tip kontrolü ve üretim derlemesi:

```bash
npm run lint
npm run build
```

## Vercel / Üretim Dağıtımı

1. Ortam değişkenlerini (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, isteğe bağlı `LIVEKIT_*`) Vercel / barındırma ortamına ekleyin (istemci tarafında gizli anahtar tutmayın).
2. Supabase üzerinde `supabase/migrations/001_init.sql` migration'ını uygulayın.
3. Build komutu olarak `npm run build`, başlatma komutu olarak `npm start` kullanın.
4. Not: Serverless ortamlarda kalıcı WebSocket bağlantıları için yönetilen Realtime/WebSocket katmanı (örn. Supabase Realtime) veya kalıcı Node sunucusu (Cloud Run / Railway / Fly.io) kullanılması önerilir.
