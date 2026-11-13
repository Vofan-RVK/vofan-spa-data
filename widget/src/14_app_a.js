
/* ---------- stýringar og uppsetning ---------- */
var SEED = 20281112;

/* "Uppfært" birtir DAGSETNINGU SEM GÖGNIN ERU SÓTT — ekki dagsetningu
   síðustu könnunar (gögnin liggja kyrr til að nýr púls er liðinn) */
function todayIsl() {
  var d = new Date();
  return islDate(d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0"));
}

/* svífubendill (tooltip) — hefðbundnir HTML-bendlar virka ekki alltaf,
   þess vegna sérsniðinn; settur á <body> svo hann fljúi yfir öllu */
var tipEl = null;
function showTip(text, x, y) {
  if (!tipEl) {
    tipEl = document.createElement("div");
    tipEl.setAttribute("style",
      "position:fixed;border:1px solid;padding:3px 8px;" +
      "font-size:12px;font-family:Georgia,'Times New Roman',serif" +
      ";white-space:nowrap;pointer-events:none;z-index:50;");
    document.body.appendChild(tipEl);
  }
  /* litir endurnýjast í hvert skipti — bendillinn er í skyndiminni */
  tipEl.style.background = PAPER;
  tipEl.style.borderColor = INK;
  tipEl.style.color = INK;
  tipEl.style.boxShadow = "3px 3px 0 " + SHADOW;
  tipEl.style.left = x + "px";
  tipEl.style.top = (y - 12) + "px";
  tipEl.style.transform = "translate(-50%, -100%)";
  tipEl.textContent = text;
  tipEl.style.display = "block";
}
function hideTip() {
  if (tipEl) tipEl.style.display = "none";
}
function dotHover(text) {
  return {
    mouseenter: function (e) { showTip(text, e.clientX, e.clientY); },
    mouseleave: hideTip,
  };
}

/* Full mode — allt viðmótið, gagntekið á hvern sveif í stöðu */
function mountFull(el, opts) {
  var dataUrl = (opts && opts.dataUrl) || DEFAULT_DATA_URL;
  var st = {
    selected: null, selSrc: "main",
    coalition: new Set(),
    data: null, sim: null, detMap: null,
    natTotals: null, natShares: null, drawFor: null, polls: null,
    err: null,
  };

  function toggleCoalition(i) {
    if (st.coalition.has(i)) st.coalition.delete(i);
    else st.coalition.add(i);
    /* aðeins meirihlutahlutirnir uppfærðast — ekki heildaruppteiknun,
       svo síðan ristist ekki (hnútarnir halda sér stað) */
    updateCoalition();
  }
  function pick(cid, src) {
    st.selected = cid;
    st.selSrc = src;
    /* aðeins kortahnitanetið uppfærist — engin heildaruppteiknun,
       svo síðan ristist ekki (sama kerfi og í Meirihlutamyndun) */
    updateSelection();
  }
  function clearSel() {
    st.selected = null;
    updateSelection();
  }

  /* KORTAHNITANET — teiknað út í eitt fall svo hægt sé að skipta
     AÐEINS þessum hluta út þegar kjördæmi er valið (updateSelection),
     ekki öllu viðmótinu — heildaruppteiknun ryður festipunkti vafrans og
     það er það sem gerir það að verkum að widgetinn „ristist“ á farsíma */
  function gridNode(sim, sel, selDr) {
    var polls = st.polls;
    var natTotals = st.natTotals, natShares = st.natShares;
          /* kort + spá — í DOM-röð: aðalkort, höfuðborgarkort,
             kjördæmareitir, Heildarspá. Á skjá setur hnitanetið kortin
             hlið við hlið og reitina í vinstri tveimur dálkum;
             á farsíma fellur allt í eina dálka í DOM-röð */
          return h("div", { class: "grid gap-6 lg:grid-cols-3 vof-mapgrid",
              style: { rowGap: 0, columnGap: 24 } },
            h("div", { class: "lg:col-span-2",
                style: { border: "1px solid " + INK, padding: 8,
                  background: PAPER, position: "relative" } },
              MainMap(sim, st.selected, function (cid) { pick(cid, "main"); }),
              sel && st.selSrc === "main" ? popup(sel, selDr) : null),

            /* höfuðborgarkort — á skjá efst í hægri spáltnni, en á
               farsíma rétt fyrir neðan aðalkortið (vof-insetwrap);
               sprettiglugginn birtist yfir því korti sem smellt var á */
            h("div", { class: "vof-insetwrap", style: { position: "relative" } },
              InsetMap(sim, st.selected, function (cid) { pick(cid, "inset"); }),
              sel && st.selSrc === "inset" ? popup(sel, selDr) : null),

            h("section", { class: "lg:col-span-2 flex flex-col" },
              /* ÞINGMANNAPUNKTAR — reitirnir teygjast (flex-1) svo þetta
                 svæði haldi alltaf sömu hæð og Heildarspá hægra megin;
                 valið kjördæmi stækkar til vinstri og hin fimm liggja
                 í fastan dálki hægra megin (vof-selrow/vof-selcol) */
              h("h2", { class: "mt-6 mb-2 text-sm font-bold uppercase tracking-widest",
                  style: { color: RUST } }, "Þingmenn eftir kjördæmum"),
              sel
                ? h("div", { class: "flex-1 vof-selrow" },
                    h("div", { class: "vof-selmain" },
                      /* útfellt spildi: aðeins titill og þáttatafla —
                         punktaröð valins kjördæmis er á kortasprettiglugganum
                         og sætataölurnar í töflunni, svo spildið passi í
                         sömu hæð og óútfaestir reitir og þingmannaspáinn
                         hreyfist ekki */
                      h("div", { class: "p-2 h-full flex flex-col",
                          style: { border: "1px solid " + INK } },
                        h("div", { class: "flex items-baseline justify-between" },
                          h("span", { class: "text-sm font-bold whitespace-nowrap" },
                            sel.short || sel.name),
                          h("span", { class: "flex items-baseline" },
                            h("span", { class: "text-xs italic whitespace-nowrap",
                                style: { color: FAINT } },
                              sel.seats + "+" + (sel.total - sel.seats) + " sæti"),
                            h("button", { "aria-label": "Loka", on: { click: clearSel },
                                style: { border: "none", background: "none",
                                  cursor: "pointer", color: INK, fontSize: 15,
                                  lineHeight: 1, marginLeft: 8 } }, "✕"))),
                        h("div", { class: "mt-2 flex-1" },
                          ConstitTable(sel, polls, selDr.alloc, selDr.eq)))),
                    h("div", { class: "vof-selcol" },
                      sim.constituencies
                        .filter(function (c) { return c.id !== st.selected; })
                        .map(function (c) {
                          var dr = st.drawFor(c);
                          return SeatDots({
                            tiny: true,
                            onSelect: function () { pick(c.id, "main"); },
                            title: c.short || c.name,
                            subtitle: c.seats + "+" + (c.total - c.seats) + " sæti",
                            allocation: dr.alloc, eq: dr.eq,
                            pollOrder: polls[c.id] });
                        })))
                : h("div", { class: "flex-1 grid gap-3 sm:grid-cols-2",
                    style: { gridAutoRows: "minmax(0, 1fr)" } },
                    sim.constituencies.map(function (c) {
                      var dr = st.drawFor(c);
                      return SeatDots({
                        onSelect: function () { pick(c.id, "main"); },
                        title: c.short || c.name,
                        subtitle: c.seats + "+" + (c.total - c.seats) + " sæti",
                        allocation: dr.alloc, eq: dr.eq,
                        pollOrder: polls[c.id] });
                    }))),

            /* Heildarspá — á skjá neðst í hægri spáltnni, en á farsíma
               á eftir kjördæmareitunum. Vafinn er flex-dálkur og ramminn
               flex-1 svo hann nái alltaf sömu hæð og reitirnir til vinstri */
            h("div", { class: "mt-6 flex flex-col" },
              h("h2", { class: "text-sm font-bold uppercase tracking-widest",
                  style: { color: RUST } }, "Heildarspá"),
              h("div", { class: "mt-2 flex-1",
                  style: { border: "1px solid " + INK, background: PAPER,
                    padding: 12 } },
                sim.national
                  .map(function (r, i) { return { r: r, i: i }; })
                  .sort(function (a, b) {
                    if (a.i === NO_SEAT) return 1;
                    if (b.i === NO_SEAT) return -1;
                    return natShares[b.i] - natShares[a.i];
                  })
                  .map(function (o) {
                    var r = o.r, i = o.i;
                    return h("div", { class: "flex items-center py-1 text-sm",
                        style: { borderBottom: "1px dotted " + FAINT } },
                      h("span", { class: "font-semibold flex-1" },
                        h("span", { class: "mr-1.5 inline-block align-middle",
                            style: { width: 9, height: 9, borderRadius: "50%",
                              background: PARTY_COLORS[i],
                              boxShadow: "1px 1px 0 " + SHADOW } }),
                        r.name),
                      h("span", { class: "tabular-nums",
                          style: { width: 64, textAlign: "left" } }, pct(natShares[i])),
                      h("span", { class: "font-bold tabular-nums",
                          style: { width: 56, textAlign: "right" } },
                        i === NO_SEAT ? "—" : natTotals[i] + " þm"));
                  }))));

  }

  /* VAL KJÖRDÆMIS ÁN RISAR: smellur á kortaflöt (eða ✕-hnappurinn í
     útfelda spjaldinu) skiptir AÐEINS út kortahnitanetinu (vof-mapgrid)
     — haus, þingmannaspá og flokkar halda sér stað, svo vafrinn missir
     aldrei festipunkt og widgetinn hreyfist ekki (farsímaprápið) */
  function updateSelection() {
    if (!st.data || !st.natTotals) return;
    var host = findByClass(el, "vof-mapgrid");
    if (!host) { render(); return; } /* óvænt form — varasvörun */
    var sim = st.sim;
    var sel = st.selected
      ? sim.constituencies.find(function (c) { return c.id === st.selected; })
      : null;
    var selDr = sel ? st.drawFor(sel) : null;
    host.parentNode.replaceChild(gridNode(sim, sel, selDr), host);
  }

  /* MEIRIHLUTAMYNDUN ÁN RISAR: smellur á flokkahnappa eða boga punkta
     uppfæra AÐEINS bogann, samtölulínuna og hnappastílana í stað þess
     að eyða og endurteikna öllu viðmótinu — heildaruppteiknun framkallar
     blik í vaaranum (scroll-stýring missir festipunktinn) sem lítur
     út fyrir að widgetinn „fari á staðinn“ */
  function updateCoalition() {
    if (!st.data || !st.natTotals) return;
    var box = findByClass(el, "vof-archbox");
    if (!box) { render(); return; } /* óvænt form — varasvörun */
    var wrap = findByClass(box, "vof-archwrap");
    if (wrap && wrap.children && wrap.children.length) {
      var newSvg = ParlArch(st.natTotals, st.natShares, st.coalition,
        toggleCoalition, dotHover);
      wrap.replaceChild(newSvg, wrap.children[0]);
    }
    var btnrow = findByClass(box, "vof-btnrow");
    if (btnrow) {
      var order = PARTIES.map(function (_, i) { return i; })
        .filter(function (i) { return i !== NO_SEAT && st.natTotals[i] > 0; })
        .sort(function (a, b) { return st.natShares[b] - st.natShares[a] || a - b; });
      /* VAFRAVIÐVÖRUN: .children er HTMLCollection í alvöru vafra og hefur
         ENGINN fylkjaaðferðir (forEach o.s.frv.) — þess vegna klassísk
         lykkja. Fallbackið „|| []“ dugar ekki: HTMLCollection er satt en
         forEach vantar. (.forEach hér var djúpstæð villa í v3.9: kastar
         villu í vafranum svo samtalan birtist aldrei, en virkar í
         Node-stubbnum þar sem children er venjulegt fylki.) */
      var btns = btnrow.children;
      for (var jx = 0; jx < btns.length; jx++) {
        var bi = order[jx];
        if (bi === undefined) continue;
        applyStyle(btns[jx], flokBtnStyle(bi, st.coalition.has(bi)));
        btns[jx].setAttribute("aria-pressed", st.coalition.has(bi) ? "true" : "false");
      }
    }
    var sum = findByClass(box, "vof-sum");
    if (sum && sum.parentNode) {
      sum.parentNode.replaceChild(coalitionSum(st.coalition, st.natTotals), sum);
    }
  }

  /* LÖGÐ SÆTISÚTKOMA: allar sætatölur viðmótins koma úr einni
     útreikningu á birtu spáhlutföllum (allocateSeats) — d'Hondt +
     108. gr. beint á könnunarblönduna — þannig að þingmenn
     samsvari alltaf "Spá %" í töflunum og summi verður 63 */
  function computeDraws() {
    var det = allocateSeats(st.polls);
    st.detMap = {};
    det.constituencies.forEach(function (d) { st.detMap[d.id] = d; });
    st.drawFor = function (c) {
      var d = st.detMap[c.id];
      return { alloc: d.alloc, eq: d.eq };
    };
    st.natTotals = det.national;
    /* birtarhlutföll eru hin AKVARÐANÖRÐU blönduð tölur úr forecast.json
       (kjördæmaþyngd, eins og "Spá %" í þáttatöflunum) */
    st.natShares = nationalImplied(st.fj);
  }

  /* sprettigluggi yfir valið kjördæmi — sömu löðgu sætatölur og
     alls staðar annars staðar í viðmótinu */
  function popup(sel, selDr) {
    return h("div", {
        style: {
          position: "absolute", top: 10, right: 10, maxWidth: 300,
          background: PAPER, border: "1px solid " + INK,
          boxShadow: "4px 4px 0 " + SHADOW, padding: 12,
        } },
      h("div", { class: "flex items-baseline justify-between" },
        h("span", { class: "text-2xl font-bold", style: { color: RUST } }, sel.abbr),
        h("button", {
            "aria-label": "Loka",
            on: { click: clearSel },
            style: { border: "none", background: "none", cursor: "pointer",
              color: INK, fontSize: 18, lineHeight: 1 } }, "✕")),
      h("div", { class: "text-xs italic", style: { color: FAINT } }, sel.name),
      h("div", { class: "mt-2" },
        SeatDots({ bare: true, allocation: selDr.alloc, eq: selDr.eq,
          pollOrder: st.polls[sel.id] })));
  }

  function render() {
    applySiteTheme();
    var sim = st.sim;
    var sel = st.selected
      ? sim.constituencies.find(function (c) { return c.id === st.selected; })
      : null;
    var selDr = sel ? st.drawFor(sel) : null;
    var polls = st.polls;
    var coalition = st.coalition;
    var natTotals = st.natTotals, natShares = st.natShares;

    /* haus: aðeins „Uppfært“ — titillinn og kjördæmaártalið birtast í
       síðutitli Ghost-síðunnar, ekki í widgetinu sjálfu */
    var subline = [];
    subline.push("Uppfært " + todayIsl());

    el.innerHTML = "";
    el.appendChild(
      h("div", { class: "vof p-4 sm:p-8",
          style: { background: PAPER,
            fontFamily: 'Georgia, "Times New Roman", serif', color: INK },
          on: { click: hideTip } },
        h("div", { class: "relative mx-auto max-w-6xl",
            style: { border: "3px double " + INK, padding: "1.5rem",
              boxShadow: "4px 4px 0 " + SHADOW } },
          /* haus: „Kort“ vinstra megin en „Uppfært“ hægra megin á
             sömu línu — engin sér lína fyrir dagsetninguna */
          h("div", { class: "mt-6 mb-2 flex items-baseline justify-between" },
            h("h2", { class: "text-sm font-bold uppercase tracking-widest",
                style: { color: RUST } }, "Kort"),
            h("span", { class: "text-sm italic", style: { color: FAINT } },
              subline.join(" · "))),

          gridNode(sim, sel, selDr),


          /* ÞINGMANNASPÁ — alls 63 þingmenn í hálfhring, allur breiddar
             innskýtar */
          h("section", { class: "mt-6" },
            h("div", { class: "flex items-baseline justify-between" },
              h("h2", { class: "text-sm font-bold uppercase tracking-widest",
                  style: { color: RUST } }, "Þingmannaspá"),
              h("span", { class: "text-xs italic", style: { color: FAINT } },
                "63 þingmenn")),
            h("div", { class: "mt-2 vof-archbox",
                style: { border: "1px solid " + INK, background: PAPER,
                  padding: 12 } },
              h("div", { class: "vof-archwrap" },
                ParlArch(natTotals, natShares, coalition, toggleCoalition, dotHover)),
              /* MEIRIHLUTAMYNDUN — smelltu á flokkapunkta eða punkt í
                 boganum til að telja samstarfsflokka; þeir flytjast
                 til vinstri í boganum */
              h("div", { class: "mt-6" },
                h("div", { class: "text-xs font-bold uppercase tracking-widest",
                    style: { color: FAINT } }, "Meirihlutamyndun"),
                h("div", { class: "mt-2 flex flex-wrap items-center gap-2 vof-btnrow" },
