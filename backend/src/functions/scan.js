const { app } = require("@azure/functions");
const https = require("https");
const dns = require("dns").promises;

function httpsGet(url, opties) {
  opties = opties || {};
  return new Promise(function(resolve, reject) {
    var req = https.get(url, { timeout: 10000 }, function(res) {
      var data = "";
      res.on("data", function(chunk) { data += chunk; });
      res.on("end", function() { resolve({ status: res.statusCode, headers: res.headers, body: data }); });
    });
    req.on("error", reject);
    req.on("timeout", function() { req.destroy(); reject(new Error("Timeout")); });
  });
}

async function checkHttps(url) {
  var resultaten = [];
  var basis = new URL(url);
  try {
    var res = await httpsGet("http://" + basis.hostname + basis.pathname);
    var redirect = res.status >= 300 && res.status < 400 && res.headers.location && res.headers.location.startsWith("https");
    resultaten.push({ check: "HTTP naar HTTPS redirect", status: redirect ? "ok" : "gevonden", risico: redirect ? "ok" : "gemiddeld", aanbeveling: redirect ? null : "Stel een redirect in van HTTP naar HTTPS" });
  } catch(e) {
    resultaten.push({ check: "HTTP naar HTTPS redirect", status: "onbekend", risico: "laag", aanbeveling: null });
  }
  try {
    var res2 = await httpsGet(url);
    var hsts = res2.headers["strict-transport-security"];
    resultaten.push({ check: "HSTS", status: hsts ? "ok" : "ontbreekt", risico: hsts ? "ok" : "hoog", waarde: hsts || null, aanbeveling: hsts ? null : "Voeg Strict-Transport-Security header toe" });
  } catch(e) {
    resultaten.push({ check: "HSTS", status: "onbekend", risico: "laag", aanbeveling: null });
  }
  return resultaten;
}

async function checkHeaders(url) {
  var resultaten = [];
  var headers = {};
  try {
    var res = await httpsGet(url);
    headers = res.headers;
  } catch(e) {
    return [{ check: "HTTP headers", status: "onbereikbaar", risico: "hoog", aanbeveling: "Website niet bereikbaar" }];
  }
  var checks = [
    { naam: "Content-Security-Policy", header: "content-security-policy", risico: "hoog" },
    { naam: "X-Frame-Options", header: "x-frame-options", risico: "gemiddeld" },
    { naam: "X-Content-Type-Options", header: "x-content-type-options", risico: "gemiddeld" },
    { naam: "Referrer-Policy", header: "referrer-policy", risico: "laag" },
    { naam: "Permissions-Policy", header: "permissions-policy", risico: "laag" },
    { naam: "Strict-Transport-Security", header: "strict-transport-security", risico: "hoog" }
  ];
  for (var i = 0; i < checks.length; i++) {
    var c = checks[i];
    var waarde = headers[c.header];
    resultaten.push({ check: c.naam, status: waarde ? "ok" : "ontbreekt", risico: waarde ? "ok" : c.risico, waarde: waarde || null, aanbeveling: waarde ? null : "Voeg de " + c.naam + " header toe" });
  }
  return resultaten;
}

