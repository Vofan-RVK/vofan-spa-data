
/* ---------- smáhlutir (DOM) ---------- */
var SVG_NS = "http://www.w3.org/2000/svg";

function setAttrs(el, attrs) {
  if (!attrs) return;
  for (var k in attrs) {
    var v = attrs[k];
    if (v == null) continue;
    if (k === "class") el.setAttribute("class", v);
    else if (k === "style") {
      if (typeof v === "string") el.style.cssText = v;
      else for (var s in v) {
        var val = v[s];
        /* tölur fá "px", eins og React gerir (width: 9 -> "9px") */
        if (typeof val === "number") val = val + "px";
        el.style[s] = val;
      }
    } else if (k === "on") {
      for (var e in v) el.addEventListener(e, v[e]);
    } else el.setAttribute(k, String(v));
  }
}
function addKid(el, c) {
  if (c == null || c === false) return;
  if (Array.isArray(c)) { for (var j = 0; j < c.length; j++) addKid(el, c[j]); return; }
  el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
}
function h(tag, attrs) {
  var el = document.createElement(tag);
  setAttrs(el, attrs);
  for (var i = 2; i < arguments.length; i++) addKid(el, arguments[i]);
  return el;
}
function hs(tag, attrs) {
  var el = document.createElementNS(SVG_NS, tag);
  setAttrs(el, attrs);
  for (var i = 2; i < arguments.length; i++) addKid(el, arguments[i]);
  return el;
}

function Rule() {
  return h("div", { style: { borderTop: "2px solid " + INK, borderBottom: "1px solid " + INK, height: 4 } });
}

/* Aðalkort: kjördæmi sem eitt svæði — litur eftir stærsta flokki,
   sameinuð ytri mörk teiknuð OFAN á fyllinguna (engar innri línur).
   Fyllingarnar eru strýkaðar með sama lit svo saumarnar hverfi. */
function MainMap(sim, selected, onSelect) {
  var M = MAP_MAIN, O = M.outl;
  var byId = {};
  sim.constituencies.forEach(function (c) { byId[c.id] = c; });
  function tint(cid) {
    var i = leaderOf(byId[cid]);
    return mixHex(PARTY_COLORS[i], PAPER, selected === cid ? 0.75 : 0.55);
  }
  function fills(cid) {
    return (O[cid] || []).map(function (d) {
      return hs("path", { d: d, fill: tint(cid), "fill-rule": "evenodd",
        stroke: tint(cid), "stroke-width": 10, "stroke-linejoin": "round",
        on: { click: function () { onSelect(cid); } }, style: { cursor: "pointer" } });
    });
  }
  function edge(cid, color, w) {
    return (O[cid] || []).map(function (d) {
      return hs("path", { d: d, fill: "none", stroke: color, "stroke-width": w,
        "stroke-linejoin": "round", "stroke-linecap": "round", "pointer-events": "none" });
    });
  }
  return hs("svg", { viewBox: "0 0 " + M.W + " " + M.H,
      "preserveAspectRatio": "xMidYMin meet", class: "vof-mapsvg",
      style: { width: "100%", height: MAP_H } },
    hs("defs", null,
      hs("pattern", { id: "vof-sea", width: 46, height: 46, patternUnits: "userSpaceOnUse" },
        hs("circle", { cx: 4, cy: 4, r: 1.4, fill: INK, opacity: 0.10 }))),
    hs("rect", { x: 0, y: 0, width: M.W, height: M.H, fill: "url(#vof-sea)" }),
    fills("nv"), fills("na"), fills("s"), fills("sv"), fills("rvkn"), fills("rvks"),
    edge("nv", INK, 8), edge("na", INK, 8), edge("s", INK, 8), edge("sv", INK, 8),
    edge("rvk", INK, 8), edge("rvkn", INK, 8), edge("rvks", INK, 8),
    selected ? edge(selected, RUST, 14) : null
  );
}

/* Aukakort: SV + Reykjavík skipt í norður/suður eftir götumörkum 2024 */
function InsetMap(sim, selected, onSelect) {
  var I = MAP_INSET, O = I.outl;
  var byId = {};
  sim.constituencies.forEach(function (c) { byId[c.id] = c; });
  function tint(cid) {
    var i = leaderOf(byId[cid]);
    return mixHex(PARTY_COLORS[i], PAPER, selected === cid ? 0.75 : 0.55);
  }
  var NEI = mixHex("#9AA5B1", PAPER, 0.28);
  function fills(cid) {
    return (O[cid] || []).map(function (d) {
      return hs("path", { d: d, fill: tint(cid), "fill-rule": "evenodd",
        stroke: tint(cid), "stroke-width": 3, "stroke-linejoin": "round",
        on: { click: function () { onSelect(cid); } }, style: { cursor: "pointer" } });
    });
  }
  function edge(cid, color, w) {
    return (O[cid] || []).map(function (d) {
      return hs("path", { d: d, fill: "none", stroke: color, "stroke-width": w,
        "stroke-linejoin": "round", "stroke-linecap": "round", "pointer-events": "none" });
    });
  }
  return h("div", { style: { border: "1px solid " + INK, padding: 8, background: PAPER } },
    hs("svg", { viewBox: "0 0 " + I.W + " " + I.H,
        "preserveAspectRatio": "xMidYMin meet", class: "vof-mapsvg",
        style: { width: "100%", height: MAP_H } },
      hs("rect", { x: 0, y: 0, width: I.W, height: I.H, fill: TINT }),
      I.ctx.map(function (m) {
        return m.d.map(function (d) {
          return hs("path", { d: d, fill: NEI, stroke: NEI, "stroke-width": 3,
            "stroke-linejoin": "round", "pointer-events": "none" });
        });
      }),
      fills("sv"), fills("rvkn"), fills("rvks"),
      edge("sv", INK, 2.2), edge("rvk", INK, 2.2), edge("rvkn", INK, 2.2), edge("rvks", INK, 2.2),
      selected ? edge(selected, RUST, 3.2) : null
    )
  );
}

