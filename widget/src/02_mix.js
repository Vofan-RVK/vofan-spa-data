/* litablanda: opakt prentlita blanda flokks og pappírs */
function mixHex(hex, paperHex, t) {
  const h = (s) => [
    parseInt(s.slice(1, 3), 16),
    parseInt(s.slice(3, 5), 16),
    parseInt(s.slice(5, 7), 16),
  ];
  const a = h(hex), b = h(paperHex);
  const c = a.map((v, i) => Math.round(v * t + b[i] * (1 - t)));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}
/* stærsti flokkur í kjördæmi (miðsætuhlutfall, "Auðir og ógildir" undanskilið) */
function leaderOf(constit) {
  let best = -1;
  constit.parties.forEach((p, i) => {
    if (i !== NO_SEAT && (best < 0 || p.share > constit.parties[best].share)) best = i;
  });
  return best;
}

