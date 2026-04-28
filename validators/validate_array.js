// validate_array.js  [P-19]
// Rule 1: getPartyByQualifierIndex result must have an else { addParty(...) } branch.
// Rule 2: Direct array access [literal] must be guarded by a preceding count check.
window.validators.push(function validate_array(lines, raw, issues) {

  // ── RULE 1: Party index guard ───────────────────────────────────────────
  const getIdxCall  = /([A-Za-z_][A-Za-z0-9_]*)->partyDetails->getPartyByQualifierIndex\s*\(\s*Party::([A-Za-z_]+)\s*\)/;
  const addPartyCall = /->partyDetails->addParty\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(getIdxCall);
    if (!match) continue;

    const qualifier = match[2];
    let idxIfStart = -1, idxIfEnd = -1;

    // Find "if (idx > -1)"
    for (let j = i + 1; j < Math.min(lines.length, i + 10); j++) {
      const t = lines[j].trim();
      if (/^if\s*\(\s*idx\s*[>!]=?\s*-?\d/.test(t)) {
        idxIfStart = j;
        if (t.includes('{')) {
          let depth = 0;
          for (let k = j; k < lines.length; k++) {
            for (const ch of lines[k]) { if (ch === '{') depth++; else if (ch === '}') depth--; }
            if (depth === 0 && k > j) { idxIfEnd = k; break; }
          }
        } else {
          idxIfEnd = j + 1;
        }
        break;
      }
    }
    if (idxIfStart === -1 || idxIfEnd === -1) continue;

    // Look for else { addParty } after the block
    let elseFound = false;
    for (let j = idxIfEnd; j < Math.min(lines.length, idxIfEnd + 8); j++) {
      if (/^\s*else\b/.test(lines[j])) {
        for (let k = j; k < Math.min(lines.length, j + 8); k++) {
          if (addPartyCall.test(lines[k])) { elseFound = true; break; }
        }
        break;
      }
    }

    if (!elseFound) {
      issues.push({
        type:     'Party – missing else addParty',
        severity: 'warning',
        rule:     'P-19',
        line:     idxIfStart + 1,
        snippet:  lines[idxIfStart].trim(),
        detail:   `getPartyByQualifierIndex for Party::${qualifier}: the if(idx > -1) block assigns the party pointer but has no else { addParty(...) } branch.`
      });
    }
  }

  // ── RULE 2: Unguarded numeric array index ──────────────────────────────
  // Only flag direct numeric literals: obj->arr[0], obj->arr[1], etc.
  const numIdxPattern = /\b([A-Za-z_][A-Za-z0-9_]*)->([A-Za-z_]+)\s*\[\s*(\d+)\s*\]/g;
  const countMap = {
    description: 'descNum', charge: 'chargeNum', contact: 'contactNum',
    item: 'itemNum', note: 'noteNum', tax: 'taxNum', party: 'partyNum'
  };

  for (let i = 0; i < lines.length; i++) {
    if (/^\s*\/\//.test(lines[i])) continue;
    numIdxPattern.lastIndex = 0;
    let m;
    while ((m = numIdxPattern.exec(lines[i])) !== null) {
      const obj  = m[1];
      const prop = m[2];
      const idx  = m[3];
      const numProp = countMap[prop] || (prop + 'Num');

      // Look backwards up to 20 lines for a guard: if (obj->numProp > -1) or if (obj->numProp >= 0)
      let guarded = false;
      for (let j = i - 1; j >= Math.max(0, i - 20); j--) {
        const t = lines[j].trim();
        if (/^\s*if\s*\(/.test(t) || /^\s*for\s*\(/.test(t)) {
          if (new RegExp(`\\b${obj}->${numProp}\\b`).test(t)) { guarded = true; }
          break;
        }
      }

      if (!guarded) {
        issues.push({
          type:     'Array – unguarded index access',
          severity: 'warning',
          rule:     'P-19',
          line:     i + 1,
          snippet:  lines[i].trim(),
          detail:   `${obj}->${prop}[${idx}] is accessed without a preceding guard: if (${obj}->${numProp} > -1).`
        });
      }
    }
  }
});
