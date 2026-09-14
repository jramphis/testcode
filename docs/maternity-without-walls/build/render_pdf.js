// Render content.js to PDF through headless Chromium (fallback when LibreOffice Writer is unavailable).
// Usage: node render_pdf.js [content.js] [output.pdf]
const fs = require("fs");
const path = require("path");
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const { lintText } = require("./lint_us");

const contentFile = process.argv[2] || "content.js";
const outFile = process.argv[3] || "Maternity_Without_Walls_PR_Policy_Paper.pdf";
const hits = lintText(fs.readFileSync(path.join(__dirname, contentFile), "utf8"));
if (hits.length) { console.error("STYLE FAIL: " + [...new Set(hits.map(h => `${h.uk} -> ${h.us}`))].join(", ")); process.exit(1); }
const C = require(path.join(__dirname, contentFile));
const M = C.meta;

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function inline(text) {
  let t = esc(text);
  t = t.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  t = t.replace(/_([^_]+)_/g, "<i>$1</i>");
  t = t.replace(/(\[\d+\](?:\[\d+\])*)/g, '<span class="cite">$1</span>');
  return t;
}
function table(spec) {
  const total = spec.widths.reduce((a, b) => a + b, 0);
  let h = spec.caption ? `<p class="caption">${esc(spec.caption)}</p>` : "";
  h += `<table><colgroup>${spec.widths.map(w => `<col style="width:${(100 * w / total).toFixed(2)}%">`).join("")}</colgroup>`;
  h += `<thead><tr>${spec.header.map(c => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>`;
  for (const r of spec.rows) h += `<tr>${r.map(c => `<td>${String(c).split("\n").map(inline).join("<br>")}</td>`).join("")}</tr>`;
  h += "</tbody></table>";
  if (spec.note) h += `<p class="note">${inline(spec.note)}</p>`;
  return h;
}
function blocks(list) {
  let h = "";
  for (const b of list) {
    if (typeof b === "string") { h += `<p>${inline(b)}</p>`; continue; }
    if (b.h2) { h += `<h2>${esc(b.h2)}</h2>`; continue; }
    if (b.h3) { h += `<h3>${esc(b.h3)}</h3>`; continue; }
    if (b.p) { h += `<p>${inline(b.p)}</p>`; continue; }
    if (b.callout) { h += `<div class="callout">${inline(b.callout)}</div>`; continue; }
    if (b.list) { const tag = b.numbered ? "ol" : "ul"; h += `<${tag}>${b.list.map(i => `<li>${inline(i)}</li>`).join("")}</${tag}>`; continue; }
    if (b.table) { h += table(b.table); continue; }
    if (b.sources) { h += `<div class="sources">${b.sources.map((s, i) => `<p class="src"><span class="num">[${i + 1}]</span> ${esc(s.text)} ${s.url ? `<a href="${esc(s.url)}">${esc(s.url)}</a>` : ""}</p>`).join("")}</div>`; continue; }
    if (b.pagebreak) { h += '<div class="pb"></div>'; continue; }
  }
  return h;
}

const toc = [];
for (const s of C.sections) { toc.push({ l: 1, t: s.h1 }); for (const b of s.body) if (b.h2) toc.push({ l: 2, t: b.h2 }); }

