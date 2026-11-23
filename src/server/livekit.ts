import crypto from 'node:crypto';

export function isLiveKitConfigured(): boolean {
  return Boolean(
    process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET
  );
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Generates a short-lived LiveKit access token (HS256 JWT) strictly on the server.
 * Secrets never leave the server.
 */
export function createLiveKitToken(params: {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  canPublish: boolean;
  ttlSeconds?: number;
}): { token: string; url: string; roomName: string } {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!url || !apiKey || !apiSecret) {
    throw new Error('LIVEKIT_NOT_CONFIGURED');
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + (params.ttlSeconds ?? 300);

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    iss: apiKey,
    sub: params.participantIdentity,
    name: params.participantName,
    nbf: now - 5,
    exp,
    jti: crypto.randomUUID(),
    video: {
      room: params.roomName,
      roomJoin: true,
      canPublish: params.canPublish,
      canSubscribe: true,
      canPublishData: false,
    },
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(signingInput)
    .digest();

  const token = `${signingInput}.${base64UrlEncode(signature)}`;
  return { token, url, roomName: params.roomName };
}
