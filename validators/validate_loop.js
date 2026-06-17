// validators/validate_loop.js  [P-21]
// Scope-aware nested-loop variable reuse. Only flags a for-loop whose counter
// is the SAME as a counter of a loop that actually ENCLOSES it. Sibling loops
// in different branches reusing `i` are fine (and were the old false positives).
window.validators.push(function validate_loop(lines, raw, issues) {
  const S = window.CppScope;
  const info = S.analyze(lines);
  const code = info.code;

  const forVar = /\bfor\s*\(\s*(?:[A-Za-z_][\w:<>]*\s+)?([A-Za-z_]\w*)\s*=/;

  for (let i = 0; i < code.length; i++) {
    const m = code[i].match(forVar);
    if (!m) continue;
    const v = m[1];

    // Look only at ENCLOSING block headers (true ancestors of this line).
    let reusedFrom = -1;
    for (const enc of info.enclosers[i]) {
      const em = enc.header.match(forVar);
      if (em && em[1] === v) { reusedFrom = enc.open + 1; break; }
    }

    if (reusedFrom !== -1) {
      issues.push({
        type: 'Nested loop – reused variable',
        severity: 'warning',
        rule: 'P-21',
        line: i + 1,
        snippet: lines[i].trim(),
        detail: `Loop variable "${v}" is already used by the enclosing loop at line ${reusedFrom}. Use a distinct counter for each nesting level.`
      });
    }
  }
});