const css = `
@page { size: Letter; margin: 0; }
html { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; color: #1A1A2E; }
body { margin: 0; line-height: 1.42; }
.page { padding: 0; }
h1 { font-size: 16pt; color: #1A1A2E; margin: 0 0 10pt 0; page-break-before: always; break-before: page; page-break-after: avoid; }
h2 { font-size: 12.5pt; color: #D4621B; margin: 14pt 0 6pt 0; page-break-after: avoid; }
h3 { font-size: 11pt; color: #1A1A2E; margin: 10pt 0 5pt 0; page-break-after: avoid; }
p { margin: 0 0 7pt 0; orphans: 3; widows: 3; }
.cite { color: #D4621B; }
.callout { border-left: 3pt solid #D4621B; background: #FAF6F2; padding: 7pt 10pt; margin: 6pt 0 10pt 0; page-break-inside: avoid; }
ol, ul { margin: 0 0 8pt 0; padding-left: 22pt; } li { margin-bottom: 4pt; }
table { width: 100%; border-collapse: collapse; font-size: 9pt; margin: 4pt 0 4pt 0; page-break-inside: auto; }
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
th { background: #1A1A2E; color: #fff; text-align: left; padding: 4pt 5pt; border: 0.5pt solid #CCCCCC; font-weight: bold; }
td { padding: 4pt 5pt; border: 0.5pt solid #CCCCCC; vertical-align: top; }
tbody tr:nth-child(even) td { background: #F7F5F2; }
.caption { font-weight: bold; margin: 8pt 0 4pt 0; page-break-after: avoid; }
.note { font-size: 9pt; color: #666; font-style: italic; margin: 3pt 0 10pt 0; }
.sources .src { font-size: 9pt; margin: 0 0 4pt 18pt; text-indent: -18pt; line-height: 1.3; }
.sources .num { color: #D4621B; font-weight: bold; }
.sources a { color: #2E75B6; text-decoration: none; word-break: break-all; }
.pb { page-break-after: always; }
.title { padding-top: 2.2in; }
.title .kicker { color: #D4621B; font-weight: bold; letter-spacing: 3pt; font-size: 10pt; margin-bottom: 8pt; }
.title h1.t { font-size: 28pt; page-break-before: auto; break-before: auto; margin: 0 0 8pt 0; }
.title .sub { font-size: 14pt; color: #3A3A4E; padding-bottom: 14pt; border-bottom: 1.5pt solid #D4621B; margin-bottom: 18pt; }
.title .meta { font-size: 11pt; color: #3A3A4E; margin: 0 0 4pt 0; }
.title .meta.b { font-weight: bold; color: #1A1A2E; }
.title .scope { margin-top: 36pt; font-size: 9pt; color: #666; line-height: 1.35; }
.toc h1 { page-break-before: always; }
.toc p { margin: 0; }
.toc .l1 { font-weight: bold; margin-top: 5pt; }
.toc .l2 { padding-left: 18pt; color: #3A3A4E; font-size: 9.5pt; }
`;

let html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(M.title)}</title><style>${css}</style></head><body>`;
html += `<div class="title"><div class="kicker">POLICY PAPER</div><h1 class="t">${esc(M.title)}</h1><div class="sub">${esc(M.subtitle)}</div>`;
html += `<p class="meta b">${esc(M.status)}</p><p class="meta">${esc(M.org)}</p><p class="meta">${esc(M.date)}</p>`;
html += `<div class="scope">${M.scopeNote.map(t => `<p>${inline(t)}</p>`).join("")}</div></div>`;
html += `<div class="toc"><h1>Contents</h1>${toc.map(e => `<p class="l${e.l}">${esc(e.t)}</p>`).join("")}</div>`;
for (const s of C.sections) html += `<h1>${esc(s.h1)}</h1>` + blocks(s.body);
html += "</body></html>";
fs.writeFileSync(path.join(__dirname, outFile.replace(/\.pdf$/, ".html")), html);

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.setContent(html, { waitUntil: "load" });
  const hdr = `<div style="font-family:Arial;font-size:7.5pt;color:#888;width:100%;padding:0 1in;box-sizing:border-box;text-align:right;border-bottom:0.5pt solid #ccc;padding-bottom:3pt;">${esc(M.title)}  |  Infinity Forge Policy Paper</div>`;
  const ftr = `<div style="font-family:Arial;font-size:7.5pt;color:#888;width:100%;padding:0 1in;box-sizing:border-box;border-top:0.5pt solid #ccc;padding-top:3pt;display:flex;justify-content:space-between;"><span>${esc(M.status)}  |  ${esc(M.date)}</span><span>Page <span class="pageNumber"></span></span></div>`;
  await p.pdf({ path: path.join(__dirname, outFile), format: "Letter", printBackground: true, displayHeaderFooter: true,
    headerTemplate: hdr, footerTemplate: ftr, margin: { top: "0.95in", bottom: "0.95in", left: "1in", right: "1in" } });
  await b.close();
  console.log("Wrote", outFile);
})().catch(e => { console.error(e); process.exit(1); });
