import { useState } from "react";
import { exporteerDevRapportDocx, exporteerDevRapportPdf, exporteerKlantRapportDocx, exporteerKlantRapportPdf, maakKlantmailTekst } from "./exports";

const API_URL = import.meta.env.VITE_API_URL || "https://func-ai-defender.azurewebsites.net/api";

const TALEN = {
  nl: {
    titel: "AI Defender", subtitel: "WordPress security scanner by Boei17",
    placeholder: "https://voorbeeld.nl", scanKnop: "Scan starten", scanBezig: "Scan bezig...",
    disclaimer: "Alleen passieve, niet-destructieve checks. Scan uitsluitend websites waarbij je toestemming hebt.",
    invoerLabel: "Voer de URL in van de website die je wilt scannen.",
    foutUrl: "Voer een geldige URL in, inclusief https://", foutScan: "Scan mislukt. Probeer het opnieuw.",
    klant: "Klant", dev: "Dev",
    klantPdf: "Rapport (PDF)", klantDocx: "Rapport (Word)", klantMail: "Mail opstellen",
    devPdf: "Rapport (PDF)", devDocx: "Rapport (Word)",
    mailTitel: "Klantmail opstellen", mailNaamLabel: "Naam contactpersoon (optioneel)",
    mailNaamPlaceholder: "bijv. Jan de Vries", mailGenereer: "Mail genereren",
    mailKopieer: "Kopieer tekst", mailGekopieerd: "Gekopieerd!", mailSluiten: "Sluiten",
  },
  en: {
    titel: "AI Defender", subtitel: "WordPress security scanner by Boei17",
    placeholder: "https://example.com", scanKnop: "Start scan", scanBezig: "Scanning...",
    disclaimer: "Passive, non-destructive checks only. Only scan websites you have permission to scan.",
    invoerLabel: "Enter the URL of the website you want to scan.",
    foutUrl: "Please enter a valid URL including https://", foutScan: "Scan failed. Please try again.",
    klant: "Client", dev: "Dev",
    klantPdf: "Report (PDF)", klantDocx: "Report (Word)", klantMail: "Compose email",
    devPdf: "Report (PDF)", devDocx: "Report (Word)",
    mailTitel: "Compose client email", mailNaamLabel: "Contact name (optional)",
    mailNaamPlaceholder: "e.g. John Smith", mailGenereer: "Generate email",
    mailKopieer: "Copy text", mailGekopieerd: "Copied!", mailSluiten: "Close",
  },
};

const RISICO_KLEUR = { kritiek: "text-red-400", hoog: "text-orange-400", gemiddeld: "text-yellow-400", laag: "text-green-400", ok: "text-green-500", info: "text-blue-400" };
const RISICO_BG = { kritiek: "bg-red-950 border-red-800", hoog: "bg-orange-950 border-orange-800", gemiddeld: "bg-yellow-950 border-yellow-800", laag: "bg-slate-800 border-slate-700", ok: "bg-slate-800 border-slate-700" };

function ScoreCircle({ score, rating }) {
  var k = score >= 85 ? "text-green-400" : score >= 70 ? "text-blue-400" : score >= 50 ? "text-yellow-400" : score >= 30 ? "text-orange-400" : "text-red-400";
  return (
    <div className="flex items-center gap-3">
      <div className="text-center"><div className={`text-3xl font-bold ${k}`}>{score}</div><div className="text-xs text-slate-500">/ 100</div></div>
      <div className={`text-2xl font-bold ${k} border-2 rounded-lg w-10 h-10 flex items-center justify-center border-current`}>{rating}</div>
    </div>
  );
}

function Bevinding({ item }) {
  var k = RISICO_KLEUR[item.risico] || "text-slate-400";
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-800 last:border-0">
      <span className={`text-xs font-medium uppercase mt-0.5 w-20 shrink-0 ${k}`}>{item.risico}</span>
      <div className="flex-1"><p className="text-sm text-slate-200">{item.check}</p>{item.aanbeveling && <p className="text-xs text-slate-400 mt-0.5">{item.aanbeveling}</p>}</div>
    </div>
  );
}

