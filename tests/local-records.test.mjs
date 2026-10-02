import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateProgress, parseBackup, localRecords, exportBackup, importBackup } from '../lib/local-records.ts';
import { IDBFactory } from 'fake-indexeddb';

const session = (id, overrides = {}) => ({ id, profile: 1, game: 'cubes', mode: 'stage', stage: 1, level: 1, correct: 10, attempted: 10, firstCorrect: 10, hints: 0, seconds: 50, ...overrides });
const a = session('00000000-0000-4000-8000-000000000001');
const b = session('00000000-0000-4000-8000-000000000002', { firstCorrect: 8, hints: 1 });
const file = records => JSON.stringify({ format: 'hirameki-lab', version: 1, exportedAt: new Date().toISOString(), sessions: records });

test('aggregation preserves six profiles, sums, daily counts and best-stage stars', () => {
 const rows = [a, b, session('00000000-0000-4000-8000-000000000003', { profile: 2 }), session('00000000-0000-4000-8000-000000000004', { mode: 'timed', correct: 6, attempted: 8, firstCorrect: 5 })].map((s, i) => ({ session: s, createdAt: Date.UTC(2026, 8, 26 + i) }));
 const p = aggregateProgress(rows, 1);
 assert.equal(p.plays, 3); assert.equal(p.correct, 26); assert.equal(p.stars, 3); assert.equal(p.days, 3); assert.equal(p.games.cubes.best, 6);
 assert.equal(aggregateProgress(rows, 2).plays, 1); assert.equal(aggregateProgress(rows, 6).plays, 0);
});

test('backup rejects malformed, unknown, nonfinite and conflicting records before writes', () => {
 const row = { session: a, createdAt: 1 };
 assert.equal(parseBackup(file([row, row])).length, 1);
 for (const value of ['{}', 'null', 'invalid', file([{ ...row, session: { ...a, game: 'unknown' } }]), file([{ ...row, createdAt: -1 }]), file([{ ...row, session: { ...a, correct: 11 } }]), file([row, { ...row, session: { ...a, hints: 1 } }])]) assert.throws(() => parseBackup(value));
});

test('concurrent saves and repeated imports are idempotent; conflicting imports roll back fully', async () => {
 globalThis.indexedDB = new IDBFactory();
 const store = localRecords(), otherTab = localRecords();
 await Promise.all([store.save(a), otherTab.save(a), store.save(b)]);
 assert.equal((await store.progress(1)).plays, 2);
 const { text: backup, partial } = await exportBackup(store);
 assert.equal(partial, false);
 assert.equal(await importBackup(store, { size: backup.length, text: async () => backup }), 0);
 const extra = session('00000000-0000-4000-8000-000000000005', { profile: 6 });
 await assert.rejects(store.merge([{ session: extra, createdAt: 1 }, { session: { ...a, hints: 1 }, createdAt: 1 }]));
 assert.equal((await store.progress(6)).plays, 0);
 assert.equal((await store.list()).length, 2);
 await assert.rejects(importBackup(store, { size: 33 * 1024 * 1024, text: async () => { throw Error('must not read'); } }));
 const beforeRestore = await store.progress(1);
 globalThis.indexedDB = new IDBFactory();
 const clean = localRecords();
 assert.equal(await importBackup(clean, { size: backup.length, text: async () => backup }), 2);
 assert.deepEqual(await clean.progress(1), beforeRestore);
 assert.equal((await clean.progress(1)).correct, 20);
});

test('unavailable storage can rescue pending records without claiming a full backup', async () => {
 const broken = { list: async () => { throw Error('blocked'); } };
 await assert.rejects(exportBackup(broken));
 const { text, partial } = await exportBackup(broken, [a, a, b]);
 assert.equal(partial, true); assert.equal(parseBackup(text).length, 2);
});
