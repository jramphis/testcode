// Assembles the final content from the parsed decision draft plus revised sections and checked edits.
const fs = require("fs");
const path = require("path");
const orig = JSON.parse(fs.readFileSync(path.join(__dirname, "orig_content.json"), "utf8"));
const S = {};
for (const s of orig.sections) S[s.h1.split(".")[0].trim()] = s;

const c1 = require("./c1_decision.js");
const c2 = require("./c2_diagnosis.js");
const c3 = require("./c3_evidence.js");
const c4 = require("./c4_architecture.js");
const { section10, appendixA } = require("./c10_verification.js");
const newSources = require("./new_sources.js");

// ---- Checked edits: each `from` must occur exactly once in the section's text blocks ----
function edit(section, from, to) {
  let hits = 0;
  const visit = (v) => {
    if (typeof v === "string") { const n = v.split(from).length - 1; hits += n; return n ? v.split(from).join(to) : v; }
    if (Array.isArray(v)) return v.map(visit);
    if (v && typeof v === "object") { const o = {}; for (const k of Object.keys(v)) o[k] = visit(v[k]); return o; }
    return v;
  };
  section.body = visit(section.body);
  if (hits !== 1) throw new Error(`Edit matched ${hits} times in "${section.h1}": ${from.slice(0, 70)}...`);
}

// Section 5
const s5 = S["5"];
edit(s5,
  "The APR-DRG transition that Plan Vital began on 1 October 2025 and must complete by July 2027 is the opening [21]. ASES should set the relative weight for an uncomplicated cesarean without a documented medical indication equal to the weight for an uncomplicated vaginal birth, or adopt a single blended birth rate, so that the hospital's revenue is indifferent to mode; and it should require its managed-care organizations to pay physicians a single global obstetric fee regardless of mode, with the fee level raised to at least the 75%-of-Medicare floor that federal law already requires and verified in the annual access report to Congress.",
  "The APR-DRG system that Plan Vital adopted on 1 January 2026 under state plan amendment PR-26-0001, with a first-year transition pool that expires at the end of 2026, is the opening [21][105][106]. Because the relative weights are Solventum's national weights and are not set locally, the instrument is not a re-weighting but a policy adjustor of the kind every DRG system carries: ASES should pay an uncomplicated cesarean without a documented medical indication at the payment for an uncomplicated vaginal birth, or adopt a single blended birth rate, so that the hospital's revenue is indifferent to mode; and it should require its managed-care organizations to pay physicians a single global obstetric fee regardless of mode, with the fee level raised to at least the 75%-of-Medicare floor that federal law already requires, financed through the $300 million directed payment that carries that floor, and verified in the annual access report to Congress [109].");
edit(s5,
  "Live-video parity is extended to audio-only and asynchronous contacts for maternity care, since a mountain municipality after a storm has a phone signal before it has a video signal [22].",
  "Ley 8-2025 already requires payment parity for services delivered by telephone; ASES writes that parity into its MCO contracts explicitly for maternity contacts and extends it to asynchronous contacts, since a mountain municipality after a storm has a phone signal before it has a video signal [22][117].");
edit(s5,
  "without which the entire Plan Vital program contracts by a quarter or more [20].",
  "without which the entire Plan Vital program contracts by a quarter or more [20]. The vehicle exists: the Territories Health Equity Act (H.R. 6494) would remove the cap and the match limitation outright, and the Governor's request for a $4.4 billion floor with 5% annual growth is the fallback; either should carry maternity-specific language authorizing the payments in this section [113][114].");
edit(s5, "Nurse-midwives and, once licensed, direct-entry midwives are paid 100% of the physician fee",
  "Nurse-midwives, once the Ley 254-2015 regulations exist, and direct-entry midwives, once licensed, are paid 100% of the physician fee");

// Section 6
const s6 = S["6"];
edit(s6,
  "Puerto Rico needs a single statute that does five things. It grants nurse-midwives licensed under Ley 254-2015 independent practice authority,",
  "Before any statute, one administrative act: the Junta Examinadora de Enfermería issues the implementing regulations for the Enfermera Obstétrica-Partera title that Ley 254-2015 created and has lacked for a decade, so that nurse-midwives who already hold or can obtain the license can be credentialed by hospitals and paid by Plan Vital within months rather than years [86][138]. Then Puerto Rico needs a single statute that does five things. It grants nurse-midwives licensed under Ley 254-2015 independent practice authority,");
