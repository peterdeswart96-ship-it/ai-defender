import { useState } from "react";
import { exporteerDevRapportDocx, exporteerDevRapportPdf, exporteerKlantRapportDocx, exporteerKlantRapportPdf, maakKlantmailTekst } from "./exports";

const API_URL = import.meta.env.VITE_API_URL || "https://func-ai-defender.azurewebsites.net/api";

const TALEN = {
  nl: {
    titel: "AI Defender", subtitel: "by Boei17",
    scanKnop: "Scan starten", scanBezig: "Bezig...",
    disclaimer: "Alleen passieve checks. Scan uitsluitend websites waarbij je toestemming hebt.",
    invoerLabel: "Website scannen",
    foutUrl: "Voer een geldige URL in", foutScan: "Scan mislukt. Probeer het opnieuw.",
    klant: "Klantrapport", dev: "Dev rapport",
    klantPdf: "PDF downloaden", klantDocx: "Word downloaden", klantMail: "Mail opstellen",
    devPdf: "PDF downloaden", devDocx: "Word downloaden",
    mailTitel: "Klantmail opstellen", mailNaamLabel: "Naam contactpersoon (optioneel)",
    mailNaamPlaceholder: "bijv. Jan de Vries", mailGenereer: "Mail genereren",
    mailKopieer: "Kopieer tekst", mailGekopieerd: "Gekopieerd!", mailSluiten: "Sluiten",
    nogGeenScan: "Start een scan om rapporten te kunnen downloaden.",
  },
  en: {
    titel: "AI Defender", subtitel: "by Boei17",
    scanKnop: "Start scan", scanBezig: "Scanning...",
    disclaimer: "Passive checks only. Only scan websites you have permission to scan.",
    invoerLabel: "Scan website",
    foutUrl: "Please enter a valid URL", foutScan: "Scan failed. Please try again.",
    klant: "Client report", dev: "Dev report",
    klantPdf: "Download PDF", klantDocx: "Download Word", klantMail: "Compose email",
    devPdf: "Download PDF", devDocx: "Download Word",
    mailTitel: "Compose client email", mailNaamLabel: "Contact name (optional)",
    mailNaamPlaceholder: "e.g. John Smith", mailGenereer: "Generate email",
    mailKopieer: "Copy text", mailGekopieerd: "Copied!", mailSluiten: "Close",
    nogGeenScan: "Start a scan to download reports.",
  },
};

const RISICO_KLEUR = { kritiek: "#f87171", hoog: "#fb923c", gemiddeld: "#facc15", laag: "#4ade80", ok: "#22c55e", info: "#60a5fa" };
const RISICO_BG_STYLE = {
  kritiek: { background: "#1a0505", border: "1px solid #7f1d1d" },
  hoog: { background: "#1a0a00", border: "1px solid #7c2d12" },
  gemiddeld: { background: "#1a1500", border: "1px solid #713f12" },
  laag: { background: "#0f1a10", border: "1px solid #14532d" },
  ok: { background: "#0f1a10", border: "1px solid #14532d" },
};

function ScoreCircle({ score, rating }) {
  var k = score >= 85 ? "#22c55e" : score >= 70 ? "#3b82f6" : score >= 50 ? "#eab308" : score >= 30 ? "#f97316" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "36px", fontWeight: "800", color: k, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: "11px", color: "#64748b" }}>/ 100</div>
      </div>
      <div style={{ fontSize: "22px", fontWeight: "800", color: k, border: `2px solid ${k}`, borderRadius: "8px", width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>{rating}</div>
    </div>
  );
}

function Bevinding({ item }) {
  var k = RISICO_KLEUR[item.risico] || "#94a3b8";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 0", borderBottom: "1px solid #1e293b" }}>
      <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", marginTop: "2px", width: "76px", flexShrink: 0, color: k }}>{item.risico}</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "14px", color: "#e2e8f0", margin: "0 0 2px" }}>{item.check}</p>
        {item.aanbeveling && <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>{item.aanbeveling}</p>}
      </div>
    </div>
  );
}

