import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://func-ai-defender.azurewebsites.net/api";

const TALEN = {
  nl: {
    titel: "AI Defender",
    subtitel: "WordPress security scanner by Boei17",
    placeholder: "https://voorbeeld.nl",
    scanKnop: "Scan starten",
    disclaimer: "Alleen passieve, niet-destructieve checks. Scan uitsluitend websites waarbij je toestemming hebt.",
    invoerLabel: "Voer de URL in van de website die je wilt scannen.",
    scanBezig: "Scan bezig...",
    foutUrl: "Voer een geldige URL in, inclusief https://",
    foutScan: "Scan mislukt. Probeer het opnieuw.",
  },
  en: {
    titel: "AI Defender",
    subtitel: "WordPress security scanner by Boei17",
    placeholder: "https://example.com",
    scanKnop: "Start scan",
    disclaimer: "Passive, non-destructive checks only. Only scan websites you have permission to scan.",
    invoerLabel: "Enter the URL of the website you want to scan.",
    scanBezig: "Scanning...",
    foutUrl: "Please enter a valid URL including https://",
    foutScan: "Scan failed. Please try again.",
  },
};

const RISICO_KLEUR = {
  kritiek: "text-red-400",
  hoog: "text-orange-400",
  gemiddeld: "text-yellow-400",
  laag: "text-green-400",
  ok: "text-green-500",
  info: "text-blue-400",
};

const RISICO_BG = {
  kritiek: "bg-red-950 border-red-800",
  hoog: "bg-orange-950 border-orange-800",
  gemiddeld: "bg-yellow-950 border-yellow-800",
  laag: "bg-slate-800 border-slate-700",
  ok: "bg-slate-800 border-slate-700",
};

function ScoreCircle({ score, rating }) {
  var kleur = score >= 85 ? "text-green-400" : score >= 70 ? "text-blue-400" : score >= 50 ? "text-yellow-400" : score >= 30 ? "text-orange-400" : "text-red-400";
  return (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <div className={`text-5xl font-bold ${kleur}`}>{score}</div>
        <div className="text-xs text-slate-400 mt-1">/ 100</div>
      </div>
      <div className={`text-4xl font-bold ${kleur} border-2 rounded-lg w-14 h-14 flex items-center justify-center border-current`}>{rating}</div>
    </div>
  );
}

function Bevinding({ item }) {
  var kleur = RISICO_KLEUR[item.risico] || "text-slate-400";
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-800 last:border-0">
      <span className={`text-xs font-medium uppercase mt-0.5 w-20 shrink-0 ${kleur}`}>{item.risico}</span>
      <div className="flex-1">
        <p className="text-sm text-slate-200">{item.check}</p>
        {item.aanbeveling && <p className="text-xs text-slate-400 mt-0.5">{item.aanbeveling}</p>}
      </div>
    </div>
  );
}

export default function App() {
  var [taal, setTaal] = useState("nl");
  var [url, setUrl] = useState("");
  var [bezig, setBezig] = useState(false);
  var [fout, setFout] = useState("");
  var [resultaat, setResultaat] = useState(null);
  var t = TALEN[taal];

  function isGeldigeUrl(waarde) {
    try { var u = new URL(waarde); return u.protocol === "https:" || u.protocol === "http:"; }
    catch(e) { return false; }
  }

  async function startScan() {
    if (!isGeldigeUrl(url)) { setFout(t.foutUrl); return; }
    setFout("");
    setBezig(true);
    setResultaat(null);
    try {
      var res = await fetch(API_URL + "/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url, taal: taal }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      var data = await res.json();
      setResultaat(data);
    } catch(e) {
      setFout(t.foutScan + " (" + e.message + ")");
    } finally {
      setBezig(false);
    }
  }

  var alleResultaten = resultaat ? Object.values(resultaat.resultaten).flat() : [];
  var kritiek = alleResultaten.filter(function(r) { return r.risico === "kritiek"; });
  var hoog = alleResultaten.filter(function(r) { return r.risico === "hoog"; });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center gap-3">
        <svg className="w-7 h-7 text-sky-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
        </svg>
        <div className="flex-1">
          <h1 className="text-base font-medium text-slate-100">{t.titel}</h1>
          <p className="text-xs text-slate-400">{t.subtitel}</p>
        </div>
        <select value={taal} onChange={function(e) { setTaal(e.target.value); }} className="bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-3 py-1.5 text-sm">
          <option value="nl">Nederlands</option>
          <option value="en">English</option>
        </select>
      </header>
      <main className="flex-1 px-4 pt-8 pb-16 max-w-3xl mx-auto w-full">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          <p className="text-sm text-slate-400 mb-4">{t.invoerLabel}</p>
          <div className="flex gap-3">
            <input type="url" value={url} onChange={function(e) { setUrl(e.target.value); }} onKeyDown={function(e) { if(e.key==="Enter") startScan(); }} placeholder={t.placeholder} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500" />
            <button onClick={startScan} disabled={bezig} className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap">
              {bezig ? t.scanBezig : t.scanKnop}
            </button>
          </div>
          {fout && <p className="mt-3 text-sm text-red-400">{fout}</p>}
          <p className="mt-3 text-xs text-slate-500">{t.disclaimer}</p>
        </div>
        {resultaat && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-slate-200">{resultaat.url}</p>
                  <p className="text-xs text-slate-400">{new Date(resultaat.scanDatum).toLocaleString(taal === "nl" ? "nl-NL" : "en-GB")}</p>
                </div>
                <ScoreCircle score={resultaat.score} rating={resultaat.rating} />
              </div>
              {resultaat.rapport && resultaat.rapport.samenvatting && (
                <p className="text-sm text-slate-300 bg-slate-800 rounded-lg p-4">{resultaat.rapport.samenvatting}</p>
              )}
            </div>
            {(kritiek.length > 0 || hoog.length > 0) && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-sm font-medium text-slate-200 mb-3">Kritieke en hoge bevindingen</h2>
                {kritiek.concat(hoog).map(function(item, i) { return <Bevinding key={i} item={item} />; })}
              </div>
            )}
            {resultaat.rapport && resultaat.rapport.topActies && resultaat.rapport.topActies.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-sm font-medium text-slate-200 mb-3">Actieplan</h2>
                {resultaat.rapport.topActies.map(function(actie, i) {
                  return (
                    <div key={i} className={"rounded-lg border p-3 mb-2 " + (RISICO_BG[actie.prioriteit] || "bg-slate-800 border-slate-700")}>
                      <span className={"text-xs font-medium uppercase " + (RISICO_KLEUR[actie.prioriteit] || "text-slate-400")}>{actie.prioriteit}</span>
                      <p className="text-sm text-slate-200 mt-1">{actie.actie}</p>
                      <p className="text-xs text-slate-400 mt-1">{actie.waarom}</p>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-sm font-medium text-slate-200 mb-3">Alle bevindingen</h2>
              {Object.entries(resultaat.resultaten).map(function(entry) {
                var cat = entry[0]; var items = entry[1];
                return (
                  <div key={cat} className="mb-4">
                    <h3 className="text-xs font-medium text-slate-400 uppercase mb-2">{cat}</h3>
                    {items.map(function(item, i) { return <Bevinding key={i} item={item} />; })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