function SidebarKnop({ icon, label, onClick, actief, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs w-full text-left transition-colors ${actief ? "bg-sky-900 text-sky-200 border border-sky-700" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent"} disabled:opacity-40`}>
      <span>{icon}</span><span>{label}</span>
    </button>
  );
}

function MailModal({ t, resultaat, taal, onSluiten }) {
  var [naam, setNaam] = useState("");
  var [mailTekst, setMailTekst] = useState("");
  var [gekopieerd, setGekopieerd] = useState(false);

  function genereer() { setMailTekst(maakKlantmailTekst(resultaat, taal, naam)); }
  function kopieer() {
    navigator.clipboard.writeText(mailTekst).then(function() {
      setGekopieerd(true); setTimeout(function() { setGekopieerd(false); }, 2000);
    });
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "16px" }}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl flex flex-col" style={{ maxHeight: "85vh" }}>
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-sm font-medium text-slate-200">{t.mailTitel}</h2>
          <button onClick={onSluiten} className="text-slate-400 hover:text-slate-200">✕</button>
        </div>
        {!mailTekst ? (
          <div className="p-6 flex flex-col gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-2 block">{t.mailNaamLabel}</label>
              <input type="text" value={naam} onChange={function(e) { setNaam(e.target.value); }} placeholder={t.mailNaamPlaceholder}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500" />
            </div>
            <button onClick={genereer} className="bg-sky-600 hover:bg-sky-500 text-white rounded-lg px-4 py-2.5 text-sm font-medium">{t.mailGenereer}</button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto p-4"><pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans">{mailTekst}</pre></div>
            <div className="p-4 border-t border-slate-800 flex gap-3">
              <button onClick={kopieer} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${gekopieerd ? "bg-green-700 text-white" : "bg-sky-600 hover:bg-sky-500 text-white"}`}>
                {gekopieerd ? t.mailGekopieerd : t.mailKopieer}
              </button>
              <button onClick={onSluiten} className="px-4 py-2.5 text-sm text-slate-400 hover:text-slate-200">{t.mailSluiten}</button>
            </div>
          </>
        )}
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
  var [mailOpen, setMailOpen] = useState(false);
  var [exportBezig, setExportBezig] = useState("");
  var t = TALEN[taal];

  function isGeldigeUrl(w) { try { var u = new URL(w); return u.protocol === "https:" || u.protocol === "http:"; } catch(e) { return false; } }

  async function startScan() {
    if (!isGeldigeUrl(url)) { setFout(t.foutUrl); return; }
    setFout(""); setBezig(true); setResultaat(null);
    try {
      var res = await fetch(API_URL + "/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, taal }) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      setResultaat(await res.json());
    } catch(e) { setFout(t.foutScan + " (" + e.message + ")"); }
    finally { setBezig(false); }
  }

  async function handleExport(type) {
    if (!resultaat) return;
    setExportBezig(type);
    try {
      if (type === "dev-docx") await exporteerDevRapportDocx(resultaat);
      else if (type === "dev-pdf") exporteerDevRapportPdf(resultaat);
      else if (type === "klant-docx") await exporteerKlantRapportDocx(resultaat);
      else if (type === "klant-pdf") exporteerKlantRapportPdf(resultaat);
    } catch(e) { console.error(e); }
    finally { setExportBezig(""); }
  }

  var alleResultaten = resultaat ? Object.values(resultaat.resultaten).flat() : [];
  var kritiek = alleResultaten.filter(function(r) { return r.risico === "kritiek"; });
  var hoog = alleResultaten.filter(function(r) { return r.risico === "hoog"; });
  var scoreKleur = resultaat ? (resultaat.score >= 70 ? "text-green-400" : resultaat.score >= 50 ? "text-yellow-400" : "text-red-400") : "text-slate-400";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {mailOpen && resultaat && <MailModal t={t} resultaat={resultaat} taal={taal} onSluiten={function() { setMailOpen(false); }} />}

      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center gap-3">
        <svg className="w-6 h-6 text-sky-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
        </svg>
        <div className="flex-1">
          <h1 className="text-sm font-medium text-slate-100">{t.titel}</h1>
          <p className="text-xs text-slate-500">{t.subtitel}</p>
        </div>
        <select value={taal} onChange={function(e) { setTaal(e.target.value); }} className="bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-3 py-1.5 text-xs">
          <option value="nl">🇳🇱 Nederlands</option>
          <option value="en">🇬🇧 English</option>
        </select>
      </header>

      <div className="flex flex-1">
        <aside className="w-48 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col gap-4 p-4">
          {resultaat && (
            <div className={`rounded-lg bg-slate-800 border border-slate-700 p-3 flex items-center justify-between`}>
              <div className="text-xs text-slate-400 truncate max-w-24">{resultaat.url.replace(/https?:\/\//,"")}</div>
              <ScoreCircle score={resultaat.score} rating={resultaat.rating} />
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 px-1">{t.klant}</p>
            <div className="flex flex-col gap-1">
              <SidebarKnop icon="📑" label={t.klantPdf} onClick={function() { handleExport("klant-pdf"); }} disabled={!resultaat || exportBezig === "klant-pdf"} actief={exportBezig === "klant-pdf"} />
              <SidebarKnop icon="📄" label={t.klantDocx} onClick={function() { handleExport("klant-docx"); }} disabled={!resultaat || exportBezig === "klant-docx"} actief={exportBezig === "klant-docx"} />
              <SidebarKnop icon="✉️" label={t.klantMail} onClick={function() { setMailOpen(true); }} disabled={!resultaat} />
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 px-1">{t.dev}</p>
            <div className="flex flex-col gap-1">
              <SidebarKnop icon="📑" label={t.devPdf} onClick={function() { handleExport("dev-pdf"); }} disabled={!resultaat || exportBezig === "dev-pdf"} actief={exportBezig === "dev-pdf"} />
              <SidebarKnop icon="📄" label={t.devDocx} onClick={function() { handleExport("dev-docx"); }} disabled={!resultaat || exportBezig === "dev-docx"} actief={exportBezig === "dev-docx"} />
            </div>
          </div>
        </aside>

        <main className="flex-1 px-6 pt-6 pb-16 overflow-auto">
          <div className="max-w-2xl">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-5">
              <p className="text-xs text-slate-400 mb-3">{t.invoerLabel}</p>
              <div className="flex gap-3">
                <input type="url" value={url} onChange={function(e) { setUrl(e.target.value); }} onKeyDown={function(e) { if(e.key==="Enter") startScan(); }} placeholder={t.placeholder}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500" />
                <button onClick={startScan} disabled={bezig}
                  className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap">
                  {bezig ? t.scanBezig : t.scanKnop}
                </button>
              </div>
              {fout && <p className="mt-2 text-xs text-red-400">{fout}</p>}
              <p className="mt-2 text-xs text-slate-600">{t.disclaimer}</p>
            </div>

            {resultaat && (
              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div><p className="text-sm font-medium text-slate-200">{resultaat.url}</p><p className="text-xs text-slate-500">{new Date(resultaat.scanDatum).toLocaleString(taal==="nl"?"nl-NL":"en-GB")}</p></div>
                  </div>
                  {resultaat.rapport?.samenvatting && <p className="text-sm text-slate-300 bg-slate-800 rounded-lg p-3">{resultaat.rapport.samenvatting}</p>}
                </div>

                {(kritiek.length > 0 || hoog.length > 0) && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Kritieke en hoge bevindingen</h2>
                    {kritiek.concat(hoog).map(function(item, i) { return <Bevinding key={i} item={item} />; })}
                  </div>
                )}

                {resultaat.rapport?.topActies?.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Actieplan</h2>
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

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Alle bevindingen</h2>
                  {Object.entries(resultaat.resultaten).map(function(entry) {
                    return (
                      <div key={entry[0]} className="mb-4">
                        <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">{entry[0]}</h3>
                        {entry[1].map(function(item, i) { return <Bevinding key={i} item={item} />; })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}