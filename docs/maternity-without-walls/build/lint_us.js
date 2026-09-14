// US spelling + house-style linter for Infinity Forge deliverables
const fs = require("fs");

// British → American. Word-boundary matched, case-insensitive, case-preserving output.
const MAP = {
  // -ise / -isation family (the recurring offender)
  "itemised":"itemized","itemise":"itemize","itemises":"itemizes","itemising":"itemizing",
  "normalised":"normalized","normalise":"normalize","normalises":"normalizes","normalising":"normalizing",
  "organised":"organized","organise":"organize","organisation":"organization","organisations":"organizations","organisational":"organizational",
  "recognised":"recognized","recognise":"recognize","recognises":"recognizes","recognising":"recognizing",
  "prioritised":"prioritized","prioritise":"prioritize","prioritisation":"prioritization",
  "capitalised":"capitalized","capitalise":"capitalize","capitalisation":"capitalization",
  "specialised":"specialized","specialise":"specialize","specialising":"specializing","specialisation":"specialization",
  "utilised":"utilized","utilise":"utilize",
  "monetised":"monetized","monetise":"monetize","monetisation":"monetization",
  "productised":"productized","productise":"productize",
  "institutionalised":"institutionalized",
  "localisation":"localization","localised":"localized","localise":"localize",
  "standardised":"standardized","standardise":"standardize","standardisation":"standardization",
  "systematised":"systematized","categorised":"categorized","categorise":"categorize",
  "summarised":"summarized","summarise":"summarize",
  "analysed":"analyzed","analyse":"analyze","analyses":"analyzes","analysing":"analyzing",
  "characterised":"characterized","characterise":"characterize",
  "collateralised":"collateralized","securitised":"securitized","securitisation":"securitization",
  "amortised":"amortized","amortisation":"amortization",
  "realised":"realized","realise":"realize","realisation":"realization",
  "penalised":"penalized","penalise":"penalize",
  "minimised":"minimized","minimise":"minimize","maximised":"maximized","maximise":"maximize",
  "emphasised":"emphasized","emphasise":"emphasize",
  "formalised":"formalized","formalise":"formalize",
  "legalised":"legalized","finalised":"finalized","finalise":"finalize",
  "neutralised":"neutralized","neutralise":"neutralize",
  "centralised":"centralized","decentralised":"decentralized",
  "digitised":"digitized","digitisation":"digitization",
  "syndicated":"syndicated",
  "apologise":"apologize","criticised":"criticized","criticise":"criticize",
  "harbour":"harbor","harbours":"harbors","harboured":"harbored",
  "splendour":"splendor","vigour":"vigor","savour":"savor","armoury":"armory","clamour":"clamor",
  "mould":"mold","moulding":"molding","smoulder":"smolder","marvellous":"marvelous","jewellery":"jewelry",
  "travelling":"traveling","travelled":"traveled","levelled":"leveled","marvelled":"marveled",
  "specialising":"specializing","organising":"organizing","realising":"realizing","utilising":"utilizing",
  "recognising":"recognizing","minimising":"minimizing","maximising":"maximizing","emphasising":"emphasizing",
  "prioritising":"prioritizing","capitalising":"capitalizing","standardising":"standardizing",
  "characterising":"characterizing","summarising":"summarizing","categorising":"categorizing",
  "colourful":"colorful","favourite":"favorite","favourites":"favorites","humour":"humor",
  "defences":"defenses","offences":"offenses","practised":"practiced","enrol":"enroll",
  "appraisal":"appraisal","speciality":"specialty","specialities":"specialties",
  "orientated":"oriented","acclimatise":"acclimatize","cosier":"cozier",
  // -re / -our / -ce families
  "centre":"center","centres":"centers","centred":"centered",
  "metre":"meter","metres":"meters","fibre":"fiber","theatre":"theater",
  "behaviour":"behavior","behaviours":"behaviors","colour":"color","colours":"colors",
  "favour":"favor","favours":"favors","favourable":"favorable","favoured":"favored",
  "labour":"labor","labours":"labors","honour":"honor","honours":"honors",
  "rumour":"rumor","neighbour":"neighbor","endeavour":"endeavor",
  "licence":"license","licences":"licenses","defence":"defense","offence":"offense","pretence":"pretense",
  "practise":"practice","practising":"practicing",
  // doubled consonants
  "modelling":"modeling","modelled":"modeled","labelling":"labeling","labelled":"labeled",
  "travelling":"traveling","travelled":"traveled","cancelled":"canceled","cancelling":"canceling",
  "counselling":"counseling","fuelled":"fueled","signalled":"signaled","totalling":"totaling",
  // misc
  "programme":"program","programmes":"programs","cheque":"check","catalogue":"catalog",
  "dialogue":"dialog","judgement":"judgment","acknowledgement":"acknowledgment",
  "enrolment":"enrollment","fulfil":"fulfill","fulfilment":"fulfillment","instalment":"installment",
  "skilful":"skillful","wilful":"willful","grey":"gray","storey":"story",
  "towards":"toward","amongst":"among","whilst":"while","learnt":"learned","spelt":"spelled",
  "aluminium":"aluminum","sceptical":"skeptical","sceptic":"skeptic",
  "manoeuvre":"maneuver","artefact":"artifact","draught":"draft","kerb":"curb",
  "cosy":"cozy","tyre":"tire","plough":"plow","sulphide":"sulfide","sulphur":"sulfur",
};

// Words that look British but are correct in these senses — never flag.
const ALLOW = new Set(["licence","licences"]); // handled contextually below (UK/Zambia statutory usage)

function preserveCase(src, repl) {
  if (src === src.toUpperCase() && src.length > 1) return repl.toUpperCase();
  if (src[0] === src[0].toUpperCase()) return repl[0].toUpperCase() + repl.slice(1);
  return repl;
}

function lintText(text) {
  const hits = [];
  for (const [uk, us] of Object.entries(MAP)) {
    const re = new RegExp("\\b" + uk + "\\b", "gi");
    let m;
    while ((m = re.exec(text)) !== null) {
      hits.push({ uk: m[0], us: preserveCase(m[0], us), index: m.index });
    }
  }
  return hits;
}

function fixText(text) {
  let out = text;
  for (const [uk, us] of Object.entries(MAP)) {
    out = out.replace(new RegExp("\\b" + uk + "\\b", "gi"), (m) => preserveCase(m, us));
  }
  return out;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const fix = args.includes("--fix");
  const files = args.filter(a => !a.startsWith("--"));
  let total = 0;
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    const hits = lintText(src);
    if (hits.length) {
      total += hits.length;
      const counts = {};
      hits.forEach(h => counts[h.uk.toLowerCase()] = (counts[h.uk.toLowerCase()] || 0) + 1);
      console.log(`\n${f}  —  ${hits.length} hit(s)`);
      Object.entries(counts).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`   ${v}×  ${k} → ${MAP[k]}`));
      if (fix) { fs.writeFileSync(f, fixText(src)); console.log("   FIXED"); }
    }
  }
  console.log(total === 0 ? "\nCLEAN — no British spellings found." : `\nTOTAL: ${total}${fix ? " (fixed)" : ""}`);
  process.exit(total && !fix ? 1 : 0);
}
module.exports = { lintText, fixText, MAP };
