import http from 'node:http';
import path from 'node:path';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GameError, GameStore, type ServerRoomState } from './src/server/gameStore';
import { createLiveKitToken, isLiveKitConfigured } from './src/server/livekit';
import { createPersistenceAdapter, isSupabaseConfigured } from './src/server/persistence';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Simple per-IP rate limiting for room creation/join endpoints
const ipRateBuckets = new Map<string, number[]>();
function checkIpRateLimit(ip: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const timestamps = (ipRateBuckets.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) return false;
  timestamps.push(now);
  ipRateBuckets.set(ip, timestamps);
  return true;
}

function extractBearerToken(req: Request): string {
  const header = req.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return '';
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '64kb' }));

  const persistence = createPersistenceAdapter();
  const store = new GameStore(persistence);
  await store.init();

  // WebSocket client registry: code -> Map<playerId, Set<WebSocket>>
  const wsRegistry = new Map<string, Map<string, Set<WebSocket>>>();
  let wssRef: WebSocketServer | null = null;

  const getOnlineCount = (): number => {
    if (!wssRef) return 0;
    let count = 0;
    for (const client of wssRef.clients) {
      if (client.readyState === WebSocket.OPEN) {
        count += 1;
      }
    }
    return count;
  };

  const broadcastRoomState = (room: ServerRoomState) => {
    const roomSockets = wsRegistry.get(room.code);
    if (!roomSockets) return;
    for (const [playerId, sockets] of roomSockets.entries()) {
      const payload = JSON.stringify({
        type: 'state',
        state: store.buildClientPayload(room, playerId),
      });
      for (const ws of sockets) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      }
    }
  };

  store.setBroadcaster(broadcastRoomState);

  // Periodic tick for countdowns, phase auto-advances, chat purging, and expired rooms
  setInterval(() => {
    store.tick().catch((err) => {
      console.error('[tick] error:', err instanceof Error ? err.message : 'unknown');
    });
  }, 1000);

  // Public runtime capabilities (booleans + live online count, never keys)
  app.get('/api/config', (_req: Request, res: Response) => {
    res.json({
      livekitAvailable: isLiveKitConfigured(),
      supabaseConfigured: isSupabaseConfigured(),
      persistenceMode: persistence.mode,
      onlineCount: getOnlineCount(),
      publicRooms: store.listPublicRooms(),
    });
  });

  app.get('/api/rooms', (_req: Request, res: Response) => {
    res.json({ rooms: store.listPublicRooms() });
  });

  app.post('/api/rooms', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip || 'unknown';
      if (!checkIpRateLimit(ip, 15, 60_000)) {
        throw new GameError('Çok fazla oda kurma denemesi. Lütfen biraz bekleyin.', 429);
      }
      const result = await store.createRoom(req.body ?? {});
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/rooms/:code/join', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip || 'unknown';
      if (!checkIpRateLimit(ip, 25, 60_000)) {
        throw new GameError('Çok fazla katılım denemesi. Lütfen biraz bekleyin.', 429);
      }
      const result = await store.joinRoom(String(req.params.code), req.body ?? {});
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/rooms/:code/state', (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = extractBearerToken(req);
      const { room, player } = store.authenticatePlayer(String(req.params.code), token);
      res.json({ state: store.buildClientPayload(room, player.id) });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/rooms/:code/action', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = extractBearerToken(req);
      const { room, player } = store.authenticatePlayer(String(req.params.code), token);
      const { action, payload } = req.body ?? {};
      let state;

      switch (action) {
        case 'TOGGLE_READY':
          state = await store.toggleReady(room.code, player.id);
          break;
        case 'UPDATE_SETTINGS':
          state = await store.updateSettings(room.code, player.id, payload ?? {});
          break;
        case 'KICK_PLAYER':
          state = await store.kickPlayer(room.code, player.id, payload?.targetPlayerId);
          break;
        case 'START_GAME':
          state = await store.startGame(room.code, player.id);
          break;
        case 'ACK_ROLE':
          state = await store.acknowledgeRole(room.code, player.id);
          break;
        case 'PROPOSE_TEAM':
          state = await store.proposeTeam(room.code, player.id, payload?.teamIds);
          break;
        case 'VOTE_TEAM':
          state = await store.voteTeam(room.code, player.id, payload?.accept);
          break;
        case 'PLAY_MISSION_CARD':
          state = await store.playMissionCard(room.code, player.id, payload?.card);
          break;
        case 'NEXT_ROUND':
          state = await store.advanceFromResult(room.code, player.id);
          break;
        case 'PLAY_AGAIN':
          state = await store.playAgain(room.code, player.id);
          break;
        case 'SEND_CHAT':
          state = await store.sendChat(room.code, player.id, payload ?? {});
          break;
        case 'REPORT_PLAYER':
          await store.reportPlayer(
            room.code,
            player.id,
            payload?.targetPlayerId,
            payload?.reason
          );
          state = store.buildClientPayload(room, player.id);
          break;
        default:
          throw new GameError('Bilinmeyen oyun işlemi.', 400);
      }

      res.json({ state });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/voice/token', (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!isLiveKitConfigured()) {
        res.status(503).json({
          enabled: false,
          error: 'Sesli sohbet sunucu ayarları (LiveKit) tanımlanmamış.',
        });
        return;
      }

      const token = extractBearerToken(req);
      const code = String(req.body?.code ?? '');
      const channel = req.body?.channel === 'KACAK' ? 'KACAK' : 'DECK';
      const { room, player } = store.authenticatePlayer(code, token);

      if (!room.settings.voiceEnabled) {
        throw new GameError('Bu odada sesli sohbet kapalı.', 403);
      }

      if (channel === 'KACAK') {
        if (room.roles[player.id] !== 'KACAK') {
          throw new GameError('Kaçak telsiz ses odasına erişim yetkiniz yok.', 403);
        }
        const kacakCount = Object.values(room.roles).filter((r) => r === 'KACAK').length;
        if (kacakCount < 2) {
          throw new GameError('Kaçak telsizi yalnızca 2 Kaçak olduğunda açılır.', 400);
        }
      }

      // Mute automatically during secret voting and mission execution phases
      const isSecretPhase = room.phase === 'TEAM_VOTE' || room.phase === 'MISSION_EXECUTION';
      const lkRoomName =
        channel === 'KACAK' ? `sonsefer-${room.code}-kacak` : `sonsefer-${room.code}-deck`;

      const voiceGrant = createLiveKitToken({
        roomName: lkRoomName,
        participantIdentity: player.id,
        participantName: player.nickname,
        canPublish: !isSecretPhase || channel === 'KACAK',
        ttlSeconds: 300,
      });

      res.json({
        enabled: true,
        ...voiceGrant,
      });
    } catch (err) {
      next(err);
    }
  });

  // Safe error handler (never leaks tokens, roles, or stack traces)
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof GameError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Beklenmeyen bir sunucu hatası oluştu.' });
  });

  if (IS_PROD) {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  wssRef = wss;

  type TrackedSocket = WebSocket & { isAlive?: boolean };
  let lastBroadcastOnline = -1;
  let lastBroadcastRoomsJson = '';

  const broadcastOnlineCount = (force = false) => {
    const onlineCount = getOnlineCount();
    if (!force && onlineCount === lastBroadcastOnline) return;
    lastBroadcastOnline = onlineCount;
    const payload = JSON.stringify({ type: 'presence', onlineCount });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  };

  const broadcastPublicRooms = (force = false) => {
    const rooms = store.listPublicRooms();
    const payload = JSON.stringify({ type: 'rooms', rooms });
    if (!force && payload === lastBroadcastRoomsJson) return;
    lastBroadcastRoomsJson = payload;
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  };

  store.setPublicRoomsBroadcaster(() => broadcastPublicRooms());

  const unbindFromRoom = (ws: WebSocket, code: string, playerId: string) => {
    if (!code || !playerId) return;
    const roomMap = wsRegistry.get(code);
    const playerSockets = roomMap?.get(playerId);
    if (playerSockets) {
      playerSockets.delete(ws);
      if (playerSockets.size === 0) {
        roomMap?.delete(playerId);
        store.markConnection(code, playerId, false).catch(() => {});
      }
    }
  };

  const heartbeat = setInterval(() => {
    let terminatedAny = false;
    for (const client of wss.clients) {
      const tracked = client as TrackedSocket;
      if (tracked.isAlive === false) {
        tracked.terminate();
        terminatedAny = true;
        continue;
      }
      tracked.isAlive = false;
      tracked.ping();
    }
    if (terminatedAny) {
      broadcastOnlineCount();
    }
  }, 25_000);

  wss.on('close', () => {
    clearInterval(heartbeat);
  });

  wss.on('connection', (ws) => {
    const tracked = ws as TrackedSocket;
    tracked.isAlive = true;
    let boundCode = '';
    let boundPlayerId = '';

    broadcastOnlineCount(true);
    ws.send(JSON.stringify({ type: 'rooms', rooms: store.listPublicRooms() }));

    ws.on('pong', () => {
      tracked.isAlive = true;
    });

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg?.type === 'auth') {
          const { room, player } = store.authenticatePlayer(
            String(msg.code ?? ''),
            String(msg.token ?? '')
          );
          if (boundCode && boundPlayerId && (boundCode !== room.code || boundPlayerId !== player.id)) {
            unbindFromRoom(ws, boundCode, boundPlayerId);
          }
          boundCode = room.code;
          boundPlayerId = player.id;

          let roomMap = wsRegistry.get(room.code);
          if (!roomMap) {
            roomMap = new Map();
            wsRegistry.set(room.code, roomMap);
          }
          let playerSockets = roomMap.get(player.id);
          if (!playerSockets) {
            playerSockets = new Set();
            roomMap.set(player.id, playerSockets);
          }
          playerSockets.add(ws);

          await store.markConnection(room.code, player.id, true);
          ws.send(
            JSON.stringify({
              type: 'state',
              state: store.buildClientPayload(room, player.id),
            })
          );
        } else if (msg?.type === 'leave_room') {
          const prevCode = boundCode;
          const prevPlayerId = boundPlayerId;
          unbindFromRoom(ws, prevCode, prevPlayerId);
          boundCode = '';
          boundPlayerId = '';
          if (prevCode && prevPlayerId) {
            await store.leaveRoom(prevCode, prevPlayerId);
          }
        }
      } catch (err) {
        ws.send(
          JSON.stringify({
            type: 'error',
            error: err instanceof GameError ? err.message : 'Bağlantı doğrulaması başarısız.',
          })
        );
      }
    });

    ws.on('close', () => {
      unbindFromRoom(ws, boundCode, boundPlayerId);
      boundCode = '';
      boundPlayerId = '';
      broadcastOnlineCount();
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Son Sefer server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