edit(s6,
  "Puerto Rico belongs to neither the Nurse Licensure Compact, which the Virgin Islands has enacted and Guam has partly implemented, nor the Interstate Medical Licensure Compact, which covers 44 states, DC, and Guam [83][84].",
  "Puerto Rico belongs to neither the Nurse Licensure Compact, which 43 jurisdictions including Guam and the Virgin Islands have enacted, nor the Interstate Medical Licensure Compact, which covers 44 states, DC, and Guam after Alaska's accession in June 2026, and no accession bill for either has been filed [83][84][147][148]. Ley 102-2025, the universal license recognition law of August 2025, gives an out-of-state physician with three years of licensed practice a 30-day board response or a provisional license, and a July 2026 law allows provisional health licenses during emergencies; both help, but neither lets a mainland nurse-midwife practice on her home license or a mainland obstetrician staff the tele-obstetric hub without a Puerto Rico license [141][155].");
edit(s6,
  "Obstetrics carries the highest liability exposure of any specialty and Puerto Rico has extended protection only to public institutions and trainees [28].",
  "Obstetrics carries the highest liability exposure of any specialty and Puerto Rico has extended protection only to obstetricians in public institutions (Ley 229-2004) and to trainees (Ley 94-2023) [28][140].");
edit(s6,
  "The UPR obstetrics residency expands from five to eight positions with a Plan Vital service commitment attached to the additional slots, financed through HRSA teaching health center or Commonwealth funds; this is slow but signals permanence [12].",
  "Puerto Rico's three obstetrics residencies already train about fourteen physicians a year, so the pipeline action is not more slots but retention: a Plan Vital service commitment and loan repayment attached to every publicly funded slot, and hub laborist positions offered to graduating residents before they leave, financed through HRSA teaching health center or Commonwealth funds [12][135][136].");
edit(s6,
  "And the Act 60 Chapter 2 physician tax decree, which the Fiscal Oversight Board froze in 2024 with more than 2,300 applications stalled [26][98], is reopened narrowly for obstetricians, anesthesiologists, nurse-midwives, and neonatologists who commit to hub or community-unit service and Plan Vital participation; a hundred decrees at the Board's own cost estimate is a rounding error against the closures they would prevent.",
  "And the Act 60 Chapter 2 physician tax decree, which the Fiscal Oversight Board halted after Ley 47-2020 broadened it, leaving more than 2,000 applications stalled by 2022, and which DDEC's own evaluation judged not viable as a general incentive [26][98][142], is reopened narrowly through the channel the statute already contains: a Departamento de Salud certification of pressing need under section 45152 for obstetricians, anesthesiologists, nurse-midwives, and neonatologists who commit to hub or community-unit service and Plan Vital participation [143]. PS 15, which would condition decrees on serving Plan Vital patients and which the Secretary of Health endorsed in March 2026, is the legislative vehicle if one is needed; the broad reactivation bills PS 849 and PC 332, costed by the legislative budget office at $268–295 million a year, are not [144][145]. A hundred targeted decrees are a rounding error against the closures they would prevent.");

// Section 7
const s7 = S["7"];
edit(s7, "specifically the Butterfly Gestational Age Tool cleared in March 2026 on the iQ3 probe,",
  "specifically the Butterfly Gestational Age Tool cleared under 510(k) K252148 on 27 March 2026 on the iQ3 probe [154],");
edit(s7, "Freeze-dried plasma, licensed in July 2026, stores at room temperature",
  "Freeze-dried plasma, licensed in July 2026 according to the decision draft's FDA database query (not re-verified in this pass), stores at room temperature");
edit(s7, "510(k) March 2026; one prospective study, n=400", "510(k) K252148, 27 March 2026; one prospective study, n=400");
edit(s7, "FDA licensed July 2026", "FDA licensed July 2026 (not re-verified)");
edit(s7, "FAA Part 108 pending; uncontrolled Rwanda data", "FAA Part 108 pending as of the draft (not re-verified); uncontrolled Rwanda data");
edit(s7, "FDA approved May 2024; strong evidence; existing codes", "FDA approved May 2024 (not re-verified); strong evidence; existing codes");

// Section 8
const s8 = S["8"];
edit(s8,
  "The sequence is driven by two clocks: the July 2027 end of the APR-DRG transition, which is when mode-neutral weights must be locked, and the 30 September 2027",
  "The sequence is driven by two clocks: the expiry of the APR-DRG first-year transition pool at the end of 2026, which is when a mode-neutral birth adjustor can be attached to the rebased hospital rates, and the 30 September 2027");
