function simulate(polls, sigmaNat, sigmaDist, seed) {
  const rng = mulberry32(seed);
  const normal = normalFactory(rng);
  const P = PARTIES.length;
  const C = CONSTITUENCIES.length;

  const distSeatSamples = CONSTITUENCIES.map(() => PARTIES.map(() => []));
  const eqDistSamples = CONSTITUENCIES.map(() => PARTIES.map(() => []));
  const totalSeatSamples = PARTIES.map(() => []);
  const eqSeatSamples = PARTIES.map(() => []);
  const natSamples = PARTIES.map(() => []);
  const distShareSamples = CONSTITUENCIES.map(() => PARTIES.map(() => []));

  for (let s = 0; s < SIMS; s++) {
    /* v3.1: villunar í hverju sýnutaki eru hópaðar með NÚLLSUMMU —
       sveifla flokks kemur úr höndum annarra flokka, svo
       heildarhlutföll (100%) fást ávalt og klipping í núlli skeikkar
       ekki lengur miðsætu hlutöllum smáa flokka upp og stórra niður.
       Landsvilla (natErr) á allan Alþingi, kjördæmavilla (distErr)
       í hverju kjördæmi fyrir sig. */
    const natErr = [];
    let natSum = 0;
    for (let i = 0; i < P; i++) { const e = normal() * sigmaNat; natErr.push(e); natSum += e; }
    for (let i = 0; i < P; i++) natErr[i] -= natSum / P;

    const shares = [];
    const votesC = [];
    const natVotes = new Array(P).fill(0);
    let allVotes = 0;
    for (let c = 0; c < C; c++) {
      const cId = CONSTITUENCIES[c].id;
      const distErr = [];
      let distSum = 0;
      for (let i = 0; i < P; i++) { const e = normal() * sigmaDist; distErr.push(e); distSum += e; }
      for (let i = 0; i < P; i++) distErr[i] -= distSum / P;
      const row = [];
      let tot = 0;
      for (let i = 0; i < P; i++) {
        const v = Math.max(0, polls[cId][i] + natErr[i] + distErr[i]);
        row.push(v);
        tot += v;
      }
      const share = row.map((v) => (v / tot) * 100);
      shares.push(share);
      const w = CONSTITUENCIES[c].voters;
      votesC.push(share.map((sh) => (sh / 100) * w));
      for (let i = 0; i < P; i++) natVotes[i] += (share[i] / 100) * w;
      allVotes += w;
    }
    const natShare = natVotes.map((v) => (v / allVotes) * 100);
    /* 5% reglan (31. gr. stjórnarskrár / 108. gr.) gildir AÐEINS
       jöfnunarsæti: flokkur undir þröskuldinum á landsvísu fær samt
       kjördæmassæti þar sem hann er sterkur */
    const qualified = natShare.map((sh, i) => i !== NO_SEAT && sh >= NAT_THRESHOLD);

    const totals = new Array(P).fill(0);
    const winsByC = [];
    for (let c = 0; c < C; c++) {
      const vq = votesC[c].map((v, i) => (i !== NO_SEAT ? v : 0));
      const wins = dHondt(vq, CONSTITUENCIES[c].seats);
      winsByC.push(wins);
      for (let i = 0; i < P; i++) {
        totals[i] += wins[i];
        distSeatSamples[c][i].push(wins[i]);
      }
    }

    /* Jöfnunarsæti eftir 108. gr. kosningalaga: landstala hvers lista er
       atkvæði á landsvísu deilt með (kjördæmissæti + 1, + 2 o.s.frv.);
       níu hæstu landstölur fá sætin. Hvert sæti fer í kjördæmi með
       jöfnunarsæti eftir þar sem hlutfallstala listsins er hæst, þ.e.
       fylgi í kjördæmi deilt með (kjörnir þingmenn + 1). */
    const eqWins = new Array(P).fill(0);
    const eqInC = CONSTITUENCIES.map(() => new Array(P).fill(0));
    const eqLeft = CONSTITUENCIES.map((c) => c.total - c.seats);
    const cand = [];
    for (let i = 0; i < P; i++) {
      if (!qualified[i]) continue;
      for (let k = 1; k <= EQUAL_SEATS; k++)
        cand.push({ i, v: natVotes[i] / (totals[i] + k) });
    }
    cand.sort((a, b) => b.v - a.v);
    for (let n = 0; n < EQUAL_SEATS && n < cand.length; n++) {
      const i = cand[n].i;
      let bestC = -1, bestT = -1;
      for (let c = 0; c < C; c++) {
        if (eqLeft[c] <= 0) continue;
        const t = shares[c][i] / 100 / (winsByC[c][i] + eqInC[c][i] + 1);
        if (t > bestT) { bestT = t; bestC = c; }
      }
      if (bestC < 0) break;
      eqLeft[bestC]--;
      eqInC[bestC][i]++;
      eqWins[i]++;
    }
    for (let i = 0; i < P; i++) {
      totals[i] += eqWins[i];
      eqSeatSamples[i].push(eqWins[i]);
    }
    for (let c = 0; c < C; c++)
      for (let i = 0; i < P; i++) eqDistSamples[c][i].push(eqInC[c][i]);

    for (let i = 0; i < P; i++) {
      totalSeatSamples[i].push(totals[i]);
      natSamples[i].push(natShare[i]);
    }
    for (let c = 0; c < C; c++)
      for (let i = 0; i < P; i++) distShareSamples[c][i].push(shares[c][i]);
  }

  return {
    constituencies: CONSTITUENCIES.map((c, ci) => ({
      ...c,
      parties: PARTIES.map((name, i) => ({
        name,
        poll: polls[c.id][i],
        seats: median(distSeatSamples[ci][i]),
        p10: quantile(distSeatSamples[ci][i], 0.05),
        p90: quantile(distSeatSamples[ci][i], 0.95),
        share: median(distShareSamples[ci][i]),
      })),
      eqParties: PARTIES.map((name, i) => ({
        name,
        seats: median(eqDistSamples[ci][i]),
      })),
      seatSamples: distSeatSamples[ci],
      eqSeatSamples: eqDistSamples[ci],
      shareSamples: distShareSamples[ci],
    })),
    national: PARTIES.map((name, i) => ({
      name,
      seats: median(totalSeatSamples[i]),
      p10: quantile(totalSeatSamples[i], 0.05),
      p90hi: quantile(totalSeatSamples[i], 0.95),
      eqSeats: median(eqSeatSamples[i]),
      eqSamples: eqSeatSamples[i],
      share: median(natSamples[i]),
      crossProb: (() => {
        let hits = 0;
        for (const s of natSamples[i]) if (s >= NAT_THRESHOLD) hits++;
        return (hits / natSamples[i].length) * 100;
      })(),
      samples: totalSeatSamples[i],
    })),
  };
}

