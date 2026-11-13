                  PARTIES.map(function (_, i) { return i; })
                    .filter(function (i) { return i !== NO_SEAT && natTotals[i] > 0; })
                    .sort(function (a, b) { return natShares[b] - natShares[a] || a - b; })
                    .map(function (i) {
                      var on = coalition.has(i);
                      return h("button", {
                          "aria-pressed": on ? "true" : "false",
                          on: { click: function () { toggleCoalition(i); } },
                          style: flokBtnStyle(i, on) },
                        LETTERS[i]);
                    })),
                /* Lýsing + samtölulína (vof-darea): fast hólf á öllum skjám
                   svo Þingmannaspá-kassinn hreyfist aldrei */
                h("div", { class: "vof-darea" },
                  h("div", { class: "mt-2 text-xs italic vof-desc",
                      style: { color: FAINT } },
                    "Myndaðu þinn eigin meirihluta á þingi. Ýttu á bókstaf flokksins til að bæta honum við í meirihluta. Meirihluti á Alþingi þarf að minnsta kosti 32 þingmenn."),
                  coalitionSum(coalition, natTotals))))),

          /* ÞINGMENN EFTIR FLOKKUM — vinstri röðuð punktaröð fyrir hvern
             flokk: heill punktur = >99% líkur á a.m.k. þeim fjölda.
             FJÓGUR litstig með stökkum falli milli stiga: 75%+, 50%+
             og 25%+ — allt undir 25% líkum er fellt niður.
             Bendill sýnir fjölda og líkur. */
          h("section", { class: "mt-6" },
            h("h2", { class: "text-sm font-bold uppercase tracking-widest",
                style: { color: RUST } }, "Þingmenn eftir flokkum"),
            h("div", { class: "mt-3 space-y-2",
                style: { border: "1px solid " + INK, background: PAPER,
                  padding: 12 } },
              sim.national
                .map(function (r, i) { return { r: r, i: i }; })
                .filter(function (x) { return x.i !== NO_SEAT; })
                .sort(function (a, b) { return b.r.share - a.r.share; })
                .map(function (o) { return flokRow(o.r, o.i); }))))));
  }

  /* einn punktur í "Þingmenn eftir flokkum" — pakkað í eigin fall svo
     hver punktur fái sín eigin breytur (loka í lykkju) */
  function makeFlokDot(i, k, solid, geq) {
    var L = geq(k) * 100;
    /* fjögur litstig: heill (>99%), 75%+, 50%+ og 25%+ — tölurnar
       eru fastir blæir með stórum mun á milli svo hvatningin
       milli stiga sjáist greinilega; undir 25% kemur enginn punktur */
    var level = solid ? null : L >= 75 ? 75 : L >= 50 ? 50 : 25;
    var label = solid ? ">99% líkur" : level + "%+ líkur";
    var t = solid ? 1 : level === 75 ? 0.75 : level === 50 ? 0.45 : 0.15;
    var text = k + (k === 1 ? " þingmaður · " : " þingmenn · ") + label;
    var ev = dotHover(text);
    ev.click = function (e) {
      e.stopPropagation();
      showTip(text, e.clientX, e.clientY);
    };
    return h("span", {
      on: ev,
      style: {
        display: "inline-block", width: 12, height: 12, borderRadius: "50%",
        background: solid ? PARTY_COLORS[i] : mixHex(PARTY_COLORS[i], PAPER, t),
        boxShadow: solid ? "1px 1px 0 " + SHADOW : "none",
      } });
  }

  /* röð fyrir einn flokk í "Þingmenn eftir flokkum" */
  function flokRow(r, i) {
    /* líkur á a.m.k. X þingmönnum — hægri endi röðarinnar er hæsta X
       með ≥25% líkum, vinstri endi hæsta X með >99% líkum;
       punktar undir 25% eru fellir niður */
    var n = r.samples.length;
    var sorted = r.samples.slice().sort(function (a, b) { return a - b; });
    function geq(x) {
      var a = 0, b = n;
      while (a < b) {
        var mid = (a + b) >> 1;
        if (sorted[mid] < x) a = mid + 1;
        else b = mid;
      }
      return (n - a) / n;
    }
    var counts = new Map();
    r.samples.forEach(function (s) { counts.set(s, (counts.get(s) || 0) + 1); });
    var xs = Array.from(counts.keys()).sort(function (a, b) { return a - b; });
    var lo = xs[0];
    for (var xi = 0; xi < xs.length; xi++) {
      if (geq(xs[xi]) > 0.99) lo = xs[xi];
      else break;
    }
    var hi = xs[0];
    for (var xj = 0; xj < xs.length; xj++) {
      if (geq(xs[xj]) >= 0.25) hi = xs[xj];
      else break;
    }
    /* einn punktur fyrir HVERT mögulegt sætatölu: punktur nr. k stendur
       fyrir "k þingmenn". Fyrstu `lo` punktar eru fullir (>99% líkur á
       a.m.k. þeim fjölda), hver næsti fær lit sitt af fjórum stigum */
    var dots = [];
    for (var k = 1; k <= hi; k++) {
      dots.push(makeFlokDot(i, k, solidAt(k), geq));
    }
    function solidAt(k) { return k <= lo; }
    return h("div", { class: "grid items-center py-1 vof-flokrow",
        style: { gridTemplateColumns: "1fr 1fr",
          borderBottom: "1px dotted " + FAINT } },
      /* nafn í vinstri helming; punktur nr. 1 byrjar alltaf í miðri
         línunnar fyrir alla flokka */
      h("span", { class: "text-sm font-semibold whitespace-nowrap" },
        h("span", { class: "mr-1.5 inline-block align-middle",
            style: { width: 9, height: 9, borderRadius: "50%",
              background: PARTY_COLORS[i],
              boxShadow: "1px 1px 0 " + SHADOW } }),
        r.name),
      h("div", { class: "flex flex-wrap items-center vof-flokdots",
          style: { gap: 3 } },
        dots,
        dots.length === 0
          ? h("span", { class: "text-xs italic", style: { color: FAINT } }, "0 þm")
          : null));
  }

  /* samtölulína meirihluta (vof-sum) */
  /* stíll flokkahnapps í Meirihlutamyndun — sér fall svo hægt sé að
     endurnýja stílinn hnapp fyrir hnapp án heildaruppteikningar */
  function flokBtnStyle(i, on) {
    return { display: "inline-block", width: 26, height: 26,
      borderRadius: "50%",
      background: on ? PARTY_COLORS[i]
        : mixHex(PARTY_COLORS[i], PAPER, 0.35),
      color: on ? "rgba(242,236,221,0.9)" : INK,
      fontSize: 12, fontWeight: "bold", textAlign: "center",
      lineHeight: "22px",
      border: "2px solid " + (on ? INK : "transparent"),
      boxShadow: on ? "2px 2px 0 " + SHADOW : "none",
      cursor: "pointer", padding: 0 };
  }

  function coalitionSum(coalition, natTotals) {
    var box = h("div", { class: "mt-2 text-sm vof-sum" });
    if (coalition.size === 0) return box; /* tómt — CSS færir lýsinguna í miðju */
    var sel = PARTIES.map(function (_, i) { return i; })
      .filter(function (i) { return coalition.has(i); })
      .sort(function (a, b) { return natTotals[b] - natTotals[a] || a - b; });
    var sum = sel.reduce(function (a, i) { return a + natTotals[i]; }, 0);
    var names = sel.map(function (i) { return PARTIES[i]; });
    var text = names.length === 1 ? names[0]
      : names.slice(0, -1).join(", ") + " og " + names[names.length - 1];
    addKid(box, [
      h("span", { class: "font-semibold" }, text + ":"),
      " ",
      h("span", { class: "font-bold tabular-nums" }, sum + " þingmenn"),
      sum >= 32
        ? h("span", { class: "font-bold", style: { color: RUST } }, " · Meirihluti")
        : h("span", { class: "text-xs italic", style: { color: FAINT } },
            " · " + Math.max(0, 32 - sum) + " vantar"),
    ]);
    return box;
  }

  function renderLoading() {
    el.innerHTML = "";
    el.appendChild(h("div", { class: "vof p-4 sm:p-8",
        style: { background: PAPER,
          fontFamily: 'Georgia, "Times New Roman", serif', color: INK } },
      h("div", { class: "relative mx-auto max-w-6xl",
          style: { border: "3px double " + INK, padding: "1.5rem",
            boxShadow: "4px 4px 0 " + SHADOW } },
        h("div", null, Rule()),
        h("p", { class: "mt-6 text-sm italic", style: { color: FAINT } },
          "Reikna spá …"))));
  }

  function renderError(msg) {
    el.innerHTML = "";
    el.appendChild(h("div", { class: "vof p-4 sm:p-8",
        style: { background: PAPER,
          fontFamily: 'Georgia, "Times New Roman", serif', color: INK } },
      h("div", { class: "relative mx-auto max-w-6xl",
          style: { border: "3px double " + INK, padding: "1.5rem",
            boxShadow: "4px 4px 0 " + SHADOW } },
        h("div", null, Rule()),
        h("p", { class: "mt-6 text-sm" },
          "Ekki tókst að sækja spágögn. ",
          h("span", { class: "italic", style: { color: FAINT } }, msg || "")))));
  }

  renderLoading();
  fetch(dataUrl)
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (fj) {
      st.fj = fj;
      st.data = mapForecast(fj);
      st.polls = st.data.polls;
      /* reikna í næsta slag svo flýtitákn birtist strax */
      setTimeout(function () {
        st.sim = simulate(st.polls, st.data.sigmaNat, st.data.sigmaDist, SEED);
        computeDraws();
        render();
      }, 0);
    })
    .catch(function (e) { renderError(e && e.message); });

  /* endurteikna þegar gestgjafinn skiptir um ljósa/dökku stellingu */
  watchTheme(el, function () { if (st.data) render(); });
}

