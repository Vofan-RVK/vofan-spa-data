/* litastefna: widgetið fylgir ljósu/dökku stellingu vofan.org.
   Risógraf-palléttin í tveimur útgáfum — ljósa er hin samþykktu,
   dökka er „næturútgáfa“ sömu prentlistar: dökkur marinblár
   pappír, rjóma blekur, sami ryðglóinn, ljóskerri flokkalitir
   svo myrku flokkarnir (J, M, V) sökkvi ekki í myrkri. */
var THEME_LIGHT = {
  paper: "#F2ECDD", ink: "#1F3A5C", rust: "#D2542F", faint: "#8FA3BC",
  shadow: "rgba(31,58,92,0.3)", tint: "rgba(31,58,92,0.06)",
  parties: [
    "#8FBF6B", "#E8912D", "#6FA0C7", "#E3C054", "#8E1F1A",
    "#274E77", "#7B4B94", "#E07060", "#2E6B3E", "#9AA5B1",
  ],
};
var THEME_DARK = {
  paper: "#141D2B", ink: "#F2ECDD", rust: "#E0653F", faint: "#8FA3BC",
  shadow: "rgba(0,0,0,0.45)", tint: "rgba(242,236,221,0.05)",
  parties: [
    /* D (Viðreisn) mjög ljós og rísblátt (#A6D8F2) en M (Miðflokkur)
      djúp dökkblágrár (#2E4A68) — Gísli fann þá enn of nána hvor öðrum
      í myrku hamnum (v3.8 ljóskeraningin dugði ekki); nú er bæði
      ljósmerkismunur og litblærarmunur á milli þeirra, og munurinn
      heldur sér jafnvel í túntu kjördæmakortanna */
    /* D (Viðreisn) mjög ljóst rísblátt (#A6D8F2) en M (Miðflokkur)
      sért mið-blátt (#4F7CA3) — helmingi dekkra en D en sárt og glögg
      sjálft á myrka pappírnum; v3.12 gerði M (#2E4A68) of dimmt svo
      það bráðnaði inn í bakgrunninn, en ljósmerkismunur D og M er
      nú rúmlega tvöfaldur og litblærarmunurinn heldur sér í boganum */
    "#8FBF6B", "#E8912D", "#A6D8F2", "#E3C054", "#D95748",
    "#4F7CA3", "#9B6BB4", "#E07060", "#57A06B", "#9AA5B1",
  ],
};
var PAPER = THEME_LIGHT.paper;
var INK = THEME_LIGHT.ink;
var RUST = THEME_LIGHT.rust;
var FAINT = THEME_LIGHT.faint;
var SHADOW = THEME_LIGHT.shadow;
var TINT = THEME_LIGHT.tint;
var PARTY_COLORS = THEME_LIGHT.parties.slice();
var IS_DARK = false;

/* les stellingu gestgjafarsíðunnar (vofan.org skiptir á .dark
   klasanum á rótareglunni) og uppfærer alla litaviðföng */
function applySiteTheme() {
  if (typeof document === "undefined" || !document.documentElement ||
      !document.documentElement.classList) return IS_DARK;
  var dark = document.documentElement.classList.contains("dark");
  if (dark !== IS_DARK) {
    IS_DARK = dark;
    var t = dark ? THEME_DARK : THEME_LIGHT;
    PAPER = t.paper; INK = t.ink; RUST = t.rust; FAINT = t.faint;
    SHADOW = t.shadow; TINT = t.tint; PARTY_COLORS = t.parties.slice();
  }
  return IS_DARK;
}

/* hlýðir á stellingarskipti gestgjafans: MutationObserver á
   klasalistanum á rótareglunni kallar fn eftir hvert skip.
   (vofan.org skiptir á .dark klasanum án endurhleðslu) */
function watchTheme(el, fn) {
  if (typeof MutationObserver === "undefined" ||
      typeof document === "undefined" || !document.documentElement ||
      !el || el.__vofanThemeWatch) return;
  el.__vofanThemeWatch = true;
  var mo = new MutationObserver(function () { fn(); });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
}
const NAT_THRESHOLD = 5;
const SIMS = 3000;
const EQUAL_SEATS = 9;
const NO_SEAT = 9;
const MAP_H = 500;

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

const CONSTITUENCIES = [
  { id: "rvkn", abbr: "RN", name: "Reykjavíkurkjördæmi norður", short: "Reykjavík norður", seats: 9, total: 11, voters: 46073 },
  { id: "rvks", abbr: "RS", name: "Reykjavíkurkjördæmi suður", short: "Reykjavík suður", seats: 9, total: 11, voters: 45584 },
  { id: "sv", abbr: "SV", name: "Suðvesturkjördæmi", seats: 12, total: 14, voters: 69544 },
  { id: "nv", abbr: "NV", name: "Norðvesturkjördæmi", seats: 6, total: 7, voters: 21521 },
  { id: "na", abbr: "NA", name: "Norðausturkjördæmi", seats: 9, total: 10, voters: 29620 },
  { id: "s", abbr: "SU", name: "Suðurkjördæmi", seats: 9, total: 10, voters: 36143 },
];

const PARTIES = [
  "Framsóknarflokkur", "Viðreisn", "Sjálfstæðisflokkur", "Flokkur fólksins",
  "Sósíalistar", "Miðflokkur", "Píratar", "Samfylkingin",
  "Vinsti græn", "Auðir og ógildir",
];
/* kjörbréf flokkanna — röðin er sú sama og í PARTIES */
const LETTERS = ["B", "C", "D", "F", "J", "M", "P", "S", "V", "–"];
