import fs from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface PersistenceAdapter {
  readonly mode: 'supabase' | 'local-file';
  loadAll(): Promise<Record<string, unknown>>;
  saveRoom(code: string, roomData: unknown, expiresAt: number): Promise<void>;
  deleteRoom(code: string): Promise<void>;
  cleanupExpired(nowMs: number): Promise<void>;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

class LocalFilePersistence implements PersistenceAdapter {
  readonly mode = 'local-file' as const;
  private filePath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(dataDir = path.resolve(process.cwd(), '.data')) {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.filePath = path.join(dataDir, 'rooms.json');
  }

  private readRaw(): Record<string, { data: unknown; expiresAt: number }> {
    try {
      if (!fs.existsSync(this.filePath)) return {};
      const content = fs.readFileSync(this.filePath, 'utf8');
      if (!content.trim()) return {};
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private writeRaw(store: Record<string, { data: unknown; expiresAt: number }>): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      const tmp = `${this.filePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(store), 'utf8');
      fs.renameSync(tmp, this.filePath);
    });
    return this.writeQueue;
  }

  async loadAll(): Promise<Record<string, unknown>> {
    const raw = this.readRaw();
    const now = Date.now();
    const result: Record<string, unknown> = {};
    for (const [code, entry] of Object.entries(raw)) {
      if (entry && entry.expiresAt > now) {
        result[code] = entry.data;
      }
    }
    return result;
  }

  async saveRoom(code: string, roomData: unknown, expiresAt: number): Promise<void> {
    const raw = this.readRaw();
    raw[code] = { data: roomData, expiresAt };
    await this.writeRaw(raw);
  }

  async deleteRoom(code: string): Promise<void> {
    const raw = this.readRaw();
    if (code in raw) {
      delete raw[code];
      await this.writeRaw(raw);
    }
  }

  async cleanupExpired(nowMs: number): Promise<void> {
    const raw = this.readRaw();
    let changed = false;
    for (const [code, entry] of Object.entries(raw)) {
      if (!entry || entry.expiresAt <= nowMs) {
        delete raw[code];
        changed = true;
      }
    }
    if (changed) {
      await this.writeRaw(raw);
    }
  }
}

class SupabasePersistence implements PersistenceAdapter {
  readonly mode = 'supabase' as const;
  private client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async loadAll(): Promise<Record<string, unknown>> {
    const { data, error } = await this.client
      .from('game_rooms')
      .select('code, state_snapshot, expires_at')
      .gt('expires_at', new Date().toISOString());

    if (error || !data) {
      return {};
    }
    const result: Record<string, unknown> = {};
    for (const row of data) {
      if (row.code && row.state_snapshot) {
        result[row.code] = row.state_snapshot;
      }
    }
    return result;
  }

  async saveRoom(code: string, roomData: unknown, expiresAt: number): Promise<void> {
    const phase =
      typeof roomData === 'object' && roomData !== null && 'phase' in roomData
        ? String((roomData as { phase: unknown }).phase)
        : 'LOBBY';
    await this.client.from('game_rooms').upsert(
      {
        code,
        phase,
        state_snapshot: roomData,
        updated_at: new Date().toISOString(),
        expires_at: new Date(expiresAt).toISOString(),
      },
      { onConflict: 'code' }
    );
  }

  async deleteRoom(code: string): Promise<void> {
    await this.client.from('game_rooms').delete().eq('code', code);
  }

  async cleanupExpired(): Promise<void> {
    await this.client.from('game_rooms').delete().lt('expires_at', new Date().toISOString());
  }
}

export function createPersistenceAdapter(): PersistenceAdapter {
  if (isSupabaseConfigured()) {
    return new SupabasePersistence(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return new LocalFilePersistence();
}
