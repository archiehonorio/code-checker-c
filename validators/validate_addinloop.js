// validators/validate_addinloop.js  [P-29]
// Duplicate-element creation. Flags  localPtr->addX(...)  called inside a loop
// when localPtr is NOT refreshed inside any enclosing loop — i.e. it points to
// the SAME object on every iteration, so each add() piles on another element.
//
// This is the partyBY->addContact() PQ: partyBY is created once before the loop,
// then a contact is added per item -> duplicate contacts.
//
// NOT flagged (correct patterns):
//   - item = docs->itemDetails->addItem(); item->addNote(...)   (item refreshed
//     inside the loop, so it's a fresh element each iteration)
//   - docs->header->...->addNote(...)   (receiver is a member chain, not a bare
//     local pointer that could be "the same object" — skipped to avoid noise)
window.validators.push(function validate_addinloop(lines, raw, issues) {
  const S = window.CppScope;
  const info = S.analyze(lines);
  const code = info.code;

  // local pointer variable names: `Type * name`
  const localPtrs = new Set();
  const declRe = /\b[A-Za-z_][\w:<>]*\s*\*\s*([A-Za-z_]\w*)\s*(?:=|;)/g;
  for (const ln of code) {
    declRe.lastIndex = 0; let m;
    while ((m = declRe.exec(ln)) !== null) localPtrs.add(m[1]);
  }

  function assignedInsideBlock(name, openLine) {
    const asg = new RegExp(`(?:\\*\\s*)?\\b${name}\\s*=\\s*[^=]`);
    for (let L = openLine + 1; L < code.length; L++) {
      if (!info.enclosers[L].some(e => e.open === openLine)) {
        // once we leave the block entirely, stop (cheap optimisation)
        if (L > openLine && info.enclosers[L].every(e => e.open !== openLine) &&
            info.enclosers[L].length <= info.enclosers[openLine].length) break;
        continue;
      }
      if (asg.test(code[L])) return true;
    }
    return false;
  }

  const addRe = /\b([A-Za-z_]\w*)->add[A-Za-z_]\w*\s*\(/g;

  for (let i = 0; i < code.length; i++) {
    addRe.lastIndex = 0; let m;
    while ((m = addRe.exec(code[i])) !== null) {
      const name = m[1];
      if (!localPtrs.has(name)) continue;

      const enclosingLoops = info.enclosers[i].filter(e => /\b(for|while)\s*\(/.test(e.header));
      if (enclosingLoops.length === 0) continue;          // not in a loop -> fine

      const refreshed = enclosingLoops.some(lp => assignedInsideBlock(name, lp.open));
      if (refreshed) continue;                            // fresh each iteration -> fine

      const outermost = enclosingLoops[0];
      issues.push({
        type: 'Duplicate element added in loop',
        severity: 'error',
        rule: 'P-29',
        line: i + 1,
        snippet: lines[i].trim(),
        detail: `"${name}" is created once outside the loop at line ${outermost.open + 1}, but ${name}->add...() runs inside it — a new element is added on every iteration, creating duplicates. Move the add() outside the loop, or add it once / reuse the existing element.`
      });
    }
  }
});