async function checkWordPress(url) {
  var resultaten = [];
  var basis = new URL(url);
  var origin = basis.protocol + "//" + basis.hostname;
  var isWordPress = false;
  try {
    var res = await httpsGet(url);
    isWordPress = res.body.includes("wp-content") || res.body.includes("wp-includes");
    var versieMatch = res.body.match(/ver=(\d+\.\d+\.?\d*)/);
    var wpVersie = versieMatch ? versieMatch[1] : null;
    resultaten.push({ check: "WordPress detectie", status: isWordPress ? "gevonden" : "niet gevonden", risico: isWordPress ? "info" : "ok", waarde: wpVersie ? "Versie: " + wpVersie : null, aanbeveling: null });
  } catch(e) {
    resultaten.push({ check: "WordPress detectie", status: "onbekend", risico: "laag", aanbeveling: null });
  }
  if (!isWordPress) return resultaten;
  try {
    var r1 = await httpsGet(origin + "/wp-login.php");
    var bereikbaar = r1.status === 200;
    resultaten.push({ check: "wp-login.php bereikbaar", status: bereikbaar ? "gevonden" : "ok", risico: bereikbaar ? "gemiddeld" : "ok", aanbeveling: bereikbaar ? "Beperk toegang tot wp-login.php of voeg twee-factor-authenticatie toe" : null });
  } catch(e) {
    resultaten.push({ check: "wp-login.php", status: "onbekend", risico: "laag", aanbeveling: null });
  }
  try {
    var r2 = await httpsGet(origin + "/xmlrpc.php");
    var actief = r2.status === 200 || r2.status === 405;
    resultaten.push({ check: "xmlrpc.php actief", status: actief ? "gevonden" : "ok", risico: actief ? "hoog" : "ok", aanbeveling: actief ? "Schakel xmlrpc.php uit - veelgebruikt aanvalsvector" : null });
  } catch(e) {
    resultaten.push({ check: "xmlrpc.php", status: "ok", risico: "ok", aanbeveling: null });
  }
  try {
    var r3 = await httpsGet(origin + "/readme.html");
    var zichtbaar = r3.status === 200;
    resultaten.push({ check: "readme.html zichtbaar", status: zichtbaar ? "gevonden" : "ok", risico: zichtbaar ? "laag" : "ok", aanbeveling: zichtbaar ? "Verwijder of blokkeer readme.html" : null });
  } catch(e) {
    resultaten.push({ check: "readme.html", status: "ok", risico: "ok", aanbeveling: null });
  }
  try {
    var r4 = await httpsGet(origin + "/wp-json/wp/v2/users");
    var publiek = r4.status === 200;
    resultaten.push({ check: "User enumeration via wp-json", status: publiek ? "gevonden" : "ok", risico: publiek ? "gemiddeld" : "ok", aanbeveling: publiek ? "Beperk de wp-json API of schakel user enumeration uit" : null });
  } catch(e) {
    resultaten.push({ check: "wp-json user enumeration", status: "ok", risico: "ok", aanbeveling: null });
  }
  return resultaten;
}

async function checkDns(url) {
  var resultaten = [];
  var hostname = new URL(url).hostname;
  var domein = hostname.replace(/^www\./, "");
  try {
    var records = await dns.resolveTxt(domein);
    var spf = records.flat().find(function(r) { return r.startsWith("v=spf1"); });
    resultaten.push({ check: "SPF record", status: spf ? "ok" : "ontbreekt", risico: spf ? "ok" : "hoog", waarde: spf || null, aanbeveling: spf ? null : "Voeg een SPF record toe om e-mail spoofing te voorkomen" });
  } catch(e) {
    resultaten.push({ check: "SPF record", status: "niet gevonden", risico: "hoog", aanbeveling: "Voeg een SPF record toe" });
  }
  try {
    var records2 = await dns.resolveTxt("_dmarc." + domein);
    var dmarc = records2.flat().find(function(r) { return r.startsWith("v=DMARC1"); });
    resultaten.push({ check: "DMARC record", status: dmarc ? "ok" : "ontbreekt", risico: dmarc ? "ok" : "hoog", waarde: dmarc || null, aanbeveling: dmarc ? null : "Voeg een DMARC record toe" });
  } catch(e) {
    resultaten.push({ check: "DMARC record", status: "niet gevonden", risico: "hoog", aanbeveling: "Voeg een DMARC record toe" });
  }
  return resultaten;
}

async function checkGevoeligeBestanden(url) {
  var resultaten = [];
  var basis = new URL(url);
  var origin = basis.protocol + "//" + basis.hostname;
  var bestanden = [
    { pad: "/.env", naam: ".env bestand" },
    { pad: "/wp-config.php.bak", naam: "wp-config.php backup" },
    { pad: "/debug.log", naam: "debug.log" },
    { pad: "/.git/config", naam: ".git/config" }
  ];
  for (var i = 0; i < bestanden.length; i++) {
    try {
      var res = await httpsGet(origin + bestanden[i].pad);
      if (res.status === 200) {
        resultaten.push({ check: bestanden[i].naam + " publiek toegankelijk", status: "gevonden", risico: "kritiek", aanbeveling: "Blokkeer toegang tot " + bestanden[i].pad + " direct" });
      }
    } catch(e) {}
  }
  if (resultaten.length === 0) {
    resultaten.push({ check: "Gevoelige bestanden", status: "ok", risico: "ok", aanbeveling: null });
  }
  return resultaten;
}

