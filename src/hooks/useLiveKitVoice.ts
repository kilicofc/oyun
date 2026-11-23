import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ConnectionState,
  Participant,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  Track,
} from 'livekit-client';

export type VoiceChannel = 'DECK' | 'KACAK';

interface UseLiveKitVoiceOptions {
  enabled: boolean;
  roomCode: string;
  channel: VoiceChannel;
  isMutedPhase: boolean;
  mutedPlayerIds: Set<string>;
  fetchToken: (channel: VoiceChannel) => Promise<{ token: string; url: string; roomName: string }>;
}

export function useLiveKitVoice({
  enabled,
  roomCode,
  channel,
  isMutedPhase,
  mutedPlayerIds,
  fetchToken,
}: UseLiveKitVoiceOptions) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLMediaElement>>(new Map());
  const mutedIdsRef = useRef<Set<string>>(mutedPlayerIds);
  mutedIdsRef.current = mutedPlayerIds;

  // Apply per-player mute changes immediately to attached remote audio tracks
  useEffect(() => {
    for (const [identity, el] of audioElementsRef.current.entries()) {
      el.muted = mutedPlayerIds.has(identity);
    }
  }, [mutedPlayerIds]);

  const cleanupRoom = useCallback(async () => {
    for (const el of audioElementsRef.current.values()) {
      el.remove();
    }
    audioElementsRef.current.clear();

    const current = roomRef.current;
    roomRef.current = null;
    if (current) {
      try {
        await current.disconnect();
      } catch {
        // Ignore cleanup errors
      }
    }
    setConnected(false);
    setConnecting(false);
    setMicActive(false);
    setActiveSpeakers([]);
  }, []);

  // Automatically disconnect when disabled, roomCode changes, or channel switches
  useEffect(() => {
    if (!enabled) {
      cleanupRoom();
    }
    return () => {
      cleanupRoom();
    };
  }, [enabled, roomCode, channel, cleanupRoom]);

  // Enforce automatic microphone mute during secret voting / mission execution phases
  useEffect(() => {
    const room = roomRef.current;
    if (!room || !connected) return;
    if (isMutedPhase && micActive) {
      room.localParticipant
        .setMicrophoneEnabled(false)
        .then(() => setMicActive(false))
        .catch(() => setMicActive(false));
    }
  }, [isMutedPhase, connected, micActive]);

  const createBoundRoom = useCallback(() => {
    const room = new Room({
      adaptiveStream: false,
      dynacast: false,
    });

    room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      if (state === ConnectionState.Connected) {
        setConnected(true);
        setConnecting(false);
      } else if (state === ConnectionState.Connecting || state === ConnectionState.Reconnecting) {
        setConnecting(true);
      } else if (state === ConnectionState.Disconnected) {
        setConnected(false);
        setConnecting(false);
        setMicActive(false);
        setActiveSpeakers([]);
      }
    });

    room.on(
      RoomEvent.TrackSubscribed,
      (track: RemoteTrack, _pub: RemoteTrackPublication, participant: Participant) => {
        if (track.kind !== Track.Kind.Audio) return;
        const prev = audioElementsRef.current.get(participant.identity);
        if (prev) prev.remove();

        const el = track.attach();
        el.autoplay = true;
        el.muted = mutedIdsRef.current.has(participant.identity);
        el.style.display = 'none';
        document.body.appendChild(el);
        audioElementsRef.current.set(participant.identity, el);
      }
    );

    room.on(
      RoomEvent.TrackUnsubscribed,
      (track: RemoteTrack, _pub: RemoteTrackPublication, participant: Participant) => {
        if (track.kind !== Track.Kind.Audio) return;
        track.detach().forEach((el) => el.remove());
        audioElementsRef.current.delete(participant.identity);
      }
    );

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
      setActiveSpeakers(speakers.map((s) => s.identity));
    });

    room.on(RoomEvent.Disconnected, () => {
      setConnected(false);
      setConnecting(false);
      setMicActive(false);
      setActiveSpeakers([]);
    });

    return room;
  }, []);

  const connectWithTimeout = useCallback(async (room: Room, url: string, token: string) => {
    const timeoutMs = 12_000;
    let timerId: number | undefined;
    try {
      await Promise.race([
        room.connect(url, token),
        new Promise<never>((_, reject) => {
          timerId = window.setTimeout(() => {
            reject(new Error('Sesli bağlantı zaman aşımına uğradı. Yazılı telsizle devam edebilirsin.'));
          }, timeoutMs);
        }),
      ]);
    } catch (err) {
      await room.disconnect().catch(() => {});
      throw err;
    } finally {
      if (timerId !== undefined) window.clearTimeout(timerId);
    }
  }, []);

  const connectAndStartMic = useCallback(async () => {
    if (!enabled || connecting) return;
    setVoiceError(null);

    try {
      let room = roomRef.current;
      if (!room || !connected) {
        setConnecting(true);
        const { token, url } = await fetchToken(channel);
        room = createBoundRoom();
        roomRef.current = room;
        await connectWithTimeout(room, url, token);
        setConnected(true);
        setConnecting(false);
      }

      if (!isMutedPhase) {
        await room.localParticipant.setMicrophoneEnabled(true);
        setMicActive(true);
      }
    } catch (err) {
      setConnecting(false);
      setMicActive(false);
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
        setVoiceError('Mikrofon izni verilmedi. Yazılı sohbetle devam edebilirsin.');
      } else {
        setVoiceError(msg || 'Sesli odaya bağlanılamadı. Yazılı telsizi kullanabilirsin.');
      }
    }
  }, [
    enabled,
    connecting,
    connected,
    fetchToken,
    channel,
    isMutedPhase,
    createBoundRoom,
    connectWithTimeout,
  ]);

  const toggleMic = useCallback(async () => {
    if (!enabled) return;
    if (isMutedPhase) return;

    if (!connected || !roomRef.current) {
      await connectAndStartMic();
      return;
    }

    const next = !micActive;
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(next);
      setMicActive(next);
      setVoiceError(null);
    } catch {
      setVoiceError('Mikrofon durumu güncellenemedi.');
    }
  }, [enabled, isMutedPhase, connected, micActive, connectAndStartMic]);

  const joinAudioListener = useCallback(async () => {
    if (!enabled || connected || connecting) return;
    setVoiceError(null);
    try {
      setConnecting(true);
      const { token, url } = await fetchToken(channel);
      const room = createBoundRoom();
      roomRef.current = room;
      await connectWithTimeout(room, url, token);
      setConnected(true);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Sesli odaya bağlanılamadı.');
    } finally {
      setConnecting(false);
    }
  }, [enabled, connected, connecting, fetchToken, channel, createBoundRoom, connectWithTimeout]);

  return {
    connected,
    connecting,
    micActive,
    activeSpeakers,
    voiceError,
    toggleMic,
    joinAudioListener,
    disconnectVoice: cleanupRoom,
  };
}