function ExportKnop({ label, icon, onClick, disabled, gradient }) {
  return (
    <button onClick={disabled ? undefined : onClick}
      style={{
        background: gradient,
        color: "#fff",
        border: "none",
        borderRadius: "10px",
        padding: "13px 16px",
        fontSize: "13px",
        fontWeight: "600",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        width: "100%",
        textAlign: "left",
        opacity: disabled ? 0.45 : 1,
        boxShadow: disabled ? "none" : "0 2px 8px rgba(0,0,0,0.35)",
        transition: "opacity 0.15s",
      }}>
      <span style={{ fontSize: "17px" }}>{icon}</span>
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "16px" }}>
      <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "16px", width: "100%", maxWidth: "600px", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #1e293b" }}>
          <h2 style={{ fontSize: "15px", fontWeight: "700", margin: 0, color: "#f1f5f9" }}>{t.mailTitel}</h2>
          <button onClick={onSluiten} style={{ background: "none", border: "none", color: "#64748b", fontSize: "22px", cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        {!mailTekst ? (
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ fontSize: "13px", color: "#94a3b8", display: "block", marginBottom: "8px" }}>{t.mailNaamLabel}</label>
              <input type="text" value={naam} onChange={function(e) { setNaam(e.target.value); }} placeholder={t.mailNaamPlaceholder}
                onKeyDown={function(e) { if(e.key==="Enter") genereer(); }}
                style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "11px 14px", fontSize: "14px", color: "#f1f5f9", boxSizing: "border-box", outline: "none" }} />
            </div>
            <button onClick={genereer} style={{ background: "linear-gradient(135deg,#7c3aed,#8b5cf6)", color: "#fff", border: "none", borderRadius: "10px", padding: "13px 20px", fontSize: "14px", fontWeight: "700", cursor: "pointer" }}>{t.mailGenereer}</button>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
              <pre style={{ fontSize: "13px", color: "#cbd5e1", whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, lineHeight: 1.6 }}>{mailTekst}</pre>
            </div>
            <div style={{ padding: "16px 20px", borderTop: "1px solid #1e293b", display: "flex", gap: "10px" }}>
              <button onClick={kopieer} style={{ flex: 1, background: gekopieerd ? "linear-gradient(135deg,#15803d,#16a34a)" : "linear-gradient(135deg,#7c3aed,#8b5cf6)", color: "#fff", border: "none", borderRadius: "10px", padding: "13px", fontSize: "14px", fontWeight: "700", cursor: "pointer" }}>
                {gekopieerd ? t.mailGekopieerd : t.mailKopieer}
              </button>
              <button onClick={onSluiten} style={{ padding: "13px 20px", fontSize: "14px", color: "#64748b", background: "none", border: "1px solid #334155", borderRadius: "10px", cursor: "pointer" }}>{t.mailSluiten}</button>
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
  var [mobileMenu, setMobileMenu] = useState(false);
  var t = TALEN[taal];

  async function startScan() {
    if (!urlPad.trim()) { setFout(t.foutUrl); return; }
    setFout(""); setBezig(true); setResultaat(null); setMobileMenu(false);
    try {
      var res = await fetch(API_URL + "/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: protocol + urlPad, taal }) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      setResultaat(await res.json());
    } catch(e) { setFout(t.foutScan + " (" + e.message + ")"); }
    finally { setBezig(false); }
  }

  async function handleExport(type) {
    if (!resultaat) return;
    setExportBezig(type); setMobileMenu(false);
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

  var sidebarInhoud = (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {resultaat && (
        <div style={{ background: "#1e293b", borderRadius: "12px", padding: "14px 16px", border: "1px solid #334155" }}>
          <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Resultaat</div>
          <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resultaat.url.replace(/https?:\/\//, "")}</div>
          <ScoreCircle score={resultaat.score} rating={resultaat.rating} />
        </div>
      )}

      <div>
        <div style={{ fontSize: "12px", fontWeight: "700", color: "#f97316", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>👤</span> {t.klant}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <ExportKnop label={exportBezig === "klant-pdf" ? "Bezig..." : t.klantPdf} icon="📑" gradient="linear-gradient(135deg,#ea580c,#f97316)" onClick={function() { handleExport("klant-pdf"); }} disabled={!resultaat || exportBezig === "klant-pdf"} />
          <ExportKnop label={exportBezig === "klant-docx" ? "Bezig..." : t.klantDocx} icon="📄" gradient="linear-gradient(135deg,#c2410c,#ea580c)" onClick={function() { handleExport("klant-docx"); }} disabled={!resultaat || exportBezig === "klant-docx"} />
          <ExportKnop label={t.klantMail} icon="✉️" gradient="linear-gradient(135deg,#7c3aed,#8b5cf6)" onClick={function() { setMailOpen(true); }} disabled={!resultaat} />
        </div>
      </div>

      <div style={{ borderTop: "1px solid #1e293b", paddingTop: "20px" }}>
        <div style={{ fontSize: "12px", fontWeight: "700", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>🛠️</span> {t.dev}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <ExportKnop label={exportBezig === "dev-pdf" ? "Bezig..." : t.devPdf} icon="📑" gradient="linear-gradient(135deg,#0369a1,#0ea5e9)" onClick={function() { handleExport("dev-pdf"); }} disabled={!resultaat || exportBezig === "dev-pdf"} />
          <ExportKnop label={exportBezig === "dev-docx" ? "Bezig..." : t.devDocx} icon="📄" gradient="linear-gradient(135deg,#1d4ed8,#3b82f6)" onClick={function() { handleExport("dev-docx"); }} disabled={!resultaat || exportBezig === "dev-docx"} />
        </div>
      </div>

      {!resultaat && (
        <p style={{ fontSize: "12px", color: "#334155", margin: 0, lineHeight: 1.5 }}>{t.nogGeenScan}</p>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1a", color: "#f1f5f9", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .main-content { padding: 16px !important; }
        }
        @media (min-width: 769px) {
          .mobile-menu-btn { display: none !important; }
          .mobile-sidebar-overlay { display: none !important; }
        }
      `}</style>

      {mailOpen && resultaat && <MailModal t={t} resultaat={resultaat} taal={taal} onSluiten={function() { setMailOpen(false); }} />}

      {mobileMenu && (
        <div className="mobile-sidebar-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 40 }} onClick={function() { setMobileMenu(false); }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "280px", background: "#0f172a", borderRight: "1px solid #1e293b", padding: "20px 16px", overflowY: "auto" }} onClick={function(e) { e.stopPropagation(); }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
              <button onClick={function() { setMobileMenu(false); }} style={{ background: "none", border: "none", color: "#64748b", fontSize: "24px", cursor: "pointer" }}>✕</button>
            </div>
            {sidebarInhoud}
          </div>
        </div>
      )}

      <header style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "0 20px", display: "flex", alignItems: "center", height: "60px", gap: "12px", position: "sticky", top: 0, zIndex: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "34px", height: "34px", background: "linear-gradient(135deg,#ea580c,#f97316)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "14px", color: "#fff", letterSpacing: "-0.5px", flexShrink: 0 }}>B17</div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#f1f5f9", lineHeight: 1.2 }}>AI Defender</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>by Boei17</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="mobile-menu-btn" onClick={function() { setMobileMenu(true); }}
          style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "7px 12px", color: "#94a3b8", fontSize: "13px", fontWeight: "600", cursor: "pointer", alignItems: "center", gap: "6px" }}>
          ☰ Rapporten
        </button>
        <select value={taal} onChange={function(e) { setTaal(e.target.value); }}
          style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: "8px", padding: "7px 10px", fontSize: "12px" }}>
          <option value="nl">🇳🇱 NL</option>
          <option value="en">🇬🇧 EN</option>
        </select>
      </header>

      <div style={{ display: "flex" }}>
        <aside className="desktop-sidebar" style={{ width: "220px", minWidth: "220px", background: "#0f172a", borderRight: "1px solid #1e293b", padding: "20px 16px", minHeight: "calc(100vh - 60px)", position: "sticky", top: "60px", height: "calc(100vh - 60px)", overflowY: "auto" }}>
          {sidebarInhoud}
        </aside>

        <main className="main-content" style={{ flex: 1, padding: "24px", minWidth: 0 }}>
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "16px", padding: "20px", marginBottom: "20px" }}>
            <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px", fontWeight: "600" }}>{t.invoerLabel}</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <select value={protocol} onChange={function(e) { setProtocol(e.target.value); }}
                style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: "8px", padding: "11px 12px", fontSize: "13px", fontWeight: "600", flexShrink: 0 }}>
                <option value="https://">https://</option>
                <option value="http://">http://</option>
              </select>
              <input type="text" value={urlPad}
                onChange={function(e) { setUrlPad(e.target.value.replace(/^https?:\/\//, "")); }}
                onKeyDown={function(e) { if(e.key === "Enter") startScan(); }}
                placeholder="boei17.nl"
                style={{ flex: 1, minWidth: "120px", background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "11px 14px", fontSize: "14px", color: "#f1f5f9", outline: "none" }} />
              <button onClick={startScan} disabled={bezig}
                style={{ background: bezig ? "#334155" : "linear-gradient(135deg,#ea580c,#f97316)", color: bezig ? "#64748b" : "#fff", border: "none", borderRadius: "8px", padding: "11px 20px", fontSize: "14px", fontWeight: "700", cursor: bezig ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0, boxShadow: bezig ? "none" : "0 2px 12px rgba(234,88,12,0.4)" }}>
                {bezig ? t.scanBezig : t.scanKnop}
              </button>
            </div>
            {fout && <p style={{ marginTop: "8px", fontSize: "13px", color: "#f87171", margin: "8px 0 0" }}>{fout}</p>}
            <p style={{ marginTop: "10px", fontSize: "11px", color: "#334155", margin: "10px 0 0" }}>{t.disclaimer}</p>
          </div>

          {resultaat && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "16px", padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <p style={{ fontSize: "15px", fontWeight: "700", color: "#f1f5f9", margin: "0 0 4px" }}>{resultaat.url}</p>
                    <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>{new Date(resultaat.scanDatum).toLocaleString(taal==="nl"?"nl-NL":"en-GB")}</p>
                  </div>
                  <ScoreCircle score={resultaat.score} rating={resultaat.rating} />
                </div>
                {resultaat.rapport?.samenvatting && (
                  <p style={{ fontSize: "14px", color: "#cbd5e1", background: "#1e293b", borderRadius: "10px", padding: "14px 16px", margin: 0, lineHeight: 1.7 }}>{resultaat.rapport.samenvatting}</p>
                )}
              </div>

              {(kritiek.length > 0 || hoog.length > 0) && (
                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "16px", padding: "20px" }}>
                  <h2 style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>Kritieke en hoge bevindingen</h2>
                  {kritiek.concat(hoog).map(function(item, i) { return <Bevinding key={i} item={item} />; })}
                </div>
              )}

              {resultaat.rapport?.topActies?.length > 0 && (
                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "16px", padding: "20px" }}>
                  <h2 style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>Actieplan</h2>
                  {resultaat.rapport.topActies.map(function(actie, i) {
                    var bg = RISICO_BG_STYLE[actie.prioriteit] || { background: "#1e293b", border: "1px solid #334155" };
                    var k = RISICO_KLEUR[actie.prioriteit] || "#94a3b8";
                    return (
                      <div key={i} style={{ ...bg, borderRadius: "10px", padding: "14px 16px", marginBottom: "10px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: k }}>{actie.prioriteit}</span>
                        <p style={{ fontSize: "14px", fontWeight: "600", color: "#e2e8f0", margin: "6px 0 4px" }}>{actie.actie}</p>
                        <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>{actie.waarom}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "16px", padding: "20px" }}>
                <h2 style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>Alle bevindingen</h2>
                {Object.entries(resultaat.resultaten).map(function(entry) {
                  return (
                    <div key={entry[0]} style={{ marginBottom: "20px" }}>
                      <h3 style={{ fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", margin: "0 0 6px", letterSpacing: "0.04em" }}>{entry[0]}</h3>
                      {entry[1].map(function(item, i) { return <Bevinding key={i} item={item} />; })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}