/* Compact mode — lítill spjaldi fyrir forsíðu: titill, regla,
   bókstafa- og litastrika af landslýsing, fótur og tengill.
   Allur spjaldinn er tengill á fullri spásíðuna. */
function mountCompact(el, opts) {
  var dataUrl = (opts && opts.dataUrl) || DEFAULT_DATA_URL;
  var href = (opts && opts.href) || DEFAULT_HREF;

  var lastFj = null;
  function render(data) {
    applySiteTheme();
    var fj = data;
    lastFj = fj;
    /* sömu akvarðanörðu hlutöll og Heildarspá á spásíðunni */
    var nat = nationalImplied(fj);
    var order = LETTER_ORDER.map(function (_, i) { return i; })
      .sort(function (a, b) { return nat[b] - nat[a] || a - b; });
    var items = order.filter(function (i) { return i !== NO_SEAT; })
      .map(function (i) {
        return h("span", { class: "vofc-item" },
          h("span", { class: "vofc-dot",
              style: { background: PARTY_COLORS[i] } }),
          h("span", { class: "font-bold tabular-nums" }, LETTERS[i]),
          " ",
          h("span", { class: "tabular-nums" }, pct(nat[i])));
      });
    el.innerHTML = "";
    el.appendChild(
      h("a", { class: "vof vofc-card", href: href },
        h("div", { class: "vofc-title" }, "Spálíkan Vofunnar"),
        h("div", { class: "vofc-rule" }, Rule()),
        h("div", { class: "vofc-strip" }, items),
        h("div", { class: "vofc-foot" },
          h("span", { class: "text-xs italic", style: { color: FAINT } },
            "Uppfært " + todayIsl()),
          h("span", { class: "vofc-more" }, "Sjá spána →"))));
  }

  el.innerHTML = "";
  el.appendChild(h("div", { class: "vof", style: { padding: 4 } },
    h("span", { class: "text-sm italic", style: { color: FAINT } },
      "Reikna spá …")));
  fetch(dataUrl)
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(render)
    .catch(function () {
      el.innerHTML = "";
      el.appendChild(h("div", { class: "vof vofc-err" },
        "Ekki tókst að sækja spágögn."));
    });

  /* endurteikna spjaldið þegar stellingin skiptist */
  watchTheme(el, function () { if (lastFj) render(lastFj); });
}

