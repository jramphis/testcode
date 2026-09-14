# Maternity Without Walls (Infinity Forge policy paper)

Final draft, 14 September 2026. Deliverables:

- `Maternity_Without_Walls_PR_Policy_Paper.docx` and `.pdf`
- `VERIFICATION_NOTES.md`: what the 13–14 September verification pass changed and what stays open
- `build/`: reproducible source. `orig_content.json` is the parsed 13 September decision draft;
  `c*.js` are the rewritten sections; `content.js` assembles them and applies checked in-place
  edits (each must match exactly once); `build.js` renders the DOCX with docx-js.

Rebuild:

```bash
cd build && npm install && node build.js content.js ../Maternity_Without_Walls_PR_Policy_Paper.docx
soffice --headless --convert-to pdf --outdir .. ../Maternity_Without_Walls_PR_Policy_Paper.docx
```

The build refuses British spellings (`lint_us.js`) and restarts every numbered list.
