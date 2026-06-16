import { useState } from "react";

const TALEN = {
  nl: {
    titel: "AI Defender",
    subtitel: "WordPress security scanner by Boei17",
    placeholder: "https://voorbeeld.nl",
    scanKnop: "Scan starten",
    disclaimer: "Alleen passieve, niet-destructieve checks. Scan uitsluitend websites waarbij je toestemming hebt.",
    invoerLabel: "Voer de URL in van de website die je wilt scannen.",
    scanBezig: "Scan bezig...",
  },
  en: {
    titel: "AI Defender",
    subtitel: "WordPress security scanner by Boei17",
    placeholder: "https://example.com",
    scanKnop: "Start scan",
    disclaimer: "Passive, non-destructive checks only. Only scan websites you have permission to scan.",
    invoerLabel: "Enter the URL of the website you want to scan.",
    scanBezig: "Scanning...",
  },
};

export default function App() {
  const [taal, setTaal] = useState("nl");
  const [url, setUrl] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const t = TALEN[taal];

  function isGeldigeUrl(waarde) {
    try {
      const u = new URL(waarde);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  }

  async function startScan() {
    if (!isGeldigeUrl(url)) {
      setFout("Voer een geldige URL in, inclusief https://");
      return;
    }
    setFout("");
    setBezig(true);
    // Tijdelijk: simuleer scan (backend volgt later)
    await new Promise((r) => setTimeout(r, 2000));
    setBezig(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center gap-3">
        <svg className="w-7 h-7 text-sky-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
        </svg>
        <div className="flex-1">
          <h1 className="text-base font-medium text-slate-100">{t.titel}</h1>
          <p className="text-xs text-slate-400">{t.subtitel}</p>
        </div>
        <select
          value={taal}
          onChange={(e) => setTaal(e.target.value)}
          className="bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="nl">🇳🇱 Nederlands</option>
          <option value="en">🇬🇧 English</option>
        </select>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-start justify-center px-4 pt-16">
        <div className="w-full max-w-2xl">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
            <p className="text-sm text-slate-400 mb-6">{t.invoerLabel}</p>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startScan()}
                  placeholder={t.placeholder}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
              <button
                onClick={startScan}
                disabled={bezig}
                className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                {bezig ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t.scanBezig}
                  </>
                ) : (
                  t.scanKnop
                )}
              </button>
            </div>
            {fout && <p className="mt-3 text-sm text-red-400">{fout}</p>}
            <p className="mt-4 text-xs text-slate-500">{t.disclaimer}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