/* ---------- breið útgáfa (data-vofan-spa-wide) ---------- */
/* Widgetið getur brotið sér út úr þröngum efnisdálki gestgjafans
   (t.d. 680 px dálkur Ghost-þema) og miðað sér við 1080 px
   pappírsbreidd síðunnar; mælt í clientWidth svo lóðréttu
   skrunarstöngin raska ekki. Útgáfan sjálf (container queries)
   ræður svo af hinni raunverulegu breidd. */
function applyWide(el) {
  if (!el || el.__vofanWide) return;
  el.__vofanWide = true;
  function fit() {
    var de = document.documentElement;
    var vw = de && de.clientWidth;
    if (!vw) return;
    var p = el.parentNode;
    var pw = p && p.clientWidth;
    if (!pw) return;
    var t = Math.min(vw - 48, 1080);
    /* FARSÍMI/ÞRÖNGUR SKJÁ: ekkert útborð — breidd og jaðrar eru
       núllstillt og spjaldið fylgir eðlilegum flæði síðunnar.
       clientWidth foreldrisins HLÝÐUR undirstriki þemans, og áður
       miðaði útreikningurinn við það: á farsíma fékk spjaldið fast
       breidd + jáðra sem rúðust ofan í efnisrúmmálið og ýtti
       widgetnum 24 px til hægri, út að skjábrún. Þegar markbreiddin
       er ekkert stærri en foreldrið er útborðið augljóslega óþarft. */
    if (t <= pw) {
      el.style.width = "auto";
      el.style.marginLeft = "0px";
      el.style.marginRight = "0px";
      return;
    }
    var m = Math.round((pw - t) / 2);
    el.style.width = t + "px";
    el.style.marginLeft = m + "px";
    el.style.marginRight = m + "px";
  }
  fit();
  if (typeof window !== "undefined" && window.addEventListener)
    window.addEventListener("resize", fit);
}

