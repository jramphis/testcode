// Build script for "Maternity Without Walls" (Infinity Forge policy paper).
// Usage: node build.js [content.js] [output.docx]
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, PageBreak, TabStopType, TabStopPosition,
  PositionalTab, PositionalTabAlignment, PositionalTabRelativeTo, PositionalTabLeader,
  ExternalHyperlink,
} = require("docx");
const { lintText } = require("./lint_us");

const contentFile = process.argv[2] || "content.js";
const outFile = process.argv[3] || "Maternity_Without_Walls_PR_Policy_Paper.docx";

// ---- Style gate: British spelling fails the build ----
(function styleGate() {
  let bad = 0;
  for (const f of [contentFile, "build.js"]) {
    const hits = lintText(fs.readFileSync(path.join(__dirname, f), "utf8"));
    if (hits.length) {
      bad += hits.length;
      console.error(`STYLE FAIL ${f}: ` + [...new Set(hits.map(h => `${h.uk} -> ${h.us}`))].join(", "));
    }
  }
  if (bad) { console.error("Build aborted. Run: node lint_us.js --fix " + contentFile); process.exit(1); }
})();

const C = require(path.join(__dirname, contentFile));

// ---- Layout constants ----
const PAGE_W = 12240, PAGE_H = 15840, MARGIN = 1440;
const CONTENT_W = PAGE_W - 2 * MARGIN; // 9360
const FONT = "Arial";
const INK = "1A1A2E";     // Infinity Forge dark
const ACCENT = "D4621B";  // Infinity Forge orange
const MUTED = "666666";
const RULE = "CCCCCC";
const BODY = 21;          // 10.5pt
const SMALL = 18;

// ---- Helpers ----
function runs(text, opts = {}) {
  // Inline markup: **bold**, _italic_. Citations like [12] are rendered in accent color.
  const out = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_|\[\d+\](?:\[\d+\])*)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), font: FONT, size: opts.size || BODY, color: opts.color, italics: opts.italics, bold: opts.bold }));
    const t = m[0];
    if (t.startsWith("**")) out.push(new TextRun({ text: t.slice(2, -2), font: FONT, size: opts.size || BODY, bold: true, color: opts.color }));
    else if (t.startsWith("_")) out.push(new TextRun({ text: t.slice(1, -1), font: FONT, size: opts.size || BODY, italics: true, color: opts.color }));
    else out.push(new TextRun({ text: t, font: FONT, size: opts.size || BODY, color: ACCENT }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), font: FONT, size: opts.size || BODY, color: opts.color, italics: opts.italics, bold: opts.bold }));
  return out;
}

function para(text, opts = {}) {
  return new Paragraph({
    children: runs(text, opts),
    spacing: { after: opts.after ?? 140, before: opts.before ?? 0, line: opts.line ?? 288 },
    alignment: opts.align || AlignmentType.LEFT,
    indent: opts.indent,
    keepNext: opts.keepNext,
  });
}

function h1(text, pageBreak = true) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, size: 32, bold: true, font: FONT, color: INK })],
    spacing: { before: 240, after: 200 },
    ...(pageBreak ? { pageBreakBefore: true } : {}),
    keepNext: true,
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, size: 25, bold: true, font: FONT, color: ACCENT })],
    spacing: { before: 260, after: 120 },
    keepNext: true,
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, size: 22, bold: true, font: FONT, color: INK })],
    spacing: { before: 200, after: 100 },
    keepNext: true,
  });
}

function callout(text) {
  return new Paragraph({
    children: runs(text, { size: BODY }),
    spacing: { before: 120, after: 200, line: 288 },
    indent: { left: 360, right: 360 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 12 } },
    shading: { fill: "FAF6F2", type: ShadingType.CLEAR },
  });
}

let listInstance = 0;
function list(items, numbered = false) {
  listInstance += 1;
  const inst = listInstance;
  return items.map(t => new Paragraph({
    numbering: { reference: numbered ? "numbers" : "bullets", level: 0, instance: inst },
    children: runs(t),
    spacing: { after: 90, line: 276 },
  }));
}

const border = { style: BorderStyle.SINGLE, size: 4, color: RULE };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 70, bottom: 70, left: 100, right: 100 };

function table(spec) {
  // spec: { caption, widths:[fractions], header:[...], rows:[[...]], note }
  const total = spec.widths.reduce((a, b) => a + b, 0);
  const widths = spec.widths.map(w => Math.round(CONTENT_W * w / total));
  const diff = CONTENT_W - widths.reduce((a, b) => a + b, 0);
  widths[widths.length - 1] += diff;
  const mk = (txt, i, isHeader, shade) => new TableCell({
    borders, width: { size: widths[i], type: WidthType.DXA }, margins: cellMargins,
    shading: { fill: isHeader ? INK : shade, type: ShadingType.CLEAR },
    children: String(txt).split("\n").map(line => new Paragraph({
      children: isHeader
        ? [new TextRun({ text: line, bold: true, color: "FFFFFF", font: FONT, size: SMALL })]
        : runs(line, { size: SMALL }),
      spacing: { after: 40, line: 252 },
    })),
  });
  const rows = [];
  rows.push(new TableRow({ tableHeader: true, cantSplit: true, children: spec.header.map((h, i) => mk(h, i, true)) }));
  spec.rows.forEach((r, ri) => {
    const shade = ri % 2 === 0 ? "FFFFFF" : "F7F5F2";
    rows.push(new TableRow({ cantSplit: true, children: r.map((c, i) => mk(c, i, false, shade)) }));
  });
  const out = [];
  if (spec.caption) out.push(new Paragraph({
    children: [new TextRun({ text: spec.caption, bold: true, font: FONT, size: BODY, color: INK })],
    spacing: { before: 160, after: 100 }, keepNext: true,
  }));
  out.push(new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths, rows }));
  out.push(new Paragraph({
    children: spec.note ? runs(spec.note, { size: SMALL, color: MUTED, italics: true }) : [],
    spacing: { before: 60, after: 160 },
  }));
  return out;
}

