// validators/validate_array.js  [P-19]
// Scope-aware index-guard check. Replaces the "else { addParty }" heuristic.
//
// What it flags: READING an existing element by index, obj->prop[N], when no
// guard is active.
// What it does NOT flag (the old false positives):
//   - add*() calls: obj->addContact()->x, obj->addTax()->y  (they create+return
//     a valid pointer; `->prop[` never matches a `(` call anyway).
//   - reads inside if(obj->propNum > -1) / >= 0
//   - party[idx] inside if(idx > -1) / >= 0
//   - reads inside a for-loop bounded by the matching Num
//   - the "else addParty" rule is GONE — a guarded read that's only used inside
//     its block is correct.
window.validators.push(function validate_array(lines, raw, issues) {
  const S = window.CppScope;
  const info = S.analyze(lines);
  const code = info.code;

  const countMap = {
    description: 'descNum', charge: 'chargeNum', contact: 'contactNum',
    item: 'itemNum', note: 'noteNum', tax: 'taxNum', party: 'partyNum',
    referenceDetail: 'referenceDetailNum', lineString: 'lineStringNum'
  };

  const accessRe = /\b([A-Za-z_]\w*)->([A-Za-z_]\w*)\s*\[\s*([A-Za-z_]\w*|\d+)\s*\]/g;

  for (let i = 0; i < code.length; i++) {
    accessRe.lastIndex = 0;
    let m;
    while ((m = accessRe.exec(code[i])) !== null) {
      const obj = m[1], prop = m[2], index = m[3];
      const numProp = countMap[prop] || (prop + 'Num');

      // Guard 1: enclosing/braceless  if(obj->numProp > -1 | >= 0)
      const numGuard = new RegExp(`\\b${obj}->${numProp}\\s*(?:>\\s*-?\\s*1|>=\\s*0)`);
      if (S.guardedBy(info, i, numGuard)) continue;

      // Guard 2: index is an identifier guarded by if(index > -1 | >= 0)
      if (/^[A-Za-z_]/.test(index)) {
        const idxGuard = new RegExp(`\\b${index}\\s*(?:>\\s*-?\\s*1|>=\\s*0)`);
        if (S.guardedBy(info, i, idxGuard)) continue;

        // Guard 3: a for-loop using `index` and bounded by some ...Num
        const loopGuard = new RegExp(`\\bfor\\b.*\\b${index}\\b.*(?:<=?\\s*[A-Za-z_][\\w>-]*Num|<=?\\s*[A-Za-z_][\\w>-]*->\\w+Num)`);
        if (S.guardedBy(info, i, loopGuard)) continue;

        // Guard 4: for-loop bounded directly by obj->numProp
        const loopNum = new RegExp(`\\bfor\\b.*${obj}->${numProp}`);
        if (S.guardedBy(info, i, loopNum)) continue;
      }

      issues.push({
        type: 'Array – unguarded index access',
        severity: 'error',
        rule: 'P-19',
        line: i + 1,
        snippet: lines[i].trim(),
        detail: `${obj}->${prop}[${index}] is read without a guard. Add: if(${obj}->${numProp} > -1) { ... } (or check the index variable / bound the loop by ${numProp}).`
      });
    }
  }
});