/* Þingmannapunktar */
function SeatDots(o) {
  var order = PARTIES.map(function (_, i) { return i; }).sort(function (a, b) {
    if (a === NO_SEAT) return 1;
    if (b === NO_SEAT) return -1;
    var wa = o.pollOrder ? o.pollOrder[a] : o.allocation[a] + (o.eq ? o.eq[a] : 0);
    var wb = o.pollOrder ? o.pollOrder[b] : o.allocation[b] + (o.eq ? o.eq[b] : 0);
    return wb - wa || a - b;
  });
  var dist = [], eqs = [];
  order.forEach(function (i) {
    var name = PARTIES[i];
    for (var k = 0; k < o.allocation[i]; k++)
      dist.push({ name: name, i: i, key: name + "-" + k, j: false });
    var eqn = o.eq ? o.eq[i] : 0;
    for (var k2 = 0; k2 < eqn; k2++)
      eqs.push({ name: name, i: i, key: name + "-j-" + k2, j: true });
  });
  var ds = o.tiny
    ? { w: 10, f: 0, shadow: "1px 1px 0 " + SHADOW, gap: 2 }
    : o.bare
    ? { w: 13, f: 8, shadow: "1px 1px 0 " + SHADOW, gap: 4 }
    : { w: 18, f: 10, shadow: "2px 2px 0 " + SHADOW, gap: 4 };
  function dot(d) {
    return h("span", {
      title: (d.j ? "Jöfnunarsæti: " : "") + d.name,
      style: { display: "inline-block", width: ds.w, height: ds.w, borderRadius: "50%",
        background: PARTY_COLORS[d.i], color: "rgba(242,236,221,0.85)", fontSize: ds.f,
        fontWeight: "bold", textAlign: "center", lineHeight: ds.w + "px", boxShadow: ds.shadow }
    }, o.tiny ? null : LETTERS[d.i]);
  }
  var dotsRow = h("div", {
      class: "flex items-center " + (o.tiny || o.bare ? "flex-nowrap" : "flex-wrap vof-drow"),
      style: { gap: ds.gap } },
    dist.map(dot),
    eqs.length > 0
      ? h("span", { "aria-hidden": "true", class: "vof-eqdiv",
          style: { display: "inline-block", width: 1.5, height: ds.w + 2,
            background: "repeating-linear-gradient(to bottom, " + FAINT + " 0, " + FAINT +
              " 1.5px, transparent 1.5px, transparent 4px)",
            margin: o.tiny ? "0 3px" : "0 5px" } })
      : null,
    eqs.map(dot),
    dist.length === 0 && eqs.length === 0
      ? h("span", { class: "text-xs italic", style: { color: FAINT } }, "engin sæti")
      : null
  );
  /* ber röð (sprettigluggi) */
  if (o.bare) return dotsRow;
  return h("div", {
      class: o.tiny ? "p-1 h-full vof-tiny flex flex-col" : "p-2 h-full flex flex-col",
      on: o.onSelect ? { click: function () { o.onSelect(); } } : null,
      style: { border: "1px solid " + INK, cursor: o.onSelect ? "pointer" : "default" } },
    h("div", { class: "flex items-baseline justify-between" },
      h("span", { class: "text-sm font-bold whitespace-nowrap" }, o.title),
      h("span", { class: "flex items-baseline" },
        h("span", { class: "text-xs italic whitespace-nowrap", style: { color: FAINT } }, o.subtitle),
        o.onClose
          ? h("button", { on: { click: function (e) { e.stopPropagation(); o.onClose(); } },
              "aria-label": "Loka",
              style: { border: "none", background: "none", cursor: "pointer", color: INK,
                fontSize: 15, lineHeight: 1, marginLeft: 8 } }, "✕")
          : null
      )
    ),
    h("div", { class: (o.tiny ? "mt-1 " : "mt-1.5 ") + "flex-1 flex flex-col justify-center" },
      dotsRow)
  );
}

/* ÞINGMANNASPÁ — 63 þingmenn í hálfhring, flokkar í samtengum
   hlutfallsbogum raðaðir eftir spáðu hlutalli */
