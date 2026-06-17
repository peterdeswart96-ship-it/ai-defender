import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from "docx";
import { saveAs } from "file-saver";

const RISICO_LABEL = {
  kritiek: "KRITIEK",
  hoog: "HOOG",
  gemiddeld: "GEMIDDELD",
  laag: "LAAG",
  ok: "OK",
  info: "INFO",
};

const RISICO_CSS = {
  kritiek: "#DC2626",
  hoog: "#EA580C",
  gemiddeld: "#CA8A04",
  laag: "#16A34A",
  ok: "#15803D",
  info: "#2563EB",
};

function maakTabelRij(cells, header) {
  return new TableRow({
    children: cells.map(tekst => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: tekst, bold: header, size: header ? 20 : 18 })],
      })],
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      },
    })),
    tableHeader: header,
  });
}

export async function exporteerDevRapportDocx(resultaat) {
  const datum = new Date(resultaat.scanDatum).toLocaleString("nl-NL");
  const secties = [];

  secties.push(
    new Paragraph({ text: "AI Defender — Technisch Security Rapport", heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: "" }),
    new Paragraph({ children: [new TextRun({ text: "Website: ", bold: true }), new TextRun(resultaat.url)] }),
    new Paragraph({ children: [new TextRun({ text: "Scandatum: ", bold: true }), new TextRun(datum)] }),
    new Paragraph({ children: [new TextRun({ text: "Security Score: ", bold: true }), new TextRun(`${resultaat.score}/100 (${resultaat.rating})`)] }),
    new Paragraph({ text: "" }),
  );

  secties.push(
    new Paragraph({ text: "Technische Bevindingen", heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ text: "" }),
  );

  const categorieen = {
    https: "SSL/TLS & HTTPS",
    headers: "HTTP Security Headers",
    wordpress: "WordPress",
    dns: "DNS & E-mail beveiliging",
    bestanden: "Gevoelige bestanden",
  };

  for (const [key, naam] of Object.entries(categorieen)) {
    const items = resultaat.resultaten[key] || [];
    if (items.length === 0) continue;

    secties.push(new Paragraph({ text: naam, heading: HeadingLevel.HEADING_3 }));

    const tabelRijen = [maakTabelRij(["Check", "Status", "Risico", "Aanbeveling"], true)];
    for (const item of items) {
      tabelRijen.push(maakTabelRij([
        item.check || "",
        item.status || "",
        RISICO_LABEL[item.risico] || item.risico || "",
        item.aanbeveling || "-",
      ], false));
    }

    secties.push(new Table({
      rows: tabelRijen,
      width: { size: 100, type: WidthType.PERCENTAGE },
    }));
    secties.push(new Paragraph({ text: "" }));
  }

  if (resultaat.rapport && resultaat.rapport.topActies && resultaat.rapport.topActies.length > 0) {
    secties.push(
      new Paragraph({ text: "Actieplan", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: "" }),
    );

    for (let i = 0; i < resultaat.rapport.topActies.length; i++) {
      const actie = resultaat.rapport.topActies[i];
      secties.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}. [${(actie.prioriteit || "").toUpperCase()}] `, bold: true }),
            new TextRun({ text: actie.actie || "", bold: true }),
          ],
        }),
        new Paragraph({
          children: [new TextRun({ text: actie.waarom || "", italics: true })],
          indent: { left: 360 },
        }),
        new Paragraph({ text: "" }),
      );
    }
  }

  secties.push(
    new Paragraph({ text: "" }),
    new Paragraph({
      children: [new TextRun({ text: "Gegenereerd door AI Defender — Boei17", italics: true, color: "888888", size: 16 })],
      alignment: AlignmentType.CENTER,
    }),
  );

  const doc = new Document({
    sections: [{ properties: {}, children: secties }],
  });

  const blob = await Packer.toBlob(doc);
  const bestandsnaam = `ai-defender-rapport-${resultaat.url.replace(/https?:\/\//, "").replace(/[^a-z0-9]/gi, "-")}-${new Date().toISOString().slice(0, 10)}.docx`;
  saveAs(blob, bestandsnaam);
}

export function exporteerDevRapportPdf(resultaat) {
  const datum = new Date(resultaat.scanDatum).toLocaleString("nl-NL");

  const categorieen = {
    https: "SSL/TLS & HTTPS",
    headers: "HTTP Security Headers",
    wordpress: "WordPress",
    dns: "DNS & E-mail beveiliging",
    bestanden: "Gevoelige bestanden",
  };

  let tabellenHtml = "";
  for (const [key, naam] of Object.entries(categorieen)) {
    const items = resultaat.resultaten[key] || [];
    if (items.length === 0) continue;
    tabellenHtml += `<h3 style="margin:16px 0 8px;font-size:13px;color:#374151;">${naam}</h3>`;
    tabellenHtml += `<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px;">`;
    tabellenHtml += `<tr style="background:#F3F4F6;"><th style="padding:6px 8px;text-align:left;border:1px solid #E5E7EB;">Check</th><th style="padding:6px 8px;text-align:left;border:1px solid #E5E7EB;">Status</th><th style="padding:6px 8px;text-align:left;border:1px solid #E5E7EB;">Risico</th><th style="padding:6px 8px;text-align:left;border:1px solid #E5E7EB;">Aanbeveling</th></tr>`;
    for (const item of items) {
      const kleur = RISICO_CSS[item.risico] || "#6B7280";
      tabellenHtml += `<tr><td style="padding:5px 8px;border:1px solid #E5E7EB;">${item.check || ""}</td><td style="padding:5px 8px;border:1px solid #E5E7EB;">${item.status || ""}</td><td style="padding:5px 8px;border:1px solid #E5E7EB;color:${kleur};font-weight:600;">${(item.risico || "").toUpperCase()}</td><td style="padding:5px 8px;border:1px solid #E5E7EB;">${item.aanbeveling || "-"}</td></tr>`;
    }
    tabellenHtml += `</table>`;
  }

  let actiesHtml = "";
  if (resultaat.rapport && resultaat.rapport.topActies && resultaat.rapport.topActies.length > 0) {
    actiesHtml = `<h2 style="font-size:15px;margin:20px 0 10px;color:#111827;border-bottom:2px solid #E5E7EB;padding-bottom:6px;">Actieplan</h2>`;
    resultaat.rapport.topActies.forEach((actie, i) => {
      const kleur = RISICO_CSS[actie.prioriteit] || "#6B7280";
      actiesHtml += `<div style="margin-bottom:10px;padding:10px;border-left:3px solid ${kleur};background:#F9FAFB;">`;
      actiesHtml += `<div style="font-size:11px;font-weight:700;color:${kleur};text-transform:uppercase;margin-bottom:3px;">${actie.prioriteit || ""}</div>`;
      actiesHtml += `<div style="font-size:12px;font-weight:600;margin-bottom:3px;">${i + 1}. ${actie.actie || ""}</div>`;
      actiesHtml += `<div style="font-size:11px;color:#6B7280;">${actie.waarom || ""}</div>`;
      actiesHtml += `</div>`;
    });
  }

  const scoreKleur = resultaat.score >= 70 ? "#16A34A" : resultaat.score >= 50 ? "#CA8A04" : "#DC2626";

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111827;padding:20px;max-width:900px;">
      <div style="border-bottom:3px solid #0F172A;padding-bottom:12px;margin-bottom:16px;">
        <h1 style="font-size:20px;margin:0 0 4px;">AI Defender — Technisch Security Rapport</h1>
        <div style="font-size:12px;color:#6B7280;">Gegenereerd door Boei17</div>
      </div>
      <div style="display:flex;justify-content:space-between;background:#F3F4F6;padding:12px;border-radius:6px;margin-bottom:16px;">
        <div><div style="font-size:11px;color:#6B7280;">Website</div><div style="font-size:13px;font-weight:600;">${resultaat.url}</div></div>
        <div><div style="font-size:11px;color:#6B7280;">Scandatum</div><div style="font-size:13px;">${datum}</div></div>
        <div><div style="font-size:11px;color:#6B7280;">Score</div><div style="font-size:24px;font-weight:700;color:${scoreKleur};">${resultaat.score}/100 (${resultaat.rating})</div></div>
      </div>
      <h2 style="font-size:15px;margin:0 0 10px;color:#111827;border-bottom:2px solid #E5E7EB;padding-bottom:6px;">Technische Bevindingen</h2>
      ${tabellenHtml}
      ${actiesHtml}
      <div style="margin-top:20px;text-align:center;font-size:10px;color:#9CA3AF;">AI Defender — Boei17 — ${datum}</div>
    </div>`;

  const element = document.createElement("div");
  element.innerHTML = html;
  document.body.appendChild(element);

  const bestandsnaam = `ai-defender-rapport-${resultaat.url.replace(/https?:\/\//, "").replace(/[^a-z0-9]/gi, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`;

  import("html2pdf.js").then(({ default: html2pdf }) => {
    html2pdf().set({
      margin: 10,
      filename: bestandsnaam,
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    }).from(element).save().then(() => {
      document.body.removeChild(element);
    });
  });
}

export function maakKlantmailTekst(resultaat, taal) {
  const datum = new Date(resultaat.scanDatum).toLocaleDateString(
    taal === "nl" ? "nl-NL" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" }
  );
  const url = resultaat.url.replace(/https?:\/\//, "").replace(/\/$/, "");

  const alleResultaten = Object.values(resultaat.resultaten).flat();
  const aantalProblemen = alleResultaten.filter(r => r.risico !== "ok" && r.risico !== "info").length;
  const aantalKritiek = alleResultaten.filter(r => r.risico === "kritiek").length;

  const topActies = (resultaat.rapport && resultaat.rapport.topActies ? resultaat.rapport.topActies : []).slice(0, 3);

  if (taal === "nl") {
    return `Onderwerp: Beveiligingsrapport ${url} — ${datum}

Beste,

Naar aanleiding van onze beveiligingsscan van ${url} sturen wij u hierbij de resultaten.

BEVEILIGINGSSCORE: ${resultaat.score}/100 (${resultaat.rating})

${resultaat.rapport && resultaat.rapport.samenvatting ? resultaat.rapport.samenvatting : ""}

WAT HEBBEN WE GEVONDEN?
We hebben ${aantalProblemen} verbeterpunten gevonden${aantalKritiek > 0 ? `, waarvan ${aantalKritiek} direct aandacht vereist` : ""}.

TOP AANBEVELINGEN:
${topActies.map((a, i) => `${i + 1}. ${a.actie}\n   ${a.waarom}`).join("\n\n")}

WAT ZIJN DE VOLGENDE STAPPEN?
Wij adviseren om de bovenstaande punten op te pakken. Ons team staat klaar om u hierbij te helpen. Neem gerust contact op voor een vrijblijvend gesprek.

Met vriendelijke groet,

Het Boei17 team
boei17.nl | 06-24300899`;
  } else {
    return `Subject: Security Report ${url} — ${datum}

Dear Sir/Madam,

Following our security scan of ${url}, please find the results below.

SECURITY SCORE: ${resultaat.score}/100 (${resultaat.rating})

${resultaat.rapport && resultaat.rapport.samenvatting ? resultaat.rapport.samenvatting : ""}

WHAT DID WE FIND?
We found ${aantalProblemen} improvement points${aantalKritiek > 0 ? `, of which ${aantalKritiek} require immediate attention` : ""}.

TOP RECOMMENDATIONS:
${topActies.map((a, i) => `${i + 1}. ${a.actie}\n   ${a.waarom}`).join("\n\n")}

NEXT STEPS:
We recommend addressing the points above. Our team is ready to assist you. Please feel free to contact us for a no-obligation conversation.

Kind regards,

The Boei17 team
boei17.nl | 06-24300899`;
  }
}