edit(s8, "Release Vital obstetric payment data; set mode-neutral APR-DRG weights and single global fee;",
  "Release Vital obstetric payment data; issue the Ley 254-2015 nurse-midwife regulations; attach a mode-neutral birth adjustor to the APR-DRG and set a single global fee;");
edit(s8, "targeted Act 60 reopening", "targeted Act 60 reopening through section 45152 certification or PS 15");

// Section 9
const s9 = S["9"];
edit(s9, "If the education partnership stalls, international recruitment runs into immigration walls,",
  "If the Junta never issues the Ley 254-2015 regulations, the education partnership stalls, international recruitment runs into immigration walls,");
edit(s9, "The doula benefit exists and nobody uses it. This is the modal outcome in the states [46].",
  "The doula benefit exists on paper and nobody uses it. This is the modal outcome in the states, and it is already Puerto Rico's: a benefit reported as active by March of Dimes that no ASES document, rate, or MCO listing confirms [2][46].");
edit(s5, "Education pipeline: nurse-midwifery program, FM-OB fellowship, residency expansion, preceptors",
  "Education pipeline: nurse-midwifery program, FM-OB fellowship, residency retention commitments, preceptors");
// Bold the lead sentence of each failure mode
s9.body = s9.body.map((b, i) => (typeof b === "string" && i > 0) ? b.replace(/^([^.]+\.)/, "**$1**") : b);

// ---- Table widths for tables carried over from the draft ----
const widthsByCaption = {
  "Table 3": [3.0, 4.2, 2.2],
  "Table 4": [2.3, 2.7, 1.6, 1.4, 1.3],
  "Table 5": [1.5, 5.6, 1.9],
};
function applyWidths(sec) {
  for (const b of sec.body) if (b.table) {
    const key = (b.table.caption || "").slice(0, 7);
    b.table.widths = widthsByCaption[key] || Array(b.table.header.length).fill(1);
  }
}
[s5, s6, s7, s8, s9].forEach(applyWidths);

// ---- Appendix B ----
const B = S["Appendix B"];
const sources = [];
for (const p of B.body.slice(1)) {
  const m = /^\[(\d+)\]\s*(.*)$/s.exec(p);
  if (!m) throw new Error("Unparsed source: " + p.slice(0, 60));
  const n = parseInt(m[1], 10);
  const rest = m[2].trim();
  const u = rest.lastIndexOf("http");
  const text = u >= 0 ? rest.slice(0, u).trim() : rest;
  const url = u >= 0 ? rest.slice(u).trim() : "";
  if (n !== sources.length + 1) throw new Error("Source numbering gap at " + n);
  sources.push({ text, url });
}
if (sources.length !== 102) throw new Error("Expected 102 draft sources, got " + sources.length);
const allSources = sources.concat(newSources);
const appendixB = {
  h1: "Appendix B. Sources",
  body: [
    "Sources [1] through [102] are those of the decision draft, numbered in the order first cited there. Sources [103] through [" + allSources.length + "] were added during the verification pass of 13–14 September 2026 and are numbered by topic. Where two sources conflict, the body text says so and states which figure is used. A limit applies to every source added at verification: it was located and its indexed text read through a search engine, but the document itself could not be opened from the research environment, so quotations and figures from those sources should be checked against the document before publication. Section 10 lists the items that must still be verified against primary records before money is committed.",
    { sources: allSources },
  ],
};

module.exports = {
  meta: {
    title: "Maternity Without Walls",
    subtitle: "A Cost-Effective Architecture for Universal Obstetric and Reproductive Health Access in Puerto Rico",
    status: "Final draft for Ramphis Castro",
    org: "Infinity Forge  |  Caguas, Puerto Rico",
    date: "14 September 2026",
    scopeNote: [
      "**Scope note.** This paper answers a single question: what is the most cost-effective path to maximum access to obstetric, pregnancy, postpartum, and reproductive health services in Puerto Rico, assuming any regulatory, financing, workforce, or technological option is on the table. It is built from a three-track research effort (Puerto Rico baseline; global evidence on delivery and payment models; frontier technology and workforce pathways) completed on 13 September 2026, with every load-bearing figure sourced in Appendix B. Facts and inferences are separated throughout. Where a figure could not be verified it is marked as such rather than omitted.",
      "**Status of this version.** The decision draft of 13 September 2026 closed with thirteen items to verify before committing money. This version reports the result of that verification pass (Section 10), corrects the body where the pass found the draft wrong, and lists the items that remain open with the office that holds each answer. The recommendation is unchanged.",
    ],
  },
  sections: [c1, c2, c3, c4, s5, s6, s7, s8, s9, section10, appendixA, appendixB],
};
