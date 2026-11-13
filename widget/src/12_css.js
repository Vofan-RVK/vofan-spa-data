
/* ---------- stíll ---------- */
var CSS = `
.vof {
  --vof-paper: #F2ECDD; --vof-ink: #1F3A5C; --vof-rust: #D2542F;
  --vof-faint: #8FA3BC; --vof-shadow: rgba(31,58,92,0.3);
  font-family: Georgia, "Times New Roman", serif; color: var(--vof-ink);
  background: var(--vof-paper); font-size: 16px; line-height: 1.5;
  container: vof / inline-size; }
/* næturútgáfan tekur sjálfkrafa við þegar vofan.org er í myrku ham */
:root.dark .vof {
  --vof-paper: #141D2B; --vof-ink: #F2ECDD; --vof-rust: #E0653F;
  --vof-faint: #8FA3BC; --vof-shadow: rgba(0,0,0,0.45); }
.vof, .vof *, .vof *::before, .vof *::after { box-sizing: border-box; }
.vof * { margin: 0; padding: 0; border: 0 solid; }
.vof svg { display: block; vertical-align: middle; }
.vof table { border-collapse: collapse; border-spacing: 0; width: 100%; }
.vof button { background-color: transparent; background-image: none;
  font-family: inherit; cursor: pointer; }
.vof a { text-decoration: none; color: inherit; }

/* ---- notkunarflokkar (Tailwind-íhlutir sem viðmótið notar) ---- */
.vof .flex { display: flex; } .vof .grid { display: grid; }
.vof .relative { position: relative; } .vof .absolute { position: absolute; }
.vof .inline-block { display: inline-block; }
.vof .items-center { align-items: center; }
.vof .items-baseline { align-items: baseline; }
.vof .justify-between { justify-content: space-between; }
.vof .justify-center { justify-content: center; }
.vof .flex-col { flex-direction: column; }
.vof .flex-wrap { flex-wrap: wrap; } .vof .flex-nowrap { flex-wrap: nowrap; }
.vof .flex-1 { flex: 1 1 0%; }
.vof .h-full { height: 100%; } .vof .w-full { width: 100%; }
.vof .text-xs { font-size: 12px; line-height: 16px; }
.vof .text-sm { font-size: 14px; line-height: 20px; }
.vof .text-2xl { font-size: 24px; line-height: 32px; }
.vof .text-3xl { font-size: 30px; line-height: 36px; }
.vof .font-bold { font-weight: 700; } .vof .font-semibold { font-weight: 600; }
.vof .italic { font-style: italic; } .vof .uppercase { text-transform: uppercase; }
.vof .tracking-widest { letter-spacing: 0.1em; }
.vof .whitespace-nowrap { white-space: nowrap; }
.vof .p-1 { padding: 4px; } .vof .p-2 { padding: 8px; } .vof .p-4 { padding: 16px; }
.vof .py-1 { padding-top: 4px; padding-bottom: 4px; }
.vof .mt-1 { margin-top: 4px; } .vof .mt-1\.5 { margin-top: 6px; } .vof .mt-2 { margin-top: 8px; }
.vof .mt-3 { margin-top: 12px; } .vof .mt-5 { margin-top: 20px; }
.vof .mt-6 { margin-top: 24px; } .vof .mb-2 { margin-bottom: 8px; }
.vof .mr-1\\.5 { margin-right: 6px; } .vof .pr-2 { padding-right: 8px; }
.vof .mx-auto { margin-left: auto; margin-right: auto; }
.vof .max-w-6xl { max-width: 1152px; }
.vof .tabular-nums { font-variant-numeric: tabular-nums; }
.vof .align-middle { vertical-align: middle; }
.vof .text-left { text-align: left; } .vof .text-right { text-align: right; }
.vof .space-y-2 > * + * { margin-top: 8px; }
.vof .gap-2 { gap: 8px; } .vof .gap-3 { gap: 12px; } .vof .gap-6 { gap: 24px; }
/* vernd gegn þemu gestgjafans: þema vofan.org setur spennuumrykk á allar
   fyrirsagnir í málgjöf (.prose h2 o.s.frv., sértæki 0-1-1 sigur á
   almenna endurstillingunni .vof *) — innan widgetins tilhneigum við
   aftur til núlls og látum eigin flokkastjóra (mt-6, mb-2 …) ráða */
.vof h2, .vof h3, .vof h4, .vof p { margin: 0; }

/* útvalseins spildið (valið kjördæmi): stýrt með flexi, ekki hreiðruðu
   neti — spilið vinstri, hin fimm reitirnir í fastan dálk hægra megin.
   Flexregnurnar eru skýrar en netnálgunin og eiga sér engar
   ráðgátur í sjálfvirkri reitastöðu; á þróngum skjá fellur allt í
   stakan dálk í DOM-röð */
.vof .vof-selrow { display: flex; flex-direction: column; gap: 12px; }
.vof .vof-selmain { display: flex; flex-direction: column; min-width: 0; }
.vof .vof-selcol { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
/* ---- útgáfur eftir BREIDD ÍLÁTSINS (container queries), ekki skjásins:
     widgetið aðlagar sér hvar sem það er sett inn (t.d. 680 px
     dálkur í Ghost-þema jafnar við farsímaútgáfuna) ---- */
@container vof (min-width: 640px) {
  .vof .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .vof .sm\\:p-8 { padding: 32px; }
}
@container vof (min-width: 1024px) {
  .vof .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .vof .lg\\:col-span-2 { grid-column: span 2 / span 2; }
  /* útvalseins spildið: tvöfalda breidd vinstri, fastur dálkur hægra */
  .vof .vof-selrow { flex-direction: row; }
  .vof .vof-selmain { flex: 2 1 0; }
  .vof .vof-selcol { flex: 1 1 0; }
  .vof .vof-selcol > * { flex: 1 1 auto; height: auto; }
  .vof .vof-selmain > * { flex: 1 1 auto; }
}

/* ---- farsímaútgáfa og fest hólf (samþykkt hönnun) ---- */
.vof .vof-sum:empty { display: none; }
@container vof (min-width: 1024px) {
  .vof .vof-darea { display: flex; flex-direction: column; gap: 8px; height: 44px; margin-top: 12px; }
  .vof .vof-darea:has(.vof-sum:empty) { justify-content: center; }
  .vof .vof-desc { flex: 0 0 auto; margin-top: 0 !important; overflow: hidden; }
  .vof .vof-darea:not(:has(.vof-sum:empty)) .vof-desc {
    font-size: 10px; display: -webkit-box; -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
  }
  .vof .vof-sum { margin-top: 0 !important; }
}
@container vof (max-width: 1023px) {
  .vof .vof-mapsvg { height: auto !important; }
  /* Heildarspá á þröngum skjá: bókstafirnir einu stærð minni og
     talnadálkarnir þrýstir þéttari, svo löng flokksheiti
     (Sjálfstæðisflokkur, Framsóknarflokkur) haldi sér á eina línu */
  .vof .vof-heildrow { font-size: 12px; }
  .vof .vof-heildpct { width: 50px !important; }
  .vof .vof-heildthm { width: 44px !important; }
  .vof .vof-ctable { height: auto !important; }
  .vof .vof-ctable td { padding-top: 3px; padding-bottom: 3px; }
  .vof .vof-tiny { padding: 8px !important; }
  .vof .vof-flokrow { grid-template-columns: 1fr !important; row-gap: 3px; }
  .vof .vof-flokdots { margin-left: 15px; gap: 1.5px !important; flex-wrap: nowrap !important; }
  .vof .vof-flokdots > span { width: 9px !important; height: 9px !important; }
  .vof .vof-drow > span:not(.vof-eqdiv) {
    width: 14px !important; height: 14px !important;
    line-height: 14px !important; font-size: 8px !important;
  }
  .vof .vof-drow > .vof-eqdiv { height: 16px !important; }
  .vof .vof-insetwrap { margin-top: 24px; }
  .vof .vof-darea { display: flex; flex-direction: column; gap: 8px; height: 96px; overflow: hidden; margin-top: 12px; }
  .vof .vof-darea:has(.vof-sum:empty) { justify-content: center; }
  .vof .vof-desc { flex: 0 0 auto; margin-top: 0 !important; overflow: hidden; }
  .vof .vof-darea:not(:has(.vof-sum:empty)) .vof-desc {
    font-size: 10px; line-height: 1.4; display: -webkit-box;
    -webkit-line-clamp: 3; -webkit-box-orient: vertical;
  }
  .vof .vof-sum { margin-top: 0 !important; font-size: 12px; line-height: 1.3; }
}

/* ---- þéttur gæludyr (vofn innskot á forsíðu) ---- */
/* spjaldið er pappírsgeypti: eigin blekslitur (#1F3A5C), ekki
   erfður frá gestgjafarsíðunni — í dökku þema síðunnar erfðist
   ljós textalitur sem myndi hverfa á pappír spjaldsins */
/* .vof.vofc-card — samsett vísandi vegna .vof a { color: inherit }
   sem annars yrði sérstakara og yfirskyggi litinn */
/* ENGIN hreyfing við bendil (óskið 13. nóv. 2026): hvorki translate né
   skuggabreyting — spjaldið stendur alveg kyrrt; aðeins er slökkt á
   undirstrikun svo texti fari ekki að skrota við höfnina */
.vof.vofc-card { display: block; text-decoration: none;
  color: var(--vof-ink); margin: 40px 0 0;
  border: 3px double var(--vof-ink); background: var(--vof-paper);
  padding: 12px 14px; box-shadow: 4px 4px 0 var(--vof-shadow); }
.vofc-card:active, .vofc-card:focus, .vofc-card:hover,
.vofc-card * { text-decoration: none; }
.vofc-title { font-size: 16px; font-weight: 700; }
.vofc-rule { margin-top: 6px; }
.vofc-strip { display: flex; flex-wrap: nowrap; gap: 4px 14px;
  margin-top: 10px; font-size: 13px; }
/* þróng útgáfa (farsími): strikan fær að falla í nokkra rauna
   í stað þess að flæða út spjaldinu — spjaldið sjálft er ílátið */
@container vof (max-width: 640px) {
  .vofc-strip { flex-wrap: wrap; row-gap: 6px; }
}
.vofc-item { white-space: nowrap; display: inline-flex;
  align-items: center; gap: 5px; }
.vofc-dot { width: 9px; height: 9px; border-radius: 50%;
  display: inline-block; box-shadow: 1px 1px 0 var(--vof-shadow); }
.vofc-foot { display: flex; justify-content: space-between;
  align-items: baseline; margin-top: 10px; font-size: 12px; font-style: italic; }
.vofc-more { font-style: normal; font-weight: 700; color: var(--vof-rust); }
.vofc-err { border: 3px double var(--vof-ink); background: var(--vof-paper);
  padding: 12px 14px; font-size: 13px; }
`;
var CSS_INJECTED = false;
function injectCSS() {
  if (CSS_INJECTED || typeof document === "undefined") return;
  var st = document.createElement("style");
  st.setAttribute("data-vofan-spa", "1");
  st.textContent = CSS;
  document.head.appendChild(st);
  CSS_INJECTED = true;
}