/* ---------- forritaskil ---------- */
function mount(el, opts) {
  opts = opts || {};
  injectCSS();
  function attr(k) {
    return el && el.getAttribute ? el.getAttribute(k) : null;
  }
  var mode = opts.mode || attr("data-vofan-spa-mode") || attr("data-vofan-spa") || "full";
  var wide = opts.wide !== undefined ? opts.wide : attr("data-vofan-spa-wide");
  if (String(mode) === "compact") mountCompact(el, opts);
  else { if (wide) applyWide(el); mountFull(el, opts); }
}

/* sjálfvirk uppsetning á [data-vofan-spa] stökum */
function autoInit() {
  var nodes = document.querySelectorAll("[data-vofan-spa]");
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    if (n.__vofanSpaDone) continue;
    n.__vofanSpaDone = true;
    mount(n, {
      mode: n.getAttribute("data-vofan-spa-mode") ||
        n.getAttribute("data-vofan-spa") || "full",
      dataUrl: n.getAttribute("data-vofan-spa-data") || undefined,
      href: n.getAttribute("data-vofan-spa-href") || undefined,
      wide: n.getAttribute("data-vofan-spa-wide") || undefined,
    });
  }
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", autoInit);
  else autoInit();
}

var api = {
  mount: mount,
  version: "1.0.0",
  /* fyrir prófanir (Node) */
  simulate: simulate,
  allocateSeats: allocateSeats,
  mapForecast: mapForecast,
  nationalImplied: nationalImplied,
  applySiteTheme: applySiteTheme,
};
if (typeof window !== "undefined") window.VofanSpa = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
