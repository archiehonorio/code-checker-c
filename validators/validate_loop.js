// validate_loop.js  [P-21]
// Detects reuse of the same loop variable in nested for-loops.
window.validators.push(function validate_loop(lines, raw, issues) {
  // Stack of arrays; each entry is the set of loop vars active at that brace depth.
  const varStack = [[]];  // varStack[depth] = [varName, ...]

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*\/\//.test(ln)) continue;

    // Detect for(... var = ...) and push variable onto current depth
    const fm = ln.match(/\bfor\s*\(\s*(?:int\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (fm) {
      const v = fm[1];
      // Check if this variable is already active in any outer scope
      const alreadyActive = varStack.slice(0, -1).some(lvl => lvl.includes(v));
      if (alreadyActive) {
        issues.push({
          type:     'Nested loop – reused variable',
          severity: 'warning',
          rule:     'P-21',
          line:     i + 1,
          snippet:  ln.trim(),
          detail:   `Loop variable "${v}" is already used in an outer loop. Use a distinct variable name for each loop level.`
        });
      }
      // Add to top of stack
      if (varStack.length === 0) varStack.push([]);
      varStack[varStack.length - 1].push(v);
    }

    // Track braces to manage depth
    for (const ch of ln) {
      if (ch === '{') varStack.push([]);
      else if (ch === '}') {
        if (varStack.length > 1) varStack.pop();
      }
    }
  }
});
