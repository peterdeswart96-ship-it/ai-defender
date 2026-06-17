import { useState } from "react";
import { exporteerDevRapportDocx, exporteerDevRapportPdf, exporteerKlantRapportDocx, exporteerKlantRapportPdf, maakKlantmailTekst } from "./exports";

const API_URL = import.meta.env.VITE_API_URL || "https://func-ai-defender.azurewebsites.net/api";

const TALEN = {
  nl: {
    titel: "AI Defender", subtitel: "by Boei17",
    scanKnop: "Scan starten", scanBezig: "Bezig...",
    disclaimer: "Alleen passieve, niet-destructieve checks. Scan uitsluitend websites waarbij je toestemming hebt.",
    invoerLabel: "Website scannen",
    foutUrl: "Voer een geldige URL in", foutScan: "Scan mislukt. Probeer het opnieuw.",
    klant: "Klantrapport", dev: "Dev rapport",
    klantPdf: "PDF downloaden", klantDocx: "Word downloaden", klantMail: "Mail opstellen",
    devPdf: "PDF downloaden", devDocx: "Word downloaden",
    mailTitel: "Klantmail opstellen", mailNaamLabel: "Naam contactpersoon (optioneel)",
    mailNaamPlaceholder: "bijv. Jan de Vries", mailGenereer: "Mail genereren",
    mailKopieer: "Kopieer tekst", mailGekopieerd: "Gekopieerd!", mailSluiten: "Sluiten",
    nogGeenScan: "Voer een URL in en start een scan om rapporten te genereren.",
  },
  en: {
    titel: "AI Defender", subtitel: "by Boei17",
    scanKnop: "Start scan", scanBezig: "Scanning...",
    disclaimer: "Passive, non-destructive checks only. Only scan websites you have permission to scan.",
    invoerLabel: "Scan website",
    foutUrl: "Please enter a valid URL", foutScan: "Scan failed. Please try again.",
    klant: "Client report", dev: "Dev report",
    klantPdf: "Download PDF", klantDocx: "Download Word", klantMail: "Compose email",
    devPdf: "Download PDF", devDocx: "Download Word",
    mailTitel: "Compose client email", mailNaamLabel: "Contact name (optional)",
    mailNaamPlaceholder: "e.g. John Smith", mailGenereer: "Generate email",
    mailKopieer: "Copy text", mailGekopieerd: "Copied!", mailSluiten: "Close",
    nogGeenScan: "Enter a URL and start a scan to generate reports.",
  },
};

const RISICO_KLEUR = { kritiek: "text-red-400", hoog: "text-orange-400", gemiddeld: "text-yellow-400", laag: "text-green-400", ok: "text-green-500", info: "text-blue-400" };
const RISICO_BG = { kritiek: "bg-red-950 border-red-800", hoog: "bg-orange-950 border-orange-800", gemiddeld: "bg-yellow-950 border-yellow-800", laag: "bg-slate-800 border-slate-700", ok: "bg-slate-800 border-slate-700" };

function ScoreCircle({ score, rating }) {
  var k = score >= 85 ? "#22c55e" : score >= 70 ? "#3b82f6" : score >= 50 ? "#eab308" : score >= 30 ? "#f97316" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "42px", fontWeight: "700", color: k, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: "12px", color: "#64748b" }}>/ 100</div>
      </div>
      <div style={{ fontSize: "28px", fontWeight: "700", color: k, border: `2px solid ${k}`, borderRadius: "10px", width: "52px", height: "52px", display: "flex", alignItems: "center", justifyContent: "center" }}>{rating}</div>
    </div>
  );
}

function Bevinding({ item }) {
  var k = RISICO_KLEUR[item.risico] || "text-slate-400";
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-800 last:border-0">
      <span className={`text-xs font-semibold uppercase mt-0.5 w-20 shrink-0 ${k}`}>{item.risico}</span>
      <div className="flex-1"><p className="text-sm text-slate-200">{item.check}</p>{item.aanbeveling && <p className="text-xs text-slate-400 mt-0.5">{item.aanbeveling}</p>}</div>
    </div>
  );
}

