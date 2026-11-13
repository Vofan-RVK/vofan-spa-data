const PAPER = "#F2ECDD";
const INK = "#1F3A5C";
const RUST = "#D2542F";
const FAINT = "#8FA3BC";

const NAT_THRESHOLD = 5;
const SIMS = 3000;
const EQUAL_SEATS = 9;
const NO_SEAT = 9;
const MAP_H = 500;

const PARTY_COLORS = [
  "#8FBF6B", "#E8912D", "#6FA0C7", "#E3C054", "#8E1F1A",
  "#274E77", "#7B4B94", "#E07060", "#2E6B3E", "#9AA5B1",
];

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
