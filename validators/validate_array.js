// validators/validate_array.js  [P-19]
// Scope-aware index-guard check with LOOSE guard matching.
//
// A read  obj->prop[index]  is considered guarded if ANY of:
//   (A) an enclosing/braceless condition has  obj-><anything>Num  compared with
//       > -1 / >= 0 / != -1 / > 0.  Names need NOT match the property exactly,
//       because B2BE abbreviates: deliveryDate -> delDateNum, description ->
//       descNum, etc. Any *Num guard on the same object counts.
//   (B) the index is a variable and is governed by a check (idx > -1, idx >= 0,
//       idx != -1) — including the else-branch of  if(idx == -1)  and an
//       if(idx ...) sitting just above the access before idx is reassigned.
//   (C) the index variable is bounded by a for-loop (... idx <= ...Num ...).
//
// add*() calls are never matched (they create+return a valid pointer), and
// accesses on an already-indexed receiver (party[idx]->contact[0]) are left
// alone to avoid noise.
window.validators.push(function validate_array(lines, raw, issues) {
  const S = window.CppScope;
  const info = S.analyze(lines);
  const code = info.code;

  const accessRe = /\b([A-Za-z_]\w*)->([A-Za-z_]\w*)\s*\[\s*([A-Za-z_]\w*|\d+)\s*\]/g;

  // (A) any  obj-><word>Num  guard, regardless of the exact Num name
  function numGuarded(i, obj) {
    const re = new RegExp(`\\b${obj}->\\w*Num\\s*(?:>\\s*-?\\s*1|>=\\s*0|!=\\s*-?\\s*1|>\\s*0)`);
    return S.guardedBy(info, i, re);
  }

  // (B) index-variable guard
  function indexGuarded(i, index) {
    const cond = new RegExp(`\\b${index}\\s*(?:>\\s*-?\\s*1|>=\\s*0|!=\\s*-?\\s*1)`);
    if (S.guardedBy(info, i, cond)) return true;

    const enc = info.enclosers[i];
    const lo = enc.length ? enc[enc.length - 1].open : -1;
    const condAbove = new RegExp(`\\bif\\s*\\(\\s*${index}\\s*(?:==|!=|>|>=|<|<=)\\s*-?\\s*[01]`);
    const reassign  = new RegExp(`\\b${index}\\s*=\\s*[^=]`);
    for (let L = i - 1; L > lo; L--) {
      if (condAbove.test(code[L])) return true;
      if (reassign.test(code[L]))  return false;
    }
    return false;
  }

  // (C) for-loop bound on the index
  function loopGuarded(i, index, obj) {
    const g1 = new RegExp(`\\bfor\\b.*\\b${index}\\b.*<=?\\s*[A-Za-z_][\\w>:.-]*Num`);
    if (S.guardedBy(info, i, g1)) return true;
    const g2 = new RegExp(`\\bfor\\b.*${obj}->\\w*Num`);
    if (S.guardedBy(info, i, g2)) return true;
    return false;
  }

  for (let i = 0; i < code.length; i++) {
    accessRe.lastIndex = 0;
    let m;
    while ((m = accessRe.exec(code[i])) !== null) {
      const obj = m[1], prop = m[2], index = m[3];

      if (numGuarded(i, obj)) continue;

      if (/^[A-Za-z_]/.test(index)) {
        if (indexGuarded(i, index)) continue;
        if (loopGuarded(i, index, obj)) continue;
      }

      issues.push({
        type: 'Array – unguarded index access',
        severity: 'error',
        rule: 'P-19',
        line: i + 1,
        snippet: lines[i].trim(),
        detail: `${obj}->${prop}[${index}] is read without a guard. Add a check such as if(${obj}->${prop}Num > -1) { ... } (any ${obj}->...Num > -1 guard, an idx > -1 check, or a bounding loop is accepted).`
      });
    }
  }
});
