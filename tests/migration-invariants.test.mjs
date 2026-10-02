import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Prevent this hosting migration from silently changing course content or its artwork.
test('the original complete stage schedules and principal assets remain byte-identical', () => {
 const expected = {
  'lib/stage-seeds.json': '42d62f0feaef6d097a0af8be9ca14a82cd0bc9b50d28f8af68251ed93419928c',
  'lib/stage-outline.json': '2adc5509f2d1cc7acc6c9be4f0276783f0927806c61ca47ce2a3a3c0d3cb5614',
  'public/mascot.png': 'be22cf32bc8f28458b2e800db2a32068f7a78f9f65389027a2b1497c527686c2',
  'public/favicon.svg': '073d18f6ae599bc018df9503b1b4f3d7d859c31d97af4f8bf9335652abd155cf',
 };
 for (const [file, hash] of Object.entries(expected)) assert.equal(createHash('sha256').update(readFileSync(new URL(`../${file}`, import.meta.url))).digest('hex'), hash, file);
});