function berekenScore(alleResultaten) {
  var score = 100;
  for (var i = 0; i < alleResultaten.length; i++) {
    var r = alleResultaten[i];
    if (r.risico === "kritiek") score -= 25;
    else if (r.risico === "hoog") score -= 10;
    else if (r.risico === "gemiddeld") score -= 5;
    else if (r.risico === "laag") score -= 2;
  }
  score = Math.max(0, score);
  var rating = "A";
  if (score < 30) rating = "F";
  else if (score < 50) rating = "D";
  else if (score < 70) rating = "C";
  else if (score < 85) rating = "B";
  return { score: score, rating: rating };
}

async function genereerRapport(url, scanResultaten, taal) {
  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY niet ingesteld");
  var alleResultaten = Object.values(scanResultaten).flat();
  var scoreData = berekenScore(alleResultaten);
  var prompt = "Je bent AI Defender, een security scan-assistent voor Boei17.\nGenereer een beknopt security rapport in " + (taal === "nl" ? "het Nederlands" : "English") + " voor: " + url + "\n\nSecurity Score: " + scoreData.score + "/100 (" + scoreData.rating + ")\n\nScan resultaten:\n" + JSON.stringify(scanResultaten, null, 2) + "\n\nGeef het rapport terug als JSON met deze structuur:\n{\n  \"samenvatting\": \"max 3 zinnen voor de websiteeigenaar, geen jargon\",\n  \"kritiekeBevindingen\": [\"bevinding 1\"],\n  \"positieveBevindingen\": [\"wat goed gaat\"],\n  \"topActies\": [\n    { \"prioriteit\": \"kritiek|hoog|gemiddeld|laag\", \"actie\": \"wat te doen\", \"waarom\": \"waarom belangrijk\" }\n  ]\n}\nGeef ALLEEN de JSON terug, geen uitleg eromheen.";
  var response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1500, messages: [{ role: "user", content: prompt }] })
  });
  var data = await response.json();
  var tekst = data.content && data.content[0] ? data.content[0].text : "{}";
  try { return JSON.parse(tekst); } catch(e) { return { samenvatting: tekst, kritiekeBevindingen: [], positieveBevindingen: [], topActies: [] }; }
}

app.http("scan", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async function(request, context) {
    var corsHeaders = {
      "Access-Control-Allow-Origin": request.headers.get("origin") || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") {
      return { status: 204, headers: corsHeaders };
    }
    var body;
    try { body = await request.json(); } catch(e) {
      return { status: 400, headers: corsHeaders, body: JSON.stringify({ fout: "Ongeldige JSON" }) };
    }
    var url = body.url;
    var taal = body.taal || "nl";
    if (!url) return { status: 400, headers: corsHeaders, body: JSON.stringify({ fout: "URL is verplicht" }) };
    try { new URL(url); } catch(e) {
      return { status: 422, headers: corsHeaders, body: JSON.stringify({ fout: "Ongeldige URL" }) };
    }
    context.log("Scan gestart voor: " + url);
    try {
      var results = await Promise.all([checkHttps(url), checkHeaders(url), checkWordPress(url), checkDns(url), checkGevoeligeBestanden(url)]);
      var scanResultaten = { https: results[0], headers: results[1], wordpress: results[2], dns: results[3], bestanden: results[4] };
      var alleResultaten = Object.values(scanResultaten).flat();
      var scoreData = berekenScore(alleResultaten);
      var rapport = await genereerRapport(url, scanResultaten, taal);
      return {
        status: 200,
        headers: Object.assign({}, corsHeaders, { "Content-Type": "application/json" }),
        body: JSON.stringify({ url: url, scanDatum: new Date().toISOString(), score: scoreData.score, rating: scoreData.rating, resultaten: scanResultaten, rapport: rapport })
      };
    } catch(err) {
      context.log("Scan fout: " + err.message);
      return { status: 500, headers: corsHeaders, body: JSON.stringify({ fout: "Scan mislukt", details: err.message }) };
    }
  }
});
