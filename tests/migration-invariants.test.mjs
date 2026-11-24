import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Prevent this hosting migration from silently changing course content or its artwork.
test('the complete stage schedules and principal assets match their reviewed baselines', () => {
 const expected = {
  // #68 replaced 36 tunnelpass seeds to preserve unique questions and difficulty order after allowing translations.
  'lib/stage-seeds.json': 'fe1f117d753c531c52965779b26be9c99f60a84eb8293e02fcf7761b57d02688',
  'lib/stage-outline.json': '2adc5509f2d1cc7acc6c9be4f0276783f0927806c61ca47ce2a3a3c0d3cb5614',
  'public/mascot.png': 'be22cf32bc8f28458b2e800db2a32068f7a78f9f65389027a2b1497c527686c2',
  'public/favicon.svg': '073d18f6ae599bc018df9503b1b4f3d7d859c31d97af4f8bf9335652abd155cf',
 };
 for (const [file, hash] of Object.entries(expected)) assert.equal(createHash('sha256').update(readFileSync(new URL(`../${file}`, import.meta.url))).digest('hex'), hash, file);
});
