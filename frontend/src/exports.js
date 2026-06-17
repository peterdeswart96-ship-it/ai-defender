import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from "docx";
import { saveAs } from "file-saver";

const RISICO_LABEL = { kritiek: "KRITIEK", hoog: "HOOG", gemiddeld: "GEMIDDELD", laag: "LAAG", ok: "OK", info: "INFO" };
const RISICO_CSS = { kritiek: "#DC2626", hoog: "#EA580C", gemiddeld: "#CA8A04", laag: "#16A34A", ok: "#15803D", info: "#2563EB" };

function tabelRij(cells, header) {
  return new TableRow({
    children: cells.map(tekst => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: String(tekst), bold: header, size: header ? 20 : 18 })] })],
      borders: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }, bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }, left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }, right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } },
    })),
    tableHeader: header,
  });
}

const CATEGORIEEN = { https: "SSL/TLS & HTTPS", headers: "HTTP Security Headers", wordpress: "WordPress", dns: "DNS & E-mail beveiliging", bestanden: "Gevoelige bestanden" };

const RISICO_UITLEG = {
  kritiek: "Dit is een kritiek beveiligingsprobleem dat direct aandacht vereist. Aanvallers kunnen dit actief misbruiken om gegevens te stelen, de website over te nemen of bezoekers schade toe te brengen.",
  hoog: "Dit is een serieus beveiligingsrisico dat binnen 1-2 weken opgelost moet worden. Zonder actie vergroot u de kans op een succesvolle aanval aanzienlijk.",
  gemiddeld: "Dit is een verbeterpunt dat binnen een maand opgepakt moet worden. Het vergroot het aanvalsoppervlak van de website.",
  laag: "Dit is een aanbevolen verbetering die de beveiliging optimaliseert, maar geen directe dreiging vormt.",
};