function sourceEntry(n, text, url) {
  const kids = [
    new TextRun({ text: `[${n}] `, font: FONT, size: SMALL, bold: true, color: ACCENT }),
    new TextRun({ text: text + " ", font: FONT, size: SMALL }),
  ];
  if (url) kids.push(new ExternalHyperlink({ link: url, children: [new TextRun({ text: url, font: FONT, size: SMALL, color: "2E75B6", underline: {} })] }));
  return new Paragraph({ children: kids, spacing: { after: 70, line: 252 }, indent: { left: 540, hanging: 540 } });
}

function buildManualToc(entries) {
  const indents = { 1: 0, 2: 360, 3: 720 };
  const sizes = { 1: 21, 2: 19, 3: 18 };
  const bolds = { 1: true, 2: false, 3: false };
  const colors = { 1: INK, 2: "3A3A4E", 3: MUTED };
  return entries.map(e => new Paragraph({
    spacing: { after: e.level === 1 ? 70 : 30, before: e.level === 1 ? 80 : 0 },
    indent: { left: indents[e.level] || 0 },
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    children: [new TextRun({ text: e.text, bold: bolds[e.level], font: FONT, size: sizes[e.level], color: colors[e.level] })],
  }));
}

// ---- Render blocks ----
function renderBlocks(blocks) {
  const out = [];
  for (const b of blocks) {
    if (typeof b === "string") { out.push(para(b)); continue; }
    if (b.h2) { out.push(h2(b.h2)); continue; }
    if (b.h3) { out.push(h3(b.h3)); continue; }
    if (b.p) { out.push(para(b.p, b.opts || {})); continue; }
    if (b.callout) { out.push(callout(b.callout)); continue; }
    if (b.list) { out.push(...list(b.list, !!b.numbered)); continue; }
    if (b.table) { out.push(...table(b.table)); continue; }
    if (b.sources) { b.sources.forEach((s, i) => out.push(sourceEntry(i + 1, s.text, s.url))); continue; }
    if (b.pagebreak) { out.push(new Paragraph({ children: [new PageBreak()] })); continue; }
    throw new Error("Unknown block: " + JSON.stringify(b).slice(0, 80));
  }
  return out;
}

// ---- Title page ----
const M = C.meta;
const titlePage = [
  new Paragraph({ spacing: { before: 2400, after: 200 }, children: [new TextRun({ text: "POLICY PAPER", font: FONT, size: 20, bold: true, color: ACCENT, characterSpacing: 60 })] }),
  new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: M.title, font: FONT, size: 56, bold: true, color: INK })] }),
  new Paragraph({ spacing: { after: 480 }, children: [new TextRun({ text: M.subtitle, font: FONT, size: 28, color: "3A3A4E" })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 12 } } }),
  new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: M.status, font: FONT, size: 22, bold: true, color: INK })] }),
  new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: M.org, font: FONT, size: 22, color: "3A3A4E" })] }),
  new Paragraph({ spacing: { after: 720 }, children: [new TextRun({ text: M.date, font: FONT, size: 22, color: "3A3A4E" })] }),
  ...M.scopeNote.map(t => para(t, { size: SMALL, color: MUTED, line: 264, after: 100 })),
];

// ---- Contents ----
const tocEntries = [];
for (const s of C.sections) {
  tocEntries.push({ level: 1, text: s.h1 });
  for (const b of s.body) if (b.h2) tocEntries.push({ level: 2, text: b.h2 });
}
const contents = [
  new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "Contents", font: FONT, size: 32, bold: true, color: INK })], spacing: { after: 200 } }),
  ...buildManualToc(tocEntries),
];

// ---- Body ----
const body = [];
for (const s of C.sections) {
  body.push(h1(s.h1, true));
  body.push(...renderBlocks(s.body));
}

const doc = new Document({
  creator: M.org, title: M.title, description: M.subtitle,
  styles: {
    default: { document: { run: { font: FONT, size: BODY } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: FONT, color: INK }, paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 25, bold: true, font: FONT, color: ACCENT }, paragraph: { spacing: { before: 260, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: FONT, color: INK }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
      { id: "PageFooter", name: "Page Footer", basedOn: "Normal", run: { size: 16, font: FONT, color: "888888" } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
      { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } } },
    headers: { default: new Header({ children: [new Paragraph({
      children: [new TextRun({ text: `${M.title}  |  ${M.org.split("|")[0].trim()} Policy Paper`, font: FONT, size: 16, color: "888888" })],
      alignment: AlignmentType.RIGHT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 4 } },
    })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      style: "PageFooter",
      children: [
        new TextRun({ text: `${M.status}  |  ${M.date}`, font: FONT, size: 16, color: "888888" }),
        new TextRun({ children: [new PositionalTab({ alignment: PositionalTabAlignment.RIGHT, relativeTo: PositionalTabRelativeTo.MARGIN, leader: PositionalTabLeader.NONE }), "Page "], font: FONT, size: 16, color: "888888" }),
        new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: "888888" }),
      ],
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 4 } },
    })] }) },
    children: [...titlePage, ...contents, ...body],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(path.isAbsolute(outFile) ? outFile : path.join(__dirname, outFile), buf);
  console.log("Wrote", outFile, `(${(buf.length / 1024).toFixed(0)} KB)`);
});
