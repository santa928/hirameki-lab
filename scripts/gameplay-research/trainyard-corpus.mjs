/** Offline/cached trainyard corpus. Independent of the application engine. */
export function buildTrainCorpus(n, capacity, sidingCount = 2, limit = 20000) {
  const clone = s => ({ input: [...s.input], sidings: s.sidings.map(a => [...a]), dispatched: s.dispatched });
  const encode = s => JSON.stringify([s.input, s.sidings, s.dispatched]);
  const goal = { input: [], sidings: Array.from({ length: sidingCount }, () => []), dispatched: n };
  const nodes = [{ state: goal, parent: -1, action: null, depth: 0 }];
  const seen = new Set([encode(goal)]);
  for (let at = 0; at < nodes.length; at++) {
    const s = nodes[at].state;
    // Each generated state is a PREDECESSOR of s. action plays forward back to s.
    const add = (state, action) => {
      const signature = encode(state);
      if (seen.has(signature)) return;
      if (nodes.length >= limit) throw Error(`Train corpus exceeds ${limit} states: ${n}/${capacity}/${sidingCount}`);
      seen.add(signature);
      nodes.push({ state, parent: at, action, depth: nodes[at].depth + 1 });
    };
    if (s.dispatched > 0) {
      let z = clone(s);
      z.input.unshift(z.dispatched--);
      add(z, { from: 'in', to: 'out' });
      for (let i = 0; i < sidingCount; i++) if (s.sidings[i].length < capacity) {
        z = clone(s);
        z.sidings[i].push(z.dispatched--);
        add(z, { from: i, to: 'out' });
      }
    }
    for (let i = 0; i < sidingCount; i++) if (s.sidings[i].length) {
      let z = clone(s);
      z.input.unshift(z.sidings[i].pop());
      add(z, { from: 'in', to: i });
      for (let j = 0; j < sidingCount; j++) if (j !== i && s.sidings[j].length < capacity) {
        z = clone(s);
        z.sidings[j].push(z.sidings[i].pop());
        add(z, { from: j, to: i });
      }
    }
  }
  const puzzles = [];
  for (let at = 0; at < nodes.length; at++) {
    const { state: s, depth } = nodes[at];
    // Never give credit for pre-dispatched cars. Require a genuine partly loaded yard.
    if (s.dispatched !== 0 || !s.input.length || !s.sidings.some(a => a.length)) continue;
    const solution = [];
    // Do not reverse: these already point from the candidate toward the goal.
    for (let j = at; nodes[j].parent >= 0; j = nodes[j].parent) solution.push(nodes[j].action);
    puzzles.push({
      n, capacity, sidingCount,
      initial: { input: [...s.input], sidings: s.sidings.map(a => [...a]), output: [] },
      minimum: depth,
      minimumExtraMoves: depth - n, // n departures are unavoidable for every candidate.
      solution,
    });
  }
  return { n, capacity, sidingCount, enumeratedStates: nodes.length, puzzles };
}