export async function exporteerDevRapportDocx(resultaat) {
  const datum = new Date(resultaat.scanDatum).toLocaleString("nl-NL");
  const secties = [
    new Paragraph({ text: "AI Defender — Technisch Security Rapport", heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: "" }),
    new Paragraph({ children: [new TextRun({ text: "Website: ", bold: true }), new TextRun(resultaat.url)] }),
    new Paragraph({ children: [new TextRun({ text: "Scandatum: ", bold: true }), new TextRun(datum)] }),
    new Paragraph({ children: [new TextRun({ text: "Security Score: ", bold: true }), new TextRun(`${resultaat.score}/100 (${resultaat.rating})`)] }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "Technische Bevindingen", heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ text: "" }),
  ];

  for (const [key, naam] of Object.entries(CATEGORIEEN)) {
    const items = resultaat.resultaten[key] || [];
    if (!items.length) continue;
    secties.push(new Paragraph({ text: naam, heading: HeadingLevel.HEADING_3 }));
    const rijen = [tabelRij(["Check", "Status", "Risico", "Aanbeveling"], true)];
    for (const item of items) {
      rijen.push(tabelRij([item.check || "", item.status || "", RISICO_LABEL[item.risico] || item.risico || "", item.aanbeveling || "-"], false));
    }
    secties.push(new Table({ rows: rijen, width: { size: 100, type: WidthType.PERCENTAGE } }));
    secties.push(new Paragraph({ text: "" }));
  }

  if (resultaat.rapport?.topActies?.length) {
    secties.push(new Paragraph({ text: "Actieplan", heading: HeadingLevel.HEADING_2 }), new Paragraph({ text: "" }));
    resultaat.rapport.topActies.forEach((actie, i) => {
      secties.push(
        new Paragraph({ children: [new TextRun({ text: `${i + 1}. [${(actie.prioriteit||"").toUpperCase()}] `, bold: true }), new TextRun({ text: actie.actie || "", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: actie.waarom || "", italics: true })], indent: { left: 360 } }),
        new Paragraph({ text: "" }),
      );
    });
  }

  secties.push(new Paragraph({ text: "" }), new Paragraph({ children: [new TextRun({ text: "Gegenereerd door AI Defender — Boei17", italics: true, color: "888888", size: 16 })], alignment: AlignmentType.CENTER }));

  const doc = new Document({ sections: [{ properties: {}, children: secties }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `ai-defender-dev-${resultaat.url.replace(/https?:\/\//, "").replace(/[^a-z0-9]/gi, "-")}-${new Date().toISOString().slice(0,10)}.docx`);
}

export function exporteerDevRapportPdf(resultaat) {
  const datum = new Date(resultaat.scanDatum).toLocaleString("nl-NL");
  let tabellenHtml = "";
  for (const [key, naam] of Object.entries(CATEGORIEEN)) {
    const items = resultaat.resultaten[key] || [];
    if (!items.length) continue;
    tabellenHtml += `<h3 style="margin:16px 0 8px;font-size:13px;color:#374151;">${naam}</h3><table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px;"><tr style="background:#F3F4F6;"><th style="padding:6px 8px;text-align:left;border:1px solid #E5E7EB;">Check</th><th style="padding:6px 8px;text-align:left;border:1px solid #E5E7EB;">Status</th><th style="padding:6px 8px;text-align:left;border:1px solid #E5E7EB;">Risico</th><th style="padding:6px 8px;text-align:left;border:1px solid #E5E7EB;">Aanbeveling</th></tr>`;
    for (const item of items) {
      const k = RISICO_CSS[item.risico] || "#6B7280";
      tabellenHtml += `<tr><td style="padding:5px 8px;border:1px solid #E5E7EB;">${item.check||""}</td><td style="padding:5px 8px;border:1px solid #E5E7EB;">${item.status||""}</td><td style="padding:5px 8px;border:1px solid #E5E7EB;color:${k};font-weight:600;">${(item.risico||"").toUpperCase()}</td><td style="padding:5px 8px;border:1px solid #E5E7EB;">${item.aanbeveling||"-"}</td></tr>`;
    }
    tabellenHtml += `</table>`;
  }
  let actiesHtml = "";
  if (resultaat.rapport?.topActies?.length) {
    actiesHtml = `<h2 style="font-size:15px;margin:20px 0 10px;color:#111827;border-bottom:2px solid #E5E7EB;padding-bottom:6px;">Actieplan</h2>`;
    resultaat.rapport.topActies.forEach((actie, i) => {
      const k = RISICO_CSS[actie.prioriteit] || "#6B7280";
      actiesHtml += `<div style="margin-bottom:10px;padding:10px;border-left:3px solid ${k};background:#F9FAFB;border-radius:0 4px 4px 0;"><div style="font-size:11px;font-weight:700;color:${k};text-transform:uppercase;margin-bottom:3px;">${actie.prioriteit||""}</div><div style="font-size:12px;font-weight:600;margin-bottom:3px;">${i+1}. ${actie.actie||""}</div><div style="font-size:11px;color:#6B7280;">${actie.waarom||""}</div></div>`;
    });
  }
  const scoreKleur = resultaat.score >= 70 ? "#16A34A" : resultaat.score >= 50 ? "#CA8A04" : "#DC2626";
  const html = `<div style="font-family:Arial,sans-serif;color:#111827;padding:20px;max-width:900px;"><div style="border-bottom:3px solid #0F172A;padding-bottom:12px;margin-bottom:16px;"><h1 style="font-size:20px;margin:0 0 4px;">AI Defender — Technisch Security Rapport</h1><div style="font-size:12px;color:#6B7280;">Gegenereerd door Boei17</div></div><div style="display:flex;justify-content:space-between;background:#F3F4F6;padding:12px;border-radius:6px;margin-bottom:16px;"><div><div style="font-size:11px;color:#6B7280;">Website</div><div style="font-size:13px;font-weight:600;">${resultaat.url}</div></div><div><div style="font-size:11px;color:#6B7280;">Scandatum</div><div style="font-size:13px;">${datum}</div></div><div><div style="font-size:11px;color:#6B7280;">Score</div><div style="font-size:24px;font-weight:700;color:${scoreKleur};">${resultaat.score}/100 (${resultaat.rating})</div></div></div><h2 style="font-size:15px;margin:0 0 10px;color:#111827;border-bottom:2px solid #E5E7EB;padding-bottom:6px;">Technische Bevindingen</h2>${tabellenHtml}${actiesHtml}<div style="margin-top:20px;text-align:center;font-size:10px;color:#9CA3AF;">AI Defender — Boei17 — ${datum}</div></div>`;
  const el = document.createElement("div");
  el.innerHTML = html;
  document.body.appendChild(el);
  import("html2pdf.js").then(({ default: html2pdf }) => {
    html2pdf().set({ margin: 10, filename: `ai-defender-dev-${resultaat.url.replace(/https?:\/\//, "").replace(/[^a-z0-9]/gi, "-")}-${new Date().toISOString().slice(0,10)}.pdf`, html2canvas: { scale: 2 }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" } }).from(el).save().then(() => document.body.removeChild(el));
  });
}

export async function exporteerKlantRapportDocx(resultaat, ontvanger) {
  const datum = new Date(resultaat.scanDatum).toLocaleString("nl-NL");
  const alleResultaten = Object.values(resultaat.resultaten).flat();
  const scoreKleur = resultaat.score >= 70 ? "16A34A" : resultaat.score >= 50 ? "CA8A04" : "DC2626";

  const secties = [
    new Paragraph({ text: `Beveiligingsrapport — ${resultaat.url}`, heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: "" }),
    new Paragraph({ children: [new TextRun({ text: "Website: ", bold: true }), new TextRun(resultaat.url)] }),
    new Paragraph({ children: [new TextRun({ text: "Datum: ", bold: true }), new TextRun(datum)] }),
    new Paragraph({ children: [new TextRun({ text: "Opgesteld door: ", bold: true }), new TextRun("Boei17") ] }),
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [
        new TextRun({ text: "Beveiligingsscore: ", bold: true }),
        new TextRun({ text: `${resultaat.score}/100 (${resultaat.rating})`, bold: true, color: scoreKleur }),
      ],
    }),
    new Paragraph({ text: "" }),
  ];

  if (resultaat.rapport?.samenvatting) {
    secties.push(
      new Paragraph({ text: "Samenvatting", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: "" }),
      new Paragraph({ text: resultaat.rapport.samenvatting }),
      new Paragraph({ text: "" }),
    );
  }

  const kritiek = alleResultaten.filter(r => r.risico === "kritiek");
  const hoog = alleResultaten.filter(r => r.risico === "hoog");
  const gemiddeld = alleResultaten.filter(r => r.risico === "gemiddeld");

  if (kritiek.length || hoog.length) {
    secties.push(new Paragraph({ text: "Wat vereist direct aandacht?", heading: HeadingLevel.HEADING_2 }), new Paragraph({ text: "" }));
    for (const item of [...kritiek, ...hoog]) {
      const uitleg = RISICO_UITLEG[item.risico] || "";
      secties.push(
        new Paragraph({ children: [new TextRun({ text: `${item.risico === "kritiek" ? "🔴" : "🟠"} ${item.check}`, bold: true })] }),
        new Paragraph({ text: item.aanbeveling || "" }),
        new Paragraph({ children: [new TextRun({ text: uitleg, italics: true, color: "6B7280" })] }),
        new Paragraph({ text: "" }),
      );
    }
  }

  if (gemiddeld.length) {
    secties.push(new Paragraph({ text: "Overige verbeterpunten", heading: HeadingLevel.HEADING_2 }), new Paragraph({ text: "" }));
    for (const item of gemiddeld) {
      secties.push(
        new Paragraph({ children: [new TextRun({ text: `🟡 ${item.check}`, bold: true })] }),
        new Paragraph({ text: item.aanbeveling || "" }),
        new Paragraph({ text: "" }),
      );
    }
  }

  const positief = alleResultaten.filter(r => r.risico === "ok");
  if (positief.length) {
    secties.push(new Paragraph({ text: "Wat gaat goed?", heading: HeadingLevel.HEADING_2 }), new Paragraph({ text: "" }));
    for (const item of positief) {
      secties.push(new Paragraph({ children: [new TextRun({ text: `✅ ${item.check}` })] }));
    }
    secties.push(new Paragraph({ text: "" }));
  }

  secties.push(
    new Paragraph({ text: "" }),
    new Paragraph({ text: "Volgende stappen", heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "Ons team staat klaar om de bovenstaande punten voor u op te lossen. Neem contact op met Boei17 voor een vrijblijvend gesprek over de aanpak." }),
    new Paragraph({ text: "" }),
    new Paragraph({ children: [new TextRun({ text: "Boei17", bold: true })] }),
    new Paragraph({ text: "boei17.nl | 06-24300899" }),
    new Paragraph({ text: "" }),
    new Paragraph({ children: [new TextRun({ text: "Gegenereerd door AI Defender", italics: true, color: "888888", size: 16 })], alignment: AlignmentType.CENTER }),
  );

  const doc = new Document({ sections: [{ properties: {}, children: secties }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `ai-defender-klant-${resultaat.url.replace(/https?:\/\//, "").replace(/[^a-z0-9]/gi, "-")}-${new Date().toISOString().slice(0,10)}.docx`);
}

export function exporteerKlantRapportPdf(resultaat) {
  const datum = new Date(resultaat.scanDatum).toLocaleString("nl-NL");
  const alleResultaten = Object.values(resultaat.resultaten).flat();
  const scoreKleur = resultaat.score >= 70 ? "#16A34A" : resultaat.score >= 50 ? "#CA8A04" : "#DC2626";
  const kritiek = alleResultaten.filter(r => r.risico === "kritiek");
  const hoog = alleResultaten.filter(r => r.risico === "hoog");
  const gemiddeld = alleResultaten.filter(r => r.risico === "gemiddeld");
  const positief = alleResultaten.filter(r => r.risico === "ok");

  let urgentHtml = "";
  if (kritiek.length || hoog.length) {
    urgentHtml = `<h2 style="font-size:15px;margin:20px 0 10px;color:#111827;border-bottom:2px solid #E5E7EB;padding-bottom:6px;">Wat vereist direct aandacht?</h2>`;
    for (const item of [...kritiek, ...hoog]) {
      const k = RISICO_CSS[item.risico] || "#EA580C";
      const uitleg = RISICO_UITLEG[item.risico] || "";
      urgentHtml += `<div style="margin-bottom:12px;padding:12px;border-left:4px solid ${k};background:#FFF8F8;border-radius:0 6px 6px 0;"><div style="font-size:13px;font-weight:700;margin-bottom:4px;">${item.check}</div><div style="font-size:12px;margin-bottom:6px;">${item.aanbeveling||""}</div><div style="font-size:11px;color:#6B7280;font-style:italic;">${uitleg}</div></div>`;
    }
  }

  let gemiddeldHtml = "";
  if (gemiddeld.length) {
    gemiddeldHtml = `<h2 style="font-size:15px;margin:20px 0 10px;color:#111827;border-bottom:2px solid #E5E7EB;padding-bottom:6px;">Overige verbeterpunten</h2>`;
    for (const item of gemiddeld) {
      gemiddeldHtml += `<div style="margin-bottom:8px;padding:10px;border-left:4px solid #CA8A04;background:#FFFBF0;border-radius:0 6px 6px 0;"><div style="font-size:13px;font-weight:600;margin-bottom:3px;">${item.check}</div><div style="font-size:12px;">${item.aanbeveling||""}</div></div>`;
    }
  }

  let positiefHtml = "";
  if (positief.length) {
    positiefHtml = `<h2 style="font-size:15px;margin:20px 0 10px;color:#111827;border-bottom:2px solid #E5E7EB;padding-bottom:6px;">Wat gaat goed?</h2><div style="display:flex;flex-wrap:wrap;gap:8px;">`;
    for (const item of positief) {
      positiefHtml += `<div style="padding:6px 12px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:20px;font-size:12px;color:#15803D;">✅ ${item.check}</div>`;
    }
    positiefHtml += `</div>`;
  }

  const html = `<div style="font-family:Arial,sans-serif;color:#111827;padding:24px;max-width:800px;"><div style="background:#0F172A;padding:20px 24px;border-radius:8px;margin-bottom:20px;"><div style="display:flex;justify-content:space-between;align-items:center;"><div><div style="font-size:11px;color:#94A3B8;margin-bottom:4px;">BEVEILIGINGSRAPPORT</div><div style="font-size:18px;font-weight:700;color:#F1F5F9;">${resultaat.url}</div><div style="font-size:12px;color:#64748B;margin-top:4px;">${datum} · Opgesteld door Boei17</div></div><div style="text-align:center;"><div style="font-size:36px;font-weight:700;color:${scoreKleur};">${resultaat.score}</div><div style="font-size:20px;font-weight:700;color:${scoreKleur};">${resultaat.rating}</div><div style="font-size:11px;color:#94A3B8;">/ 100</div></div></div></div>${resultaat.rapport?.samenvatting ? `<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:16px;margin-bottom:20px;"><p style="font-size:13px;line-height:1.7;margin:0;">${resultaat.rapport.samenvatting}</p></div>` : ""}${urgentHtml}${gemiddeldHtml}${positiefHtml}<div style="margin-top:24px;padding:16px;background:#F8FAFC;border-radius:6px;"><p style="font-size:13px;font-weight:600;margin:0 0 6px;">Volgende stappen</p><p style="font-size:12px;color:#374151;margin:0;">Ons team staat klaar om de bovenstaande punten voor u op te lossen. Neem contact op voor een vrijblijvend gesprek.</p><p style="font-size:12px;font-weight:600;margin:8px 0 0;">Boei17 · boei17.nl · 06-24300899</p></div><div style="margin-top:16px;text-align:center;font-size:10px;color:#9CA3AF;">Gegenereerd door AI Defender</div></div>`;

  const el = document.createElement("div");
  el.innerHTML = html;
  document.body.appendChild(el);
  import("html2pdf.js").then(({ default: html2pdf }) => {
    html2pdf().set({ margin: 10, filename: `ai-defender-klant-${resultaat.url.replace(/https?:\/\//, "").replace(/[^a-z0-9]/gi, "-")}-${new Date().toISOString().slice(0,10)}.pdf`, html2canvas: { scale: 2 }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" } }).from(el).save().then(() => document.body.removeChild(el));
  });
}

export function maakKlantmailTekst(resultaat, taal, ontvanger) {
  const datum = new Date(resultaat.scanDatum).toLocaleDateString(taal === "nl" ? "nl-NL" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  const url = resultaat.url.replace(/https?:\/\//, "").replace(/\/$/, "");
  const alleResultaten = Object.values(resultaat.resultaten).flat();
  const aantalProblemen = alleResultaten.filter(r => r.risico !== "ok" && r.risico !== "info").length;
  const aantalKritiek = alleResultaten.filter(r => r.risico === "kritiek").length;
  const topActies = (resultaat.rapport?.topActies || []).slice(0, 3);
  const naam = ontvanger ? ontvanger : (taal === "nl" ? "daar" : "there");
  const aanhef = ontvanger ? `Beste ${ontvanger},` : (taal === "nl" ? "Beste," : "Dear Sir/Madam,");

  if (taal === "nl") {
    return `Onderwerp: Beveiligingsrapport ${url} — ${datum}

${aanhef}

Wij hebben een beveiligingsscan uitgevoerd op ${url} en sturen u hierbij de resultaten.

📊 Beveiligingsscore: ${resultaat.score}/100 (${resultaat.rating})

${resultaat.rapport?.samenvatting || ""}

Wij hebben ${aantalProblemen} verbeterpunten gevonden${aantalKritiek > 0 ? `, waarvan ${aantalKritiek} direct aandacht vereist` : ""}. De belangrijkste aanbevelingen zijn:

${topActies.map((a, i) => `${i + 1}. ${a.actie}\n   ${a.waarom}`).join("\n\n")}

In de bijlage vindt u een uitgebreid rapport met alle bevindingen en een concreet actieplan. Ons team staat klaar om u te helpen met het oplossen van deze punten.

Neem gerust contact op voor een vrijblijvend gesprek.

Met vriendelijke groet,

Het Boei17 team
boei17.nl | 06-24300899`;
  } else {
    return `Subject: Security Report ${url} — ${datum}

Dear ${ontvanger || "Sir/Madam"},

We have conducted a security scan of ${url} and are pleased to share the results.

📊 Security Score: ${resultaat.score}/100 (${resultaat.rating})

${resultaat.rapport?.samenvatting || ""}

We found ${aantalProblemen} improvement points${aantalKritiek > 0 ? `, of which ${aantalKritiek} require immediate attention` : ""}. The main recommendations are:

${topActies.map((a, i) => `${i + 1}. ${a.actie}\n   ${a.waarom}`).join("\n\n")}

Please find attached a detailed report with all findings and a concrete action plan. Our team is ready to help you address these issues.

Please feel free to contact us for a no-obligation conversation.

Kind regards,

The Boei17 team
boei17.nl | 06-24300899`;
  }
}