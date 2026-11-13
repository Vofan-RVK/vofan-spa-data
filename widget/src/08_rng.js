function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function normalFactory(rng) {
  return () => {
    let u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}
function dHondt(votes, seats) {
  const n = votes.length;
  const wins = new Array(n).fill(0);
  for (let s = 0; s < seats; s++) {
    let best = -1, bestQ = -Infinity;
    for (let i = 0; i < n; i++) {
      const q = votes[i] / (wins[i] + 1);
      if (q > bestQ) { bestQ = q; best = i; }
    }
    wins[best]++;
  }
  return wins;
}
function median(a) {
  const b = [...a].sort((x, y) => x - y);
  const m = Math.floor(b.length / 2);
  return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
}
function quantile(a, q) {
  const b = [...a].sort((x, y) => x - y);
  return b[Math.min(b.length - 1, Math.max(0, Math.round(q * (b.length - 1))))];
}

