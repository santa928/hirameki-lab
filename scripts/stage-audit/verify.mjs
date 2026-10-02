import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { GAMES } from '../../lib/catalog.ts';
import { generateStage, stageCount, stageInfo, coursePhases } from '../../lib/stages.ts';
import { check, optionAnswer, project } from '../../lib/puzzles.ts';
import { taskFingerprint } from '../../lib/stage-selection.ts';

// Regenerate the public production schedule; no generated audit fixture is needed.
const results = [];
for (const category of ['space', 'plane', 'logic', 'number', 'trial']) {
 const profile = await import(`./profiles/${category}.ts`);
 const bodyOf = profile[`${category}QuestionBody`] || taskFingerprint, metrics = profile[`${category}Metrics`];
 for (const game of GAMES.filter(g => g.category === category)) {
  assert.equal(coursePhases(game.id).length, 5);
  const seen = new Set(); let previousTheme = 0, previousMean = 0;
  for (let stage = 1; stage <= stageCount(game.id); stage++) {
   const info = stageInfo(game.id, stage); let score = 0;
   for (let index = 0; index < 10; index++) {
    const p = generateStage(game.id, stage, index), at = `${game.id}/${stage}/${index + 1}`;
    assert.ok(check(p, p.solution), `${at}: witness`);
    if (p.options) assert.equal(p.options.filter((_, i) => check(p, optionAnswer(p, i))).length, 1, `${at}: unique correct option`);
    const body = bodyOf(p), key = createHash('sha256').update(typeof body === 'string' ? body : JSON.stringify(body)).digest('hex');
    assert.ok(!seen.has(key), `${at}: repeated question`); seen.add(key);
    assert.ok(p.level >= (info.theme - 1) * 4 + 1 && p.level <= info.theme * 4, `${at}: theme`);
    score += metrics(p).score;
    if (game.id === 'cubes') { assert.equal(p.solution, p.data.cubes.length, at); assert.ok(p.data.cubes.some(v => v[2] > 0), `${at}: flat pile`); }
    if (['shadow', 'top'].includes(game.id)) assert.deepEqual(p.options[p.solution], project(p.data.cubes, game.id === 'top' ? 'top' : 'front'), at);
    if (game.id === 'rails') assert.notEqual(p.data.start % p.data.n, p.data.end % p.data.n, `${at}: vertical shortcut`);
    if (game.id === 'familytree' && p.level >= 17) assert.ok(p.data.reasoningHops >= 3, at);
    if (game.id === 'rulemachine' && p.level >= 17) assert.ok(['shape', 'color', 'count'].filter(k => (p.data.shift[k] + p.data.shift2[k]) % 3 !== 0).length >= 2, at);
   }
   const mean = score / 10;
   if (info.theme === previousTheme) assert.ok(mean >= previousMean, `${game.id}/${stage}: demand reset`);
   previousMean = mean; previousTheme = info.theme;
  }
  results.push({ id: game.id, stages: stageCount(game.id), questions: seen.size });
  console.log(`${game.id}: ${seen.size} scheduled questions verified`);
 }
}
const summary = { games: results.length, stages: results.reduce((s, g) => s + g.stages, 0), questions: results.reduce((s, g) => s + g.questions, 0), failures: 0 };
assert.equal(summary.games, 120); assert.equal(summary.stages, 8209); assert.equal(summary.questions, 82090);
console.log(JSON.stringify(summary));
