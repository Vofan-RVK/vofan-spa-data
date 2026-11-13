
/* ---------- gögn ---------- */
/* Kemur úr vofan-spa-data; raw.githubusercontent.com sendir
   Access-Control-Allow-Origin: * og 5 mínútna skyndiminni. */
var DEFAULT_DATA_URL =
  "https://raw.githubusercontent.com/Vofan-RVK/vofan-spa-data/main/public/forecast.json";
var DEFAULT_HREF = "/spalikan/";

/* bókstafaröð flokkanna í forecast.json; index 9 = "Auðir og ógildir" */
var LETTER_ORDER = ["B", "C", "D", "F", "J", "M", "P", "S", "V", "O"];

function mapForecast(fj) {
  var polls = {};
  var ids = {};
  CONSTITUENCIES.forEach(function (c) {
    var row = fj.constituencies[c.id];
    if (!row) throw new Error("Vantar kjördæmið " + c.id + " í spágögnun");
    ids[c.id] = true;
    polls[c.id] = LETTER_ORDER.map(function (L) {
      var v = Number(row[L]);
      if (!isFinite(v)) throw new Error("Ógilt gildi (" + L + ") fyrir " + c.id);
      return v;
    });
  });
  var unc = fj.uncertainty || {};
  return {
    polls: polls,
    sigmaNat: Number(unc.sigmaNat) || 2.0,
    sigmaDist: Number(unc.sigmaDist) || 1.4,
    lastUpdated: fj.lastUpdated || null,
    electionDate: fj.electionDate || null,
    modelVersion: fj.modelVersion || null,
  };
}

/* landslýsing á kjörum (voters = kjördæmiþung vægi) */
function nationalImplied(fj) {
  var W = 0;
  CONSTITUENCIES.forEach(function (c) { W += c.voters; });
  var out = {};
  LETTER_ORDER.forEach(function (L, i) {
    var s = 0;
    CONSTITUENCIES.forEach(function (c) {
      s += Number(fj.constituencies[c.id][L]) * c.voters;
    });
    out[i] = s / W;
  });
  return out;
}

var ISL_MONTHS = [
  "janúar", "febrúar", "mars", "apríl", "maí", "júní",
  "júlí", "ágúst", "september", "október", "nóvember", "desember",
];
/* "2026-11-03" -> "3. nóvember 2026" */
function islDate(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return iso || "";
  return String(Number(m[3])) + ". " + ISL_MONTHS[Number(m[2]) - 1] + " " + m[1];
}

/* íslensk tölusnið: komma að greini */
function pct(x) {
  return (Math.round(x * 10) / 10).toFixed(1).replace(".", ",") + "%";
}