/* v3.2: LÖGÐ SÆTISÚTKOMA — þingmannatölur alls viðmótsins eru reiknaðar
   BEINT úr birtu spáhlutföllum (könnunarblöndunni, "Spá %"), ekki úr
   sýnatökum, svo sætin samsvari ávalt hlutföllum í töflunum:
   d'Hondt fyrir kjördæmassæti (allir flokkar, enginn þröskuldur) og
   108. gr. fyrir jöfnunarsætin níu, þar sem 5% landsþröskuldurinn
   gildir aðeins jöfnunarsæti. Sýnatökurnar lifa áfram fyrir
   óvissumörkin (líkurdálka og punkta í Þingmenn eftir flokkum). */
function allocateSeats(polls) {
  const P = PARTIES.length;
  const C = CONSTITUENCIES.length;
  const votesC = CONSTITUENCIES.map((c, ci) =>
    polls[c.id].map((sh) => (sh / 100) * c.voters));
  const natVotes = new Array(P).fill(0);
  let allVotes = 0;
  for (let c = 0; c < C; c++) {
    for (let i = 0; i < P; i++) natVotes[i] += votesC[c][i];
    allVotes += CONSTITUENCIES[c].voters;
  }
  const natShare = natVotes.map((v) => (v / allVotes) * 100);
  const qualified = natShare.map((sh, i) => i !== NO_SEAT && sh >= NAT_THRESHOLD);

  const totals = new Array(P).fill(0);
  const winsByC = [];
  for (let c = 0; c < C; c++) {
    const vq = votesC[c].map((v, i) => (i !== NO_SEAT ? v : 0));
    const wins = dHondt(vq, CONSTITUENCIES[c].seats);
    winsByC.push(wins);
    for (let i = 0; i < P; i++) totals[i] += wins[i];
  }

  /* jöfnunarsæti eftir 108. gr. — sömu regla og í sýnatökunum */
  const eqWins = new Array(P).fill(0);
  const eqInC = CONSTITUENCIES.map(() => new Array(P).fill(0));
  const eqLeft = CONSTITUENCIES.map((c) => c.total - c.seats);
  const cand = [];
  for (let i = 0; i < P; i++) {
    if (!qualified[i]) continue;
    for (let k = 1; k <= EQUAL_SEATS; k++)
      cand.push({ i, v: natVotes[i] / (totals[i] + k) });
  }
  cand.sort((a, b) => b.v - a.v);
  for (let n = 0; n < EQUAL_SEATS && n < cand.length; n++) {
    const i = cand[n].i;
    let bestC = -1, bestT = -1;
    for (let c = 0; c < C; c++) {
      if (eqLeft[c] <= 0) continue;
      const t = polls[CONSTITUENCIES[c].id][i] / (winsByC[c][i] + eqInC[c][i] + 1);
      if (t > bestT) { bestT = t; bestC = c; }
    }
    if (bestC < 0) break;
    eqLeft[bestC]--;
    eqInC[bestC][i]++;
    eqWins[i]++;
  }
  for (let i = 0; i < P; i++) totals[i] += eqWins[i];
  return {
    constituencies: CONSTITUENCIES.map((c, ci) => ({ id: c.id, alloc: winsByC[ci], eq: eqInC[ci] })),
    national: totals,
    natShare: natShare,
  };
}