function ExportKnop({ label, icon, onClick, disabled, gradient, textColor }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "#1e293b" : gradient,
        color: disabled ? "#475569" : (textColor || "#fff"),
        border: "none",
        borderRadius: "10px",
        padding: "12px 16px",
        fontSize: "13px",
        fontWeight: "600",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        width: "100%",
        textAlign: "left",
        transition: "opacity 0.15s",
        opacity: disabled ? 0.5 : 1,
        boxShadow: disabled ? "none" : "0 2px 8px rgba(0,0,0,0.3)",
      }}
    >
      <span style={{ fontSize: "18px" }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function MailModal({ t, resultaat, taal, onSluiten }) {
  var [naam, setNaam] = useState("");
  var [mailTekst, setMailTekst] = useState("");
  var [gekopieerd, setGekopieerd] = useState(false);
  function genereer() { setMailTekst(maakKlantmailTekst(resultaat, taal, naam)); }
  function kopieer() { navigator.clipboard.writeText(mailTekst).then(function() { setGekopieerd(true); setTimeout(function() { setGekopieerd(false); }, 2000); }); }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "16px" }}>
      <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "16px", width: "100%", maxWidth: "600px", display: "flex", flexDirection: "column", maxHeight: "85vh" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #1e293b" }}>
          <h2 style={{ fontSize: "15px", fontWeight: "600", margin: 0, color: "#f1f5f9" }}>{t.mailTitel}</h2>
          <button onClick={onSluiten} style={{ background: "none", border: "none", color: "#64748b", fontSize: "20px", cursor: "pointer", padding: "0 4px" }}>✕</button>
        </div>
        {!mailTekst ? (
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ fontSize: "13px", color: "#94a3b8", display: "block", marginBottom: "8px" }}>{t.mailNaamLabel}</label>
              <input type="text" value={naam} onChange={function(e) { setNaam(e.target.value); }} placeholder={t.mailNaamPlaceholder}
                style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "10px 14px", fontSize: "14px", color: "#f1f5f9", boxSizing: "border-box" }} />
            </div>
            <button onClick={genereer} style={{ background: "linear-gradient(135deg, #ea580c, #f97316)", color: "#fff", border: "none", borderRadius: "10px", padding: "12px 20px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>{t.mailGenereer}</button>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}><pre style={{ fontSize: "13px", color: "#cbd5e1", whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{mailTekst}</pre></div>
            <div style={{ padding: "16px 20px", borderTop: "1px solid #1e293b", display: "flex", gap: "10px" }}>
              <button onClick={kopieer} style={{ flex: 1, background: gekopieerd ? "linear-gradient(135deg,#15803d,#16a34a)" : "linear-gradient(135deg,#ea580c,#f97316)", color: "#fff", border: "none", borderRadius: "10px", padding: "12px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
                {gekopieerd ? t.mailGekopieerd : t.mailKopieer}
              </button>
              <button onClick={onSluiten} style={{ padding: "12px 20px", fontSize: "14px", color: "#64748b", background: "none", border: "1px solid #334155", borderRadius: "10px", cursor: "pointer" }}>{t.mailSluiten}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  var [taal, setTaal] = useState("nl");
  var [protocol, setProtocol] = useState("https://");
  var [urlPad, setUrlPad] = useState("");
  var [bezig, setBezig] = useState(false);
  var [fout, setFout] = useState("");
  var [resultaat, setResultaat] = useState(null);
  var [mailOpen, setMailOpen] = useState(false);
  var [exportBezig, setExportBezig] = useState("");
  var t = TALEN[taal];

  async function startScan() {
    var volledigeUrl = protocol + urlPad;
    if (!urlPad.trim()) { setFout(t.foutUrl); return; }
    setFout(""); setBezig(true); setResultaat(null);
    try {
      var res = await fetch(API_URL + "/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: volledigeUrl, taal }) });
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

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1a", color: "#f1f5f9", display: "flex", flexDirection: "column", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {mailOpen && resultaat && <MailModal t={t} resultaat={resultaat} taal={taal} onSluiten={function() { setMailOpen(false); }} />}

      <header style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "0 24px", display: "flex", alignItems: "center", height: "64px", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", background: "linear-gradient(135deg, #ea580c, #f97316)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "16px", color: "#fff", letterSpacing: "-0.5px" }}>B17</div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "#f1f5f9", lineHeight: 1.2 }}>AI Defender</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>by Boei17</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <select value={taal} onChange={function(e) { setTaal(e.target.value); }}
          style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: "8px", padding: "6px 12px", fontSize: "13px" }}>
          <option value="nl">🇳🇱 Nederlands</option>
          <option value="en">🇬🇧 English</option>
        </select>
      </header>

      <div style={{ display: "flex", flex: 1 }}>

        <aside style={{ width: "220px", minWidth: "220px", background: "#0f172a", borderRight: "1px solid #1e293b", padding: "20px 16px", display: "flex", flexDirection: "column", gap: "24px" }}>

          {resultaat ? (
            <div style={{ background: "#1e293b", borderRadius: "12px", padding: "14px 16px", border: "1px solid #334155" }}>
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Resultaat</div>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resultaat.url.replace(/https?:\/\//,"")}</div>
              <ScoreCircle score={resultaat.score} rating={resultaat.rating} />
            </div>
          ) : (
            <div style={{ background: "#1e293b", borderRadius: "12px", padding: "14px 16px", border: "1px solid #334155" }}>
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Geen scan actief</div>
              <p style={{ fontSize: "12px", color: "#475569", margin: 0, lineHeight: 1.5 }}>{t.nogGeenScan}</p>
            </div>
          )}

          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#f97316", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px", padding: "0 4px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>👤</span> {t.klant}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <ExportKnop label={t.klantPdf} icon="📑" gradient="linear-gradient(135deg, #ea580c, #f97316)" onClick={function() { handleExport("klant-pdf"); }} disabled={!resultaat || exportBezig === "klant-pdf"} />
              <ExportKnop label={t.klantDocx} icon="📄" gradient="linear-gradient(135deg, #c2410c, #ea580c)" onClick={function() { handleExport("klant-docx"); }} disabled={!resultaat || exportBezig === "klant-docx"} />
              <ExportKnop label={t.klantMail} icon="✉️" gradient="linear-gradient(135deg, #7c3aed, #8b5cf6)" onClick={function() { setMailOpen(true); }} disabled={!resultaat} />
            </div>
          </div>

          <div style={{ borderTop: "1px solid #1e293b", paddingTop: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px", padding: "0 4px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>🛠️</span> {t.dev}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <ExportKnop label={t.devPdf} icon="📑" gradient="linear-gradient(135deg, #0369a1, #0ea5e9)" onClick={function() { handleExport("dev-pdf"); }} disabled={!resultaat || exportBezig === "dev-pdf"} />
              <ExportKnop label={t.devDocx} icon="📄" gradient="linear-gradient(135deg, #1d4ed8, #3b82f6)" onClick={function() { handleExport("dev-docx"); }} disabled={!resultaat || exportBezig === "dev-docx"} />
            </div>
          </div>
        </aside>

        <main style={{ flex: 1, padding: "24px", overflow: "auto" }}>
          <div style={{ maxWidth: "700px" }}>

            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "16px", padding: "20px 24px", marginBottom: "20px" }}>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px", fontWeight: "500" }}>{t.invoerLabel}</div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <select value={protocol} onChange={function(e) { setProtocol(e.target.value); }}
                  style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: "8px", padding: "10px 12px", fontSize: "13px", fontWeight: "600", flexShrink: 0 }}>
                  <option value="https://">https://</option>
                  <option value="http://">http://</option>
                </select>
                <input
                  type="text"
                  value={urlPad}
                  onChange={function(e) { setUrlPad(e.target.value.replace(/^https?:\/\//, "")); }}
                  onKeyDown={function(e) { if(e.key === "Enter") startScan(); }}
                  placeholder="boei17.nl"
                  style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "10px 14px", fontSize: "14px", color: "#f1f5f9", outline: "none" }}
                />
                <button onClick={startScan} disabled={bezig}
                  style={{ background: bezig ? "#334155" : "linear-gradient(135deg, #ea580c, #f97316)", color: bezig ? "#64748b" : "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "700", cursor: bezig ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, boxShadow: bezig ? "none" : "0 2px 12px rgba(234,88,12,0.4)" }}>
                  {bezig ? t.scanBezig : t.scanKnop}
                </button>
              </div>
              {fout && <p style={{ marginTop: "8px", fontSize: "13px", color: "#f87171" }}>{fout}</p>}
              <p style={{ marginTop: "10px", fontSize: "11px", color: "#334155" }}>{t.disclaimer}</p>
            </div>

            {resultaat && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "16px", padding: "20px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                    <div>
                      <p style={{ fontSize: "15px", fontWeight: "600", color: "#f1f5f9", margin: "0 0 4px" }}>{resultaat.url}</p>
                      <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>{new Date(resultaat.scanDatum).toLocaleString(taal==="nl"?"nl-NL":"en-GB")}</p>
                    </div>
                    <ScoreCircle score={resultaat.score} rating={resultaat.rating} />
                  </div>
                  {resultaat.rapport?.samenvatting && (
                    <p style={{ fontSize: "14px", color: "#cbd5e1", background: "#1e293b", borderRadius: "10px", padding: "14px 16px", margin: 0, lineHeight: 1.6 }}>{resultaat.rapport.samenvatting}</p>
                  )}
                </div>

                {(kritiek.length > 0 || hoog.length > 0) && (
                  <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "16px", padding: "20px 24px" }}>
                    <h2 style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>Kritieke en hoge bevindingen</h2>
                    {kritiek.concat(hoog).map(function(item, i) { return <Bevinding key={i} item={item} />; })}
                  </div>
                )}

                {resultaat.rapport?.topActies?.length > 0 && (
                  <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "16px", padding: "20px 24px" }}>
                    <h2 style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>Actieplan</h2>
                    {resultaat.rapport.topActies.map(function(actie, i) {
                      return (
                        <div key={i} className={"rounded-xl border p-4 mb-3 " + (RISICO_BG[actie.prioriteit] || "bg-slate-800 border-slate-700")}>
                          <span className={"text-xs font-bold uppercase " + (RISICO_KLEUR[actie.prioriteit] || "text-slate-400")}>{actie.prioriteit}</span>
                          <p className="text-sm text-slate-200 mt-1.5 font-medium">{actie.actie}</p>
                          <p className="text-xs text-slate-400 mt-1">{actie.waarom}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "16px", padding: "20px 24px" }}>
                  <h2 style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>Alle bevindingen</h2>
                  {Object.entries(resultaat.resultaten).map(function(entry) {
                    return (
                      <div key={entry[0]} style={{ marginBottom: "20px" }}>
                        <h3 style={{ fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>{entry[0]}</h3>
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