function ParlArch(totals, shares, coalition, onToggle, dotHover) {
  var inC = function (i) { return coalition && coalition.has(i); };
  var order = PARTIES.map(function (_, i) { return i; }).sort(function (a, b) {
    if (a === NO_SEAT) return 1;
    if (b === NO_SEAT) return -1;
    var ca = inC(a) ? 0 : 1, cb = inC(b) ? 0 : 1;
    return ca - cb || shares[b] - shares[a] || a - b;
  });
  var seats = [];
  order.forEach(function (i) { for (var t = 0; t < totals[i]; t++) seats.push(i); });
  var R = 4, rMin = 200, rMax = 470;
  var radii = [], weights = [];
  for (var k0 = 0; k0 < R; k0++) {
    var r = rMin + (rMax - rMin) * (k0 / (R - 1));
    radii.push(r); weights.push(r);
  }
  var W = weights.reduce(function (a, b) { return a + b; }, 0);
  var exact = weights.map(function (w) { return (seats.length * w) / W; });
  var ns = exact.map(Math.floor);
  var rem = seats.length - ns.reduce(function (a, b) { return a + b; }, 0);
  exact.map(function (e, k) { return [e - ns[k], k]; })
    .sort(function (a, b) { return b[0] - a[0]; })
    .slice(0, Math.max(0, rem))
    .forEach(function (p) { ns[p[1]] += 1; });
  var pos = [];
  for (var k1 = 0; k1 < R; k1++) {
    var n = ns[k1], rr = radii[k1];
    for (var j = 0; j < n; j++) {
      var a = Math.PI - (Math.PI * (j + 0.5)) / n;
      pos.push({ x: 500 + rr * Math.cos(a), y: 500 - rr * Math.sin(a), a: a, k: k1 });
    }
  }
  pos.sort(function (p, q) { return q.a - p.a || p.k - q.k; });
  var dotR = 23;
  return hs("svg", { viewBox: "0 0 1000 530", role: "img",
      "aria-label": "63 þingmenn í hálfhring eftir flokkum",
      style: { width: "90%", height: "auto", display: "block", margin: "8px auto 4px auto" } },
    pos.map(function (p, idx) {
      var i = seats[idx];
      if (i === undefined) return null;
      var shaded = coalition && coalition.size > 0 && !inC(i);
      var attrs = { cx: p.x, cy: p.y, r: dotR,
        fill: shaded ? mixHex(PARTY_COLORS[i], PAPER, 0.4) : PARTY_COLORS[i] };
      var ev = {};
      if (onToggle) { ev.click = function () { onToggle(i); }; attrs.style = { cursor: "pointer" }; }
      if (dotHover) {
        var dh = dotHover(PARTIES[i] + " · " + totals[i] + " þm");
        for (var e in dh) ev[e] = dh[e];
      }
      attrs.on = ev;
      return hs("g", null,
        hs("circle", { cx: p.x + 2, cy: p.y + 2, r: dotR, fill: SHADOW }),
        hs("circle", attrs)
      );
    })
  );
}

/* Tafla fyrir stakt kjördæmi */
function ConstitTable(c, polls, drawAlloc, drawEq) {
  var order = c.parties.map(function (_, i) { return i; }).sort(function (a, b) {
    if (a === NO_SEAT) return 1;
    if (b === NO_SEAT) return -1;
    return polls[c.id][b] - polls[c.id][a] || a - b;
  });
  return h("div", { class: "h-full" },
    h("table", { class: "w-full text-xs h-full vof-ctable" },
      h("thead", null,
        h("tr", { class: "text-xs", style: { color: FAINT } },
          h("th", { class: "text-left font-semibold" }, "Flokkur"),
          h("th", { class: "text-right font-semibold" }, "Spá %"),
          h("th", { class: "text-right font-semibold" }, "Sæti"),
          h("th", { class: "text-right font-semibold" }, "Jfn."),
          h("th", { class: "text-right font-semibold" }, "90% bil"))),
      h("tbody", null,
        order.map(function (i) {
          var p = c.parties[i];
          return h("tr", { style: { borderBottom: "1px dotted " + FAINT } },
            h("td", { class: "pr-2 font-semibold" },
              h("span", { class: "mr-1.5 inline-block align-middle",
                style: { width: 9, height: 9, borderRadius: "50%", background: PARTY_COLORS[i],
                  boxShadow: "1px 1px 0 " + SHADOW } }),
              p.name),
            h("td", { class: "text-right tabular-nums" }, pct(polls[c.id][i])),
            h("td", { class: "text-right font-bold tabular-nums" },
              i === NO_SEAT ? "—" : String(drawAlloc[i])),
            h("td", { class: "text-right tabular-nums", style: { color: RUST } },
              i === NO_SEAT ? "—" : String(drawEq[i])),
            h("td", { class: "text-right text-xs tabular-nums", style: { color: FAINT } },
              i === NO_SEAT ? "—" : p.p10 + "–" + p.p90));
        }))
    )
  );
}
