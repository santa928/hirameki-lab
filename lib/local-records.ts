import { z } from 'zod';
import { sessionSchema, earnedStars, type SessionResult, type Progress } from './progress.ts';
import { japanDay } from './curriculum.ts';

// Parse the session separately because its strict schema intentionally excludes the timestamp.
const storedSchema = z.object({ session: sessionSchema, createdAt: z.number().int().min(0).max(8640000000000000) }).strict();
export type StoredSession = { session: SessionResult; createdAt: number };
const backupSchema = z.object({ format: z.literal('hirameki-lab'), version: z.literal(1), exportedAt: z.string().datetime(), sessions: z.array(storedSchema).max(100000) }).strict();
export interface RecordStore {
  save(session: SessionResult): Promise<void>;
  list(): Promise<StoredSession[]>;
  merge(records: StoredSession[]): Promise<number>;
  progress(profile: number): Promise<Progress>;
}

/** Aggregate immutable sessions using the same sums and best-stage rules as the Sites API. */
export function aggregateProgress(records: StoredSession[], profile: number): Progress {
  const result: Progress = { games: {}, correct: 0, plays: 0, stars: 0, days: 0 };
  const days = new Set<string>();
  for (const { session: s, createdAt } of records) {
    if (s.profile !== profile) continue;
    days.add(japanDay(new Date(createdAt)));
    const g = result.games[s.game] ??= { game: s.game, correct: 0, plays: 0, level: 1, best: 0, stages: {} };
    g.correct += s.correct; g.plays++; g.level = Math.max(g.level, s.level);
    if (s.mode === 'timed') g.best = Math.max(g.best, s.correct);
    const stars = earnedStars(s);
    if (stars) g.stages[s.stage] = Math.max(g.stages[s.stage] || 0, stars);
    result.correct += s.correct; result.plays++;
  }
  result.stars = Object.values(result.games).reduce((sum, g) => sum + Object.values(g.stages).reduce((a, b) => a + b, 0), 0);
  result.days = days.size;
  return result;
}

/** Validate a complete import, reject conflicting IDs, and canonicalize duplicates before any writes. */
export function parseBackup(text: string): StoredSession[] {
  let parsed;
  try { parsed = backupSchema.parse(JSON.parse(text)); }
  catch { throw Error('バックアップの形式が正しくありません。きろくは変更していません。'); }
  const unique = new Map<string, StoredSession>();
  for (const record of parsed.sessions) {
    const prior = unique.get(record.session.id);
    if (prior && JSON.stringify(prior) !== JSON.stringify(record)) throw Error('同じIDに異なるきろくがあります。きろくは変更していません。');
    unique.set(record.session.id, record);
  }
  return [...unique.values()];
}

/** Use IndexedDB transactions to preserve records atomically across retries, tabs, and imports. */
export function localRecords(): RecordStore {
  const open = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(Error('端末の保存領域を利用できません')); return; }
    const request = indexedDB.open('hirameki-local-records-v1', 1);
    let blocked = false;
    request.onupgradeneeded = () => request.result.createObjectStore('sessions', { keyPath: 'session.id' });
    request.onblocked = () => { blocked = true; reject(Error('別のタブを閉じて再試行してください')); };
    request.onsuccess = () => { if (blocked) request.result.close(); else resolve(request.result); };
    request.onerror = () => reject(request.error);
  });
  const notify = () => { if (typeof BroadcastChannel === 'function') { const c = new BroadcastChannel('hirameki-records'); c.postMessage('changed'); c.close(); } };
  const merge = async (input: StoredSession[]): Promise<number> => {
    const records = input.map(r => storedSchema.parse(r));
    const db = await open();
    const added = await new Promise<number>((resolve, reject) => {
      const tx = db.transaction('sessions', 'readwrite'), store = tx.objectStore('sessions');
      let count = 0, conflict = false;
      for (const record of records) {
        const request = store.get(record.session.id);
        request.onsuccess = () => {
          const old = request.result as StoredSession | undefined;
          // Preserve the original timestamp on retries. A conflicting session must never overwrite it.
          if (old && JSON.stringify(old.session) !== JSON.stringify(record.session)) { conflict = true; tx.abort(); }
          else if (!old) { store.add(record); count++; }
        };
      }
      tx.oncomplete = () => { db.close(); resolve(count); };
      tx.onabort = tx.onerror = () => { db.close(); reject(Error(conflict ? '同じIDに異なるきろくがあります。きろくは変更していません。' : '保存できませんでした。きろくは変更していません。')); };
    });
    notify();
    return added;
  };
  const list = async (): Promise<StoredSession[]> => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readonly'), request = tx.objectStore('sessions').getAll();
      tx.oncomplete = () => { db.close(); try { resolve(z.array(storedSchema).parse(request.result)); } catch { reject(Error('端末内のきろくを読み込めません')); } };
      tx.onabort = tx.onerror = () => { db.close(); reject(tx.error || request.error); };
    });
  };
  return { save: async session => { await merge([{ session: sessionSchema.parse(session), createdAt: Date.now() }]); }, list, merge, progress: async profile => aggregateProgress(await list(), profile) };
}

/** Build a portable backup of all profiles without modifying existing storage. */
export async function exportBackup(store: RecordStore, pending: SessionResult[] = []): Promise<{ text: string; partial: boolean }> {
  let stored: StoredSession[], partial = false;
  try { stored = await store.list(); }
  catch (error) { if (!pending.length) throw error; stored = []; partial = true; }
  const unique = new Map(stored.map(r => [r.session.id, r]));
  for (const s of pending) if (!unique.has(s.id)) unique.set(s.id, { session: sessionSchema.parse(s), createdAt: Date.now() });
  const text = JSON.stringify({ format: 'hirameki-lab', version: 1, exportedAt: new Date().toISOString(), sessions: [...unique.values()] });
  if (new Blob([text]).size > 32 * 1024 * 1024 || unique.size > 100000) throw Error('バックアップが上限32MBを超えています。');
  return { text, partial };
}

/** Limit untrusted file size, validate it entirely, then merge in one transaction. */
export async function importBackup(store: RecordStore, file: Pick<File, 'size' | 'text'>): Promise<number> {
  if (file.size > 32 * 1024 * 1024) throw Error('ファイルが大きすぎます（上限32MB）。きろくは変更していません。');
  return store.merge(parseBackup(await file.text()));
